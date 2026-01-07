'use server';

import { getDb, Budget } from '@/lib/db';
import { isUserInHousehold } from '@/lib/auth';
import { getCurrentBudgetPeriod } from '@/lib/budget-period';

export async function getBudgets(householdId: number, userId: string) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: 'Unauthorized' };
  }

  const db = getDb();
  const budgets = db.prepare(`
    SELECT b.*, c.name as category_name, c.color as category_color
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    WHERE b.household_id = ?
    ORDER BY c.name ASC
  `).all(householdId);
  
  return { success: true, budgets };
}

export async function createBudget(
  householdId: number,
  userId: string,
  data: {
    categoryId: number;
    amount: number;
    period: 'monthly' | 'yearly';
    startDate: string;
    endDate?: string;
  }
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: 'Unauthorized' };
  }

  const db = getDb();
  
  try {
    const result = db.prepare(`
      INSERT INTO budgets (household_id, category_id, amount, period, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      householdId,
      data.categoryId,
      data.amount,
      data.period,
      data.startDate,
      data.endDate || null
    );
    
    return { success: true, budgetId: result.lastInsertRowid };
  } catch (error) {
    return { error: 'Failed to create budget' };
  }
}

export async function updateBudget(
  budgetId: number,
  householdId: number,
  userId: string,
  data: {
    amount?: number;
    period?: 'monthly' | 'yearly';
    startDate?: string;
    endDate?: string;
  }
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: 'Unauthorized' };
  }

  const db = getDb();
  const updates: string[] = [];
  const params: any[] = [];
  
  if (data.amount !== undefined) {
    updates.push('amount = ?');
    params.push(data.amount);
  }
  if (data.period) {
    updates.push('period = ?');
    params.push(data.period);
  }
  if (data.startDate) {
    updates.push('start_date = ?');
    params.push(data.startDate);
  }
  if (data.endDate !== undefined) {
    updates.push('end_date = ?');
    params.push(data.endDate);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(budgetId, householdId);
  
  try {
    db.prepare(`
      UPDATE budgets
      SET ${updates.join(', ')}
      WHERE id = ? AND household_id = ?
    `).run(...params);
    
    return { success: true };
  } catch (error) {
    return { error: 'Failed to update budget' };
  }
}

export async function deleteBudget(
  budgetId: number,
  householdId: number,
  userId: string
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: 'Unauthorized' };
  }

  const db = getDb();
  
  try {
    db.prepare('DELETE FROM budgets WHERE id = ? AND household_id = ?')
      .run(budgetId, householdId);
    
    return { success: true };
  } catch (error) {
    return { error: 'Failed to delete budget' };
  }
}

export async function getBudgetProgress(householdId: number, userId: string, period: 'monthly' | 'yearly' = 'monthly', periodOffset: number = 0) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: 'Unauthorized' };
  }

  const db = getDb();
  
  // Get household budget start day
  const household = db.prepare('SELECT budget_month_start_day FROM households WHERE id = ?').get(householdId) as { budget_month_start_day: number } | undefined;
  const budgetStartDay = household?.budget_month_start_day || 1;
  
  // Calculate date range based on period
  const now = new Date();
  let startDate: string;
  let endDate: string;
  
  if (period === 'monthly') {
    // Use budget period calculation with offset
    const { getBudgetPeriod } = require('@/lib/budget-period');
    const budgetPeriod = getBudgetPeriod(budgetStartDay, Math.abs(periodOffset));
    startDate = budgetPeriod.startStr;
    endDate = budgetPeriod.endStr;
  } else {
    // For yearly, still use calendar year with offset
    const targetYear = now.getFullYear() + periodOffset;
    startDate = new Date(targetYear, 0, 1).toISOString().split('T')[0];
    endDate = new Date(targetYear, 11, 31).toISOString().split('T')[0];
  }
  
  const budgets = db.prepare(`
    SELECT 
      b.*,
      c.name as category_name,
      c.color as category_color,
      COALESCE(SUM(CASE WHEN t.date BETWEEN ? AND ? THEN t.amount ELSE 0 END), 0) as spent
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    LEFT JOIN transactions t ON t.category_id = b.category_id 
      AND t.household_id = b.household_id 
      AND t.type = 'expense'
      AND t.excluded_from_reports = 0
    WHERE b.household_id = ? AND b.period = ?
      AND (b.end_date IS NULL OR b.end_date >= ?)
    GROUP BY b.id
    ORDER BY c.name ASC
  `).all(startDate, endDate, householdId, period, startDate);
  
  return { success: true, budgets, period, startDate, endDate, budgetStartDay };
}

