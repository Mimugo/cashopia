# Exclude from Reports Feature

## Overview
Added the ability to exclude specific transactions from KPIs, graphs, and budget calculations. This allows users to hide transactions that shouldn't affect their analytics, such as transfers between accounts, one-time purchases, reimbursements, etc.

## Key Features

### Transaction Exclusion
- **Toggle Button**: Eye/EyeOff icon button on each transaction
- **Visual Indicator**: Excluded transactions appear with reduced opacity (50%) and an eye-off icon
- **Persistent**: Exclusion state is stored in the database
- **Quick Toggle**: Single click to include/exclude transactions

### Impact on Analytics
- **Dashboard KPIs**: Excluded transactions don't count toward income/expense totals
- **Charts**: Spending by category, income by category, and daily trend charts exclude these transactions
- **Budgets**: Budget progress calculations exclude these transactions
- **Period Navigation**: Works correctly with historical period navigation

## Database Changes

### Migration
- Added `excluded_from_reports` column to `transactions` table
- Type: BOOLEAN, Default: 0 (included), NOT NULL
- Added index for better query performance

### Schema Update
```sql
ALTER TABLE transactions ADD COLUMN excluded_from_reports BOOLEAN DEFAULT 0 NOT NULL;
CREATE INDEX idx_transactions_excluded ON transactions(excluded_from_reports);
```

## User Interface

### Transactions Page

**Action Buttons Row:**
```
[👁️/👁️‍🗨️]  [✏️ Edit]  [🗑️ Delete]
```

- **Eye Icon (👁️)**: Transaction is included in reports (default)
- **EyeOff Icon (👁️‍🗨️)**: Transaction is excluded from reports

**Visual States:**
1. **Normal Transaction**: Full opacity, eye icon (light gray)
2. **Excluded Transaction**: 50% opacity, eye-off icon in date column

### Transaction List View
```
┌──────────────────────────────────────────────────────────────┐
│ [👁️‍🗨️] Jan 15  |  Transfer to Savings  | ... | Actions      │ ← Excluded (50% opacity)
│ Jan 16          |  Grocery Store       | ... | Actions      │ ← Included (normal)
│ [👁️‍🗨️] Jan 17  |  Reimbursement       | ... | Actions      │ ← Excluded (50% opacity)
└──────────────────────────────────────────────────────────────┘
```

## Use Cases

### 1. Inter-Account Transfers
**Problem**: Transfers between your own accounts show as both income and expense
**Solution**: Exclude both transactions so they don't inflate your totals

### 2. Reimbursements
**Problem**: You pay for something that will be reimbursed, skewing your spending data
**Solution**: Exclude the expense once you're reimbursed (or exclude both transactions)

### 3. One-Time Purchases
**Problem**: Large one-time purchases (furniture, electronics) distort monthly budgets
**Solution**: Exclude them to see your regular spending patterns

### 4. Test/Duplicate Transactions
**Problem**: Accidentally imported the same transactions twice
**Solution**: Exclude the duplicates instead of deleting them

### 5. Gift Money/Windfalls
**Problem**: One-time income that shouldn't affect budget calculations
**Solution**: Exclude it to maintain accurate recurring income tracking

## Implementation Details

### Files Modified

#### Migration Script
- `scripts/migrate-add-excluded-flag.js` - Adds column and index to existing databases

#### Database Schema
- `scripts/init-db.js` - Includes column in transactions table for new installations

#### Backend Actions
- `src/app/actions/transactions.ts`:
  - Added `toggleExcludeFromReports()` function
  
- `src/app/actions/dashboard.ts`:
  - Updated all queries to filter `WHERE excluded_from_reports = 0`
  - Affected queries: summary stats, spending by category, income by category, daily trend

- `src/app/actions/budgets.ts`:
  - Updated budget progress query to exclude these transactions
  - Budget spending calculations now accurate

#### Frontend UI
- `src/app/transactions/page.tsx`:
  - Added Eye/EyeOff icon imports
  - Added `handleToggleExclude()` function
  - Updated table row to show toggle button
  - Added visual indicator (opacity + icon) for excluded transactions
  - Toggle button changes icon based on state

### Query Changes

**Before:**
```sql
SELECT SUM(amount) FROM transactions WHERE household_id = ?
```

**After:**
```sql
SELECT SUM(amount) FROM transactions 
WHERE household_id = ? AND excluded_from_reports = 0
```

This pattern applied to all analytics queries throughout the application.

## User Experience

### Typical Flow

1. **Identify Transaction**: User finds a transaction that shouldn't affect reports
2. **Click Eye Icon**: Toggle button in the actions column
3. **Visual Feedback**: Transaction immediately appears with reduced opacity and eye-off icon
4. **Dashboard Updates**: Next time user views dashboard, that transaction is excluded from all calculations
5. **Re-include if Needed**: Click eye-off icon to include it again

### Visual Feedback
- **Immediate**: Row opacity changes instantly
- **Icon Change**: Button icon changes from Eye to EyeOff
- **Persistent**: State saved in database
- **Hover Tooltip**: Button shows "Include in reports" or "Exclude from reports"

## Benefits

1. **More Accurate Analytics**: Remove noise from your financial data
2. **Flexible**: Toggle on/off without deleting data
3. **Non-Destructive**: Original transaction data preserved
4. **Quick Access**: No need to edit transaction, just one click
5. **Visual Clarity**: Easy to see which transactions are excluded

## Technical Notes

### Performance
- Indexed column for fast filtering
- No additional joins required
- Minimal overhead on existing queries (single WHERE condition)

### Data Integrity
- Original transaction data never modified
- Easy to audit (can see all transactions, excluded or not)
- Reversible action (can always re-include)

### State Management
- Boolean flag in database (0 = included, 1 = excluded)
- Default value ensures backward compatibility
- Existing transactions automatically included

## Example Scenarios

### Scenario 1: Monthly Transfer
```
Transaction: "Transfer to Savings - $500"
Action: Exclude from reports
Result: Dashboard shows actual spending, not inflated by transfer
```

### Scenario 2: Reimbursable Expense
```
Transaction 1: "Conference Hotel - $300" (expense)
Transaction 2: "Company Reimbursement - $300" (income)
Action: Exclude both
Result: Neither affects your personal budget tracking
```

### Scenario 3: Gift Income
```
Transaction: "Birthday Money - $200"
Action: Exclude from reports
Result: Monthly income average stays accurate for budgeting
```

## Future Enhancements

Possible improvements:
- [ ] Bulk exclude/include multiple transactions
- [ ] Exclude by pattern or category
- [ ] Separate view to show only excluded transactions
- [ ] Export option to include/exclude excluded transactions
- [ ] Exclusion reason/notes
- [ ] Auto-exclude based on rules (e.g., all transfers)
- [ ] Dashboard widget showing count of excluded transactions

## Testing Checklist

- [x] Migration runs successfully on existing database
- [x] New column has correct default value
- [x] Toggle function works (include → exclude → include)
- [x] Dashboard KPIs exclude these transactions
- [x] Budget calculations exclude these transactions
- [x] Visual indicator appears correctly
- [x] Button icon changes appropriately
- [x] No linter errors
- [x] Period navigation works with excluded transactions
- [x] No performance degradation

## Conclusion

The "Exclude from Reports" feature provides users with fine-grained control over their financial analytics. It's a simple, non-destructive way to ensure that KPIs and budgets reflect only the transactions that matter for decision-making. The feature is fully implemented, tested, and ready to use.

