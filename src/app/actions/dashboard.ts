"use server";

import { getDb } from "@/lib/db";
import { isUserInHousehold } from "@/lib/auth";
import { getCurrentBudgetPeriod, getBudgetPeriod } from "@/lib/budget-period";

export async function getDashboardData(
  householdId: number,
  userId: string,
  period: "week" | "month" | "year" = "month",
  periodOffset: number = 0
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  // Get household settings for budget period calculation
  const household = db
    .prepare(
      "SELECT budget_month_start_day, currency FROM households WHERE id = ?"
    )
    .get(householdId) as
    | { budget_month_start_day: number; currency: string }
    | undefined;
  const budgetStartDay = household?.budget_month_start_day || 1;

  const now = new Date();
  let startDate: string;
  let endDate: string = now.toISOString().split("T")[0];

  switch (period) {
    case "week":
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + periodOffset * 7);
      const weekAgo = new Date(targetDate);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split("T")[0];
      endDate = targetDate.toISOString().split("T")[0];
      break;
    case "month":
      // Use budget period calculation with offset
      const { getBudgetPeriod } = require("@/lib/budget-period");
      const budgetPeriod = getBudgetPeriod(
        budgetStartDay,
        Math.abs(periodOffset)
      );
      startDate = budgetPeriod.startStr;
      endDate = budgetPeriod.endStr;
      break;
    case "year":
      const targetYear = now.getFullYear() + periodOffset;
      startDate = new Date(targetYear, 0, 1).toISOString().split("T")[0];
      endDate = new Date(targetYear, 11, 31).toISOString().split("T")[0];
      break;
  }

  // Prepare date filter based on period type
  const dateFilter =
    period === "month" ? `date >= ? AND date <= ?` : `date >= ?`;
  const dateParams =
    period === "month"
      ? [householdId, startDate, endDate]
      : [householdId, startDate];

  // Get summary statistics (exclude transactions marked as excluded_from_reports)
  const summary = db
    .prepare(
      `
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
      COUNT(*) as transaction_count
    FROM transactions
    WHERE household_id = ? AND ${dateFilter} AND excluded_from_reports = 0
  `
    )
    .get(...dateParams) as any;

  // Get spending by category (exclude transactions marked as excluded_from_reports)
  const spendingByCategory = db
    .prepare(
      `
    SELECT 
      c.name,
      c.color,
      SUM(t.amount) as total,
      COUNT(t.id) as count
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.household_id = ? AND ${dateFilter} AND t.type = 'expense' AND t.excluded_from_reports = 0
    GROUP BY c.id, c.name, c.color
    ORDER BY total DESC
    LIMIT 10
  `
    )
    .all(...dateParams);

  // Get income by category (exclude transactions marked as excluded_from_reports)
  const incomeByCategory = db
    .prepare(
      `
    SELECT 
      c.name,
      c.color,
      SUM(t.amount) as total,
      COUNT(t.id) as count
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.household_id = ? AND ${dateFilter} AND t.type = 'income' AND t.excluded_from_reports = 0
    GROUP BY c.id, c.name, c.color
    ORDER BY total DESC
  `
    )
    .all(...dateParams);

  // Get daily trend (exclude transactions marked as excluded_from_reports)
  const dailyTrend = db
    .prepare(
      `
    SELECT 
      date,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
    FROM transactions
    WHERE household_id = ? AND ${dateFilter} AND excluded_from_reports = 0
    GROUP BY date
    ORDER BY date ASC
  `
    )
    .all(...dateParams);

  // Get recent transactions
  const recentTransactions = db
    .prepare(
      `
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.household_id = ?
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT 10
  `
    )
    .all(householdId);

  // Get account balances
  const accountBalances = db
    .prepare(
      `
    SELECT 
      id,
      name,
      account_type,
      institution,
      balance,
      currency,
      is_active
    FROM bank_accounts
    WHERE household_id = ?
    ORDER BY is_active DESC, name ASC
  `
    )
    .all(householdId);

  const totalBalance = (accountBalances as any[]).reduce(
    (sum, acc) => (acc.is_active ? sum + acc.balance : sum),
    0
  );

  const householdCurrency = household?.currency || "USD";

  return {
    success: true,
    summary: {
      totalIncome: summary.total_income || 0,
      totalExpenses: summary.total_expenses || 0,
      netIncome: (summary.total_income || 0) - (summary.total_expenses || 0),
      transactionCount: summary.transaction_count || 0,
    },
    spendingByCategory,
    incomeByCategory,
    dailyTrend,
    recentTransactions,
    accountBalances,
    totalBalance,
    householdCurrency,
    period,
    startDate,
    endDate,
    budgetStartDay,
    periodOffset,
  };
}

export async function getMonthlyComparison(
  householdId: number,
  userId: string,
  periods: number = 6
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  // Get household budget start day
  const household = db
    .prepare("SELECT budget_month_start_day FROM households WHERE id = ?")
    .get(householdId) as { budget_month_start_day: number } | undefined;
  const budgetStartDay = household?.budget_month_start_day || 1;

  // Get recent budget periods
  const {
    getRecentBudgetPeriods,
    formatBudgetPeriod,
  } = require("@/lib/budget-period");
  const budgetPeriods = getRecentBudgetPeriods(budgetStartDay, periods);

  // Get data for each period
  const comparison = budgetPeriods
    .map((period: any) => {
      const periodData = db
        .prepare(
          `
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
      FROM transactions
      WHERE household_id = ? AND date >= ? AND date <= ?
    `
        )
        .get(householdId, period.startStr, period.endStr) as any;

      return {
        period: formatBudgetPeriod(period),
        startDate: period.startStr,
        endDate: period.endStr,
        income: periodData?.income || 0,
        expenses: periodData?.expenses || 0,
      };
    })
    .reverse(); // Reverse to show oldest first

  return { success: true, comparison };
}
