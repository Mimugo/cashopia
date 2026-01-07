/**
 * Utility functions for calculating budget periods based on household settings
 */

export interface BudgetPeriod {
  start: Date;
  end: Date;
  startStr: string; // YYYY-MM-DD format
  endStr: string;   // YYYY-MM-DD format
}

/**
 * Get the current budget period based on the budget month start day
 * @param startDay - Day of month when budget period starts (1-31)
 * @param referenceDate - Optional reference date (defaults to today)
 * @returns The current budget period with start and end dates
 */
export function getCurrentBudgetPeriod(startDay: number = 1, referenceDate: Date = new Date()): BudgetPeriod {
  const today = new Date(referenceDate);
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let periodStartDate: Date;
  let periodEndDate: Date;

  if (currentDay >= startDay) {
    // We're in the current period (from startDay this month to startDay-1 next month)
    periodStartDate = new Date(currentYear, currentMonth, startDay);
    periodEndDate = new Date(currentYear, currentMonth + 1, startDay - 1);
  } else {
    // We're still in the previous period (from startDay last month to startDay-1 this month)
    periodStartDate = new Date(currentYear, currentMonth - 1, startDay);
    periodEndDate = new Date(currentYear, currentMonth, startDay - 1);
  }

  // Handle end of month edge cases
  if (periodEndDate.getMonth() !== periodStartDate.getMonth() + 1 && 
      !(periodStartDate.getMonth() === 11 && periodEndDate.getMonth() === 0)) {
    // If the end date rolled over (e.g., requesting day 31 in a 30-day month),
    // set it to the last day of the target month
    periodEndDate = new Date(periodStartDate.getFullYear(), periodStartDate.getMonth() + 1, 0);
  }

  return {
    start: periodStartDate,
    end: periodEndDate,
    startStr: formatDateForSQL(periodStartDate),
    endStr: formatDateForSQL(periodEndDate),
  };
}

/**
 * Get the budget period for a specific number of periods ago
 * @param startDay - Day of month when budget period starts (1-31)
 * @param periodsAgo - Number of periods in the past (0 = current, 1 = last period, etc.)
 * @returns The budget period
 */
export function getBudgetPeriod(startDay: number = 1, periodsAgo: number = 0): BudgetPeriod {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let baseMonth = currentMonth;
  let baseYear = currentYear;

  // Adjust if we're before the start day
  if (currentDay < startDay) {
    baseMonth -= 1;
  }

  // Subtract the periods
  baseMonth -= periodsAgo;

  // Handle year rollover
  while (baseMonth < 0) {
    baseMonth += 12;
    baseYear -= 1;
  }

  const periodStartDate = new Date(baseYear, baseMonth, startDay);
  let periodEndDate = new Date(baseYear, baseMonth + 1, startDay - 1);

  // Handle end of month edge cases
  if (periodEndDate.getDate() !== startDay - 1 && startDay > 1) {
    periodEndDate = new Date(baseYear, baseMonth + 1, 0);
  }

  return {
    start: periodStartDate,
    end: periodEndDate,
    startStr: formatDateForSQL(periodStartDate),
    endStr: formatDateForSQL(periodEndDate),
  };
}

/**
 * Get multiple budget periods for historical comparison
 * @param startDay - Day of month when budget period starts (1-31)
 * @param count - Number of periods to retrieve (including current)
 * @returns Array of budget periods, most recent first
 */
export function getRecentBudgetPeriods(startDay: number = 1, count: number = 6): BudgetPeriod[] {
  const periods: BudgetPeriod[] = [];
  
  for (let i = 0; i < count; i++) {
    periods.push(getBudgetPeriod(startDay, i));
  }
  
  return periods;
}

/**
 * Format a date as YYYY-MM-DD for SQL queries
 */
function formatDateForSQL(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get a human-readable label for a budget period
 * @param period - The budget period
 * @returns A string like "Jan 25 - Feb 24, 2024"
 */
export function formatBudgetPeriod(period: BudgetPeriod): string {
  const startMonth = period.start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = period.end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = period.start.getDate();
  const endDay = period.end.getDate();
  const year = period.end.getFullYear();
  
  if (period.start.getMonth() === period.end.getMonth()) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  } else {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }
}

