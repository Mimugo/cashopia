# Period Navigation Feature

## Overview
Added navigation controls to browse through historical budget periods on the Dashboard and Budgets pages. Users can now view data from previous periods and navigate back to the current period.

## Key Features

### Dashboard Page
- **Previous/Next Buttons**: Navigate between periods
- **Period Display**: Shows the current period date range being viewed (e.g., "Jan 25 - Feb 24, 2024")
- **Return to Current**: Quick button to jump back to the current period (appears when viewing historical periods)
- **Works with all period types**: Week, Month, and Year views

### Budgets Page
- **Same navigation controls** for Monthly budgets
- **Period-specific budget tracking**: See how you did in previous budget periods
- **Only shows for Monthly view**: Yearly budgets don't have navigation (calendar year based)

## How It Works

### Period Offset
- `0` = Current period
- `-1` = Previous period
- `-2` = Two periods ago
- etc.

### Navigation Behavior
1. **Previous Button**: Always available, goes back one period
2. **Next Button**: Only enabled when viewing historical periods (offset < 0), moves forward one period
3. **Return to Current**: Only shown when viewing historical periods (offset < 0), jumps directly to current period

### Date Calculations
- **Week**: 7-day periods
- **Month**: Uses household's budget period settings (respects budget_month_start_day)
- **Year**: Calendar years

## User Interface

### Navigation Bar
```
┌─────────────────────────────────────────────────────────────┐
│  ← Previous     |     Jan 25 - Feb 24, 2024     |    Next →  │
│                 |   [Return to Current]         |            │
└─────────────────────────────────────────────────────────────┘
```

### Features:
- Clean, centered layout
- Disabled "Next" button prevents going into the future
- Period label clearly shows the date range being viewed
- "Return to Current" link for quick navigation

## Implementation Details

### Files Modified

#### Dashboard (`src/app/dashboard/page.tsx`)
- Added `periodOffset` state
- Added navigation functions: `goToPreviousPeriod()`, `goToNextPeriod()`, `goToCurrentPeriod()`
- Added `formatPeriodLabel()` to display human-readable date ranges
- Updated `useEffect` to include `periodOffset` as dependency
- Added navigation UI component

#### Budgets (`src/app/budgets/page.tsx`)
- Similar changes to Dashboard
- Navigation only shown for monthly budgets
- Added `budgetsData` state to store full response including dates

#### Dashboard Action (`src/app/actions/dashboard.ts`)
- Added `periodOffset` parameter to `getDashboardData()`
- Updated date calculations to use `getBudgetPeriod()` with offset
- Handles week/month/year periods with offset
- Returns `periodOffset` in response

#### Budgets Action (`src/app/actions/budgets.ts`)
- Added `periodOffset` parameter to `getBudgetProgress()`
- Updated date calculations for monthly periods with offset
- Yearly periods use calendar year + offset

### Budget Period Integration
- Uses `getBudgetPeriod(budgetStartDay, periodsAgo)` from `src/lib/budget-period.ts`
- Respects household's `budget_month_start_day` setting
- Handles edge cases (e.g., day 31 in shorter months)

## User Experience

### Typical Flow
1. User lands on Dashboard → sees current period data
2. Clicks "Previous" → views last month's data
3. Period label updates to show historical dates
4. "Return to Current" button appears
5. User can keep clicking "Previous" to go further back
6. Or click "Next" to move forward (if not already at current)
7. Or click "Return to Current" to jump back immediately

### Visual Feedback
- **Current period**: No "Return to Current" button, "Next" is disabled
- **Historical period**: "Return to Current" button appears, "Next" is enabled
- **Period label**: Always shows the exact date range being viewed

## Benefits

1. **Historical Analysis**: View how you did in previous months without exporting data
2. **Budget Comparison**: See spending patterns across different periods
3. **Trend Identification**: Spot changes in spending behavior over time
4. **Reconciliation**: Check account balances and transactions from specific periods

## Example Use Cases

### Review Last Month's Spending
1. Go to Dashboard
2. Click "Previous"
3. See last month's summary, charts, and transactions

### Compare Multiple Months
1. Navigate to 3 months ago
2. Note the spending patterns
3. Click "Next" to see 2 months ago
4. Continue comparing

### Verify Historical Budget
1. Go to Budgets page
2. Click "Previous" to see last month
3. Check if you stayed within budget
4. View actual spending vs. budgeted amounts

## Technical Notes

### State Management
- Period offset stored in component state
- Resets to 0 when changing period type (week/month/year)
- Persists during navigation within same period type

### Performance
- No additional database queries (same query structure, different dates)
- Date calculations are lightweight
- Navigation is instant

### Data Accuracy
- All calculations use the same logic as current period
- Budget period boundaries are consistent
- No data is modified, only the query date range changes

## Future Enhancements

Possible improvements:
- [ ] Keyboard shortcuts (← → keys for navigation)
- [ ] Period picker/calendar dropdown
- [ ] "Jump to date" functionality
- [ ] Period comparison view (side-by-side)
- [ ] Export historical period data
- [ ] Bookmark/save specific periods
- [ ] Show period context (e.g., "2 months ago")

