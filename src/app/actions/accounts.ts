"use server";

import { getDb, BankAccount } from "@/lib/db";
import { isUserInHousehold } from "@/lib/auth";

export async function getAccounts(householdId: number, userId: string) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();
  const accounts = db
    .prepare(
      "SELECT * FROM bank_accounts WHERE household_id = ? ORDER BY name ASC"
    )
    .all(householdId);

  // Get household currency
  const household = db
    .prepare("SELECT currency FROM households WHERE id = ?")
    .get(householdId) as { currency: string } | undefined;

  return { 
    success: true, 
    accounts, 
    householdCurrency: household?.currency || 'USD' 
  };
}

export async function createAccount(
  householdId: number,
  userId: string,
  data: {
    name: string;
    accountType: string;
    institution?: string;
    accountNumberLast4?: string;
    balance?: number;
    currency?: string;
  }
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  try {
    const result = db
      .prepare(
        `
      INSERT INTO bank_accounts (
        household_id, name, account_type, institution, 
        account_number_last4, balance, currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        householdId,
        data.name,
        data.accountType,
        data.institution || null,
        data.accountNumberLast4 || null,
        data.balance || 0,
        data.currency || "USD"
      );

    // Always record initial balance in history (even if zero) so we have a baseline for calculations
    const initialBalance = data.balance || 0;
    db.prepare(
      "INSERT INTO account_balance_history (account_id, balance) VALUES (?, ?)"
    ).run(result.lastInsertRowid, initialBalance);

    return { success: true, accountId: result.lastInsertRowid };
  } catch (error) {
    return { error: "Failed to create account" };
  }
}

export async function updateAccount(
  accountId: number,
  householdId: number,
  userId: string,
  data: {
    name?: string;
    accountType?: string;
    institution?: string;
    accountNumberLast4?: string;
    balance?: number;
    isActive?: boolean;
  }
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  // Verify account belongs to household
  const account = db
    .prepare("SELECT * FROM bank_accounts WHERE id = ? AND household_id = ?")
    .get(accountId, householdId);

  if (!account) {
    return { error: "Account not found" };
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (data.name) {
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.accountType) {
    updates.push("account_type = ?");
    params.push(data.accountType);
  }
  if (data.institution !== undefined) {
    updates.push("institution = ?");
    params.push(data.institution);
  }
  if (data.accountNumberLast4 !== undefined) {
    updates.push("account_number_last4 = ?");
    params.push(data.accountNumberLast4);
  }
  if (data.balance !== undefined) {
    updates.push("balance = ?");
    params.push(data.balance);

    // Record balance change in history
    db.prepare(
      "INSERT INTO account_balance_history (account_id, balance) VALUES (?, ?)"
    ).run(accountId, data.balance);
  }
  if (data.isActive !== undefined) {
    updates.push("is_active = ?");
    params.push(data.isActive ? 1 : 0);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  params.push(accountId);

  try {
    db.prepare(
      `UPDATE bank_accounts SET ${updates.join(", ")} WHERE id = ?`
    ).run(...params);

    return { success: true };
  } catch (error) {
    return { error: "Failed to update account" };
  }
}

export async function deleteAccount(
  accountId: number,
  householdId: number,
  userId: string
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  try {
    // Check if account has transactions
    const hasTransactions = db
      .prepare("SELECT COUNT(*) as count FROM transactions WHERE account_id = ?")
      .get(accountId) as { count: number };

    if (hasTransactions.count > 0) {
      return {
        error: `Cannot delete account with ${hasTransactions.count} transactions. Set as inactive instead.`,
      };
    }

    db.prepare(
      "DELETE FROM bank_accounts WHERE id = ? AND household_id = ?"
    ).run(accountId, householdId);

    return { success: true };
  } catch (error) {
    return { error: "Failed to delete account" };
  }
}

export async function getAccountBalance(
  accountId: number,
  householdId: number,
  userId: string
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  const account = db
    .prepare("SELECT * FROM bank_accounts WHERE id = ? AND household_id = ?")
    .get(accountId, householdId) as BankAccount;

  if (!account) {
    return { error: "Account not found" };
  }

  // If transactions have balance_after from CSV import, use the most recent one
  const latestBalanceFromCSV = db
    .prepare(
      `
    SELECT balance_after, date, created_at
    FROM transactions
    WHERE account_id = ? AND balance_after IS NOT NULL
    ORDER BY date DESC, created_at DESC
    LIMIT 1
  `
    )
    .get(accountId) as { balance_after: number; date: string; created_at: string } | undefined;

  let calculatedBalance: number;

  if (latestBalanceFromCSV) {
    // We have balance information from CSV import - use it as the baseline
    // and calculate forward from that transaction's date
    const transactionsAfterCSV = db
      .prepare(
        `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
      FROM transactions
      WHERE account_id = ? 
        AND (date > ? OR (date = ? AND created_at > ?))
        AND balance_after IS NULL
    `
      )
      .get(accountId, latestBalanceFromCSV.date, latestBalanceFromCSV.date, latestBalanceFromCSV.created_at) as 
      { total_income: number; total_expenses: number };

    // Start from CSV balance and add transactions after it
    calculatedBalance = latestBalanceFromCSV.balance_after + 
                       transactionsAfterCSV.total_income - 
                       transactionsAfterCSV.total_expenses;
  } else {
    // No CSV balance data, fall back to opening balance method
    const openingBalance = db
      .prepare(
        `
      SELECT balance 
      FROM account_balance_history 
      WHERE account_id = ? 
      ORDER BY recorded_at ASC 
      LIMIT 1
    `
      )
      .get(accountId) as { balance: number } | undefined;

    const calculated = db
      .prepare(
        `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE account_id = ?
    `
      )
      .get(accountId) as { total_income: number; total_expenses: number; transaction_count: number };

    if (openingBalance) {
      calculatedBalance = openingBalance.balance + calculated.total_income - calculated.total_expenses;
    } else if (calculated.transaction_count === 0) {
      calculatedBalance = account.balance;
    } else {
      // Legacy account without proper tracking
      calculatedBalance = account.balance;
    }
  }

  return {
    success: true,
    account,
    storedBalance: account.balance,
    calculatedBalance,
    difference: account.balance - calculatedBalance,
  };
}

export async function updateAccountBalance(
  accountId: number,
  householdId: number,
  userId: string,
  newBalance: number
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  try {
    db.prepare(
      "UPDATE bank_accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?"
    ).run(newBalance, accountId, householdId);

    // Record in history
    db.prepare(
      "INSERT INTO account_balance_history (account_id, balance) VALUES (?, ?)"
    ).run(accountId, newBalance);

    return { success: true };
  } catch (error) {
    return { error: "Failed to update balance" };
  }
}

