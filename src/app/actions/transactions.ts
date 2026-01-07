"use server";

import { getDb, Transaction } from "@/lib/db";
import { isUserInHousehold } from "@/lib/auth";
import {
  categorizeTransaction,
  getCategorizationPatterns,
} from "@/lib/categories";

export async function getTransactions(
  householdId: number,
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<Transaction[]> {
  if (!isUserInHousehold(userId, householdId)) {
    throw new Error("Unauthorized");
  }

  const db = getDb();
  let query = `
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.household_id = ?
  `;

  const params: any[] = [householdId];

  if (startDate) {
    query += " AND t.date >= ?";
    params.push(startDate);
  }

  if (endDate) {
    query += " AND t.date <= ?";
    params.push(endDate);
  }

  query += " ORDER BY t.date DESC, t.created_at DESC";

  return db.prepare(query).all(...params) as Transaction[];
}

export async function createTransaction(
  householdId: number,
  userId: string,
  data: {
    date: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    categoryId?: number;
    accountId?: number;
    balanceAfter?: number;
  }
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  let categoryId = data.categoryId;

  // Auto-categorize if no category provided
  if (!categoryId) {
    const patterns = getCategorizationPatterns(householdId);
    categoryId = categorizeTransaction(data.description, patterns) || undefined;
  }

  try {
    const result = db
      .prepare(
        `
      INSERT INTO transactions (household_id, account_id, category_id, date, description, amount, type, balance_after, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        householdId,
        data.accountId || null,
        categoryId || null,
        data.date,
        data.description,
        data.amount,
        data.type,
        data.balanceAfter || null,
        userId
      );

    // Update account balance if account is specified
    if (data.accountId) {
      const account = db
        .prepare("SELECT balance FROM bank_accounts WHERE id = ?")
        .get(data.accountId) as { balance: number } | undefined;

      if (account) {
        const newBalance =
          data.type === "income"
            ? account.balance + data.amount
            : account.balance - data.amount;

        db.prepare(
          "UPDATE bank_accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(newBalance, data.accountId);
      }
    }

    return { success: true, transactionId: result.lastInsertRowid };
  } catch (error) {
    return { error: "Failed to create transaction" };
  }
}

export async function updateTransaction(
  transactionId: number,
  householdId: number,
  userId: string,
  data: {
    date?: string;
    description?: string;
    amount?: number;
    type?: "income" | "expense";
    categoryId?: number;
    accountId?: number;
    balanceAfter?: number;
  }
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();
  const updates: string[] = [];
  const params: any[] = [];

  if (data.date) {
    updates.push("date = ?");
    params.push(data.date);
  }
  if (data.description) {
    updates.push("description = ?");
    params.push(data.description);
  }
  if (data.amount !== undefined) {
    updates.push("amount = ?");
    params.push(data.amount);
  }
  if (data.type) {
    updates.push("type = ?");
    params.push(data.type);
  }
  if (data.categoryId !== undefined) {
    updates.push("category_id = ?");
    params.push(data.categoryId);
  }
  if (data.accountId !== undefined) {
    updates.push("account_id = ?");
    params.push(data.accountId);
  }
  if (data.balanceAfter !== undefined) {
    updates.push("balance_after = ?");
    params.push(data.balanceAfter);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");

  params.push(transactionId, householdId);

  try {
    db.prepare(
      `
      UPDATE transactions
      SET ${updates.join(", ")}
      WHERE id = ? AND household_id = ?
    `
    ).run(...params);

    return { success: true };
  } catch (error) {
    return { error: "Failed to update transaction" };
  }
}

export async function deleteTransaction(
  transactionId: number,
  householdId: number,
  userId: string
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  try {
    db.prepare(
      "DELETE FROM transactions WHERE id = ? AND household_id = ?"
    ).run(transactionId, householdId);

    return { success: true };
  } catch (error) {
    return { error: "Failed to delete transaction" };
  }
}

export async function toggleExcludeFromReports(
  transactionId: number,
  householdId: number,
  userId: string,
  excluded: boolean
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  try {
    db.prepare(
      "UPDATE transactions SET excluded_from_reports = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND household_id = ?"
    ).run(excluded ? 1 : 0, transactionId, householdId);

    return { success: true };
  } catch (error) {
    console.error("Failed to toggle exclude from reports:", error);
    return { error: "Failed to update transaction" };
  }
}
