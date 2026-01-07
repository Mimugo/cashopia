# Budget Period Feature

## Overview

The Budget Period feature allows households to set a custom start day for their budget tracking cycle. Instead of budgets always running from the 1st to the last day of the calendar month, users can now set their budget to start on any day (e.g., the 25th when they receive their salary).

## Key Changes

### Database

- Added `budget_month_start_day` column to `households` table (INTEGER, default 1, values 1-31)
- Migration script: `scripts/migrate-add-budget-month-start.js`

### New Files

- `src/lib/budget-period.ts` - Utility functions for calculating budget periods
  - `getCurrentBudgetPeriod(startDay, referenceDate)` - Get current budget period
  - `getBudgetPeriod(startDay, periodsAgo)` - Get historical budget period
  - `getRecentBudgetPeriods(startDay, count)` - Get multiple periods
  - `formatBudgetPeriod(period)` - Format period for display

### Updated Files

#### Household Settings
- `src/app/household/page.tsx` - Added budget month start day selector (1st-31st)
- `src/app/actions/household.ts` - Added `budgetMonthStartDay` parameter to `updateHouseholdSettings`

#### Dashboard
- `src/app/actions/dashboard.ts`:
  - `getDashboardData()` - Now uses budget periods for 'month' view
  - `getMonthlyComparison()` - Now compares budget periods instead of calendar months

#### Budgets
- `src/app/actions/budgets.ts`:
  - `getBudgetProgress()` - Now calculates spending within budget periods

#### Database Schema
- `scripts/init-db.js` - Updated households table creation to include new column

## How It Works

### Example: Budget starts on 25th

If today is January 20th:
- Current budget period: December 25 - January 24
- This is because we haven't reached the 25th yet

If today is January 26th:
- Current budget period: January 25 - February 24
- We've passed the 25th, so we're in the new period

### Edge Cases

**Day 31 in shorter months:**
- If budget_month_start_day is 31, but current month only has 30 days:
- The function automatically adjusts to the last day of the month

**Example with 31st:**
- Budget starts on 31st
- In February (28/29 days), period would be: Jan 31 - Feb 28/29

## User Interface

### Household Settings Modal

```
Budget Month Start Day
┌─────────────────────────────────────┐
│ 25th of the month                 ▼ │
└─────────────────────────────────────┘
Set when your budget period starts (e.g., when 
you receive salary). Your budget tracking, charts, 
and statistics will align with this cycle.
```

### Dashboard

When viewing the dashboard with period set to "Month":
- The date range and statistics reflect the current budget period
- For example, if today is Jan 26 and budget starts on 25th:
  - Shows data from Jan 25 - Feb 24

### Budgets Page

Monthly budgets track spending within the budget period:
- If budget start day is 15th and today is Jan 20:
  - Shows spending from Jan 15 - Feb 14

## API Response Changes

### `getDashboardData`
New fields in response:
- `endDate`: End date of the period (string, YYYY-MM-DD)
- `budgetStartDay`: The household's budget start day (number, 1-31)

### `getBudgetProgress`
New fields in response:
- `budgetStartDay`: The household's budget start day (number, 1-31)

### `getMonthlyComparison`
Changed structure:
- Instead of `month` field (YYYY-MM), now returns:
  - `period`: Human-readable period label (e.g., "Jan 25 - Feb 24, 2024")
  - `startDate`: Period start date (YYYY-MM-DD)
  - `endDate`: Period end date (YYYY-MM-DD)

## Testing

To test the feature:

1. Navigate to Household settings
2. Change "Budget Month Start Day" to 25th
3. Save settings
4. Go to Dashboard and check that:
   - The current period reflects the new start day
   - Statistics are calculated for the correct date range
5. Go to Budgets and verify:
   - Monthly budgets show spending for the custom period

## Default Behavior

- New households default to 1st (calendar month behavior)
- Existing households default to 1st after migration
- Users can change this at any time in Household Settings

## Technical Notes

### Date Calculations

The budget period calculation logic:

1. Get current date and household's budget_month_start_day
2. If current day >= start day:
   - Period is from start_day this month to (start_day - 1) next month
3. If current day < start day:
   - Period is from start_day last month to (start_day - 1) this month

### Performance

- Budget period calculations are lightweight (no DB queries)
- Period dates are calculated on-the-fly
- Dashboard queries use the calculated date range efficiently

## Future Enhancements

Possible improvements:
- [ ] Allow different budget cycles (weekly, bi-weekly, quarterly)
- [ ] Visual calendar showing budget period boundaries
- [ ] Notifications when entering a new budget period
- [ ] Per-budget custom periods (not just household-wide)

