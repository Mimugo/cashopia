# Account Balance Calculation Fix

## Problem

The balance calculation system was incorrectly calculating account balances because it didn't account for the opening/initial balance of accounts.

### Original Bug

When an account was created with an initial balance (e.g., $1000) and transactions were added:
- **Stored Balance**: Correctly updated incrementally (1000 → 950 after a $50 expense) ✅
- **Calculated Balance**: Incorrectly summed only transactions from zero (-50) ❌

This caused the reconciliation feature to show large discrepancies.

## Solution

### 1. Updated Balance Calculation Logic

**File: `src/app/actions/accounts.ts` - `getAccountBalance()` function**

The calculated balance now properly accounts for:
1. **Opening Balance**: Retrieved from `account_balance_history` table (earliest entry)
2. **Transaction Totals**: Sum of all income minus expenses for the account
3. **Final Calculation**: `openingBalance + income - expenses`

**Logic:**
```typescript
if (openingBalance exists) {
  calculatedBalance = openingBalance + income - expenses
} else if (no transactions) {
  calculatedBalance = current stored balance
} else {
  // Legacy account without history
  calculatedBalance = current stored balance (can't verify)
}
```

### 2. Always Record Opening Balance

**File: `src/app/actions/accounts.ts` - `createAccount()` function**

Now **always** records the initial balance in `account_balance_history`, even if zero:
```typescript
// Before: Only if balance > 0
if (data.balance && data.balance !== 0) {
  db.prepare(...).run(result.lastInsertRowid, data.balance);
}

// After: Always record
const initialBalance = data.balance || 0;
db.prepare(...).run(result.lastInsertRowid, initialBalance);
```

This ensures every account has a baseline for calculations.

### 3. Fix Script for Existing Accounts

**File: `scripts/fix-account-balances.js`**

For accounts created before this fix (without opening balance history):
- Calculates the opening balance retroactively
- Creates a history entry dated before the first transaction
- Handles accounts with no transactions

**Run the fix:**
```bash
node scripts/fix-account-balances.js
```

## How It Works Now

### Creating a New Account

1. User creates account with balance of $1000
2. System records in `bank_accounts`: `balance = 1000`
3. System records in `account_balance_history`: `balance = 1000`
4. **Opening balance is now tracked** ✅

### Adding Transactions

1. User adds expense of $50
2. System updates `bank_accounts.balance`: `1000 → 950`
3. Transaction recorded: `type='expense', amount=50`
4. **Stored balance is incrementally updated** ✅

### Balance Reconciliation

1. System retrieves opening balance from history: `1000`
2. System sums transactions: `income=0, expenses=50`
3. Calculates: `1000 + 0 - 50 = 950`
4. Compares with stored balance: `950`
5. **No difference = Everything matches** ✅

### CSV Import with Balance Column

When importing CSV with balance column:
1. Last balance from CSV updates `bank_accounts.balance`
2. Records in `account_balance_history`
3. Transactions are imported
4. **Balance reconciliation works correctly** ✅

## Migration Steps

### For New Installations
No action needed - new accounts automatically get opening balance tracking.

### For Existing Installations

1. **Automatic Fix (Recommended):**
   ```bash
   node scripts/fix-account-balances.js
   ```
   
   This script:
   - Finds accounts without opening balance history
   - Calculates correct opening balance based on current balance and transactions
   - Creates history entry
   - Preserves all existing data

2. **Manual Verification:**
   - Go to Accounts page
   - Click "View Details" on any account
   - Check if "Stored Balance" matches "Calculated Balance"
   - Small differences (< $0.01) are normal due to rounding

## Testing

### Test Cases

1. **New account with zero balance:**
   - Create account with $0
   - Add income transaction $100
   - Verify: Stored = $100, Calculated = $100 ✅

2. **New account with initial balance:**
   - Create account with $1000
   - Add expense $50
   - Verify: Stored = $950, Calculated = $950 ✅

3. **CSV import with balance:**
   - Import CSV with final balance $500
   - Verify: Account balance = $500
   - Verify: Calculated balance matches ✅

4. **Multiple transactions:**
   - Create account with $1000
   - Add: +$200 income, -$50 expense, -$150 expense
   - Expected: $1000 + $200 - $50 - $150 = $1000
   - Verify: Stored = Calculated = $1000 ✅

## Technical Details

### Database Tables Involved

**`bank_accounts`**
- Stores current balance
- Updated incrementally with each transaction

**`account_balance_history`**
- Tracks balance changes over time
- First entry = opening balance (baseline for calculations)
- New entry added on:
  - Account creation
  - CSV import with balance column
  - Manual balance update

**`transactions`**
- Records all financial transactions
- Linked to account via `account_id`
- Used to calculate balance from opening balance

### Key Functions

**`createAccount()`**
- Creates account with initial balance
- Records opening balance in history

**`getAccountBalance()`**
- Retrieves stored balance
- Calculates balance from opening + transactions
- Returns both for comparison

**`createTransaction()`**
- Adds transaction record
- Updates account balance incrementally

**`importCsvTransactions()`**
- Imports transactions from CSV
- Updates account balance from final CSV balance
- Records in balance history

## Benefits

1. **Accurate Reconciliation**: Can verify transactions match account balance
2. **Error Detection**: Identifies missing or duplicate transactions
3. **Historical Tracking**: Can see how balance changed over time
4. **CSV Import Support**: Properly handles imported balances
5. **Audit Trail**: Complete history of balance changes

## Future Enhancements

Potential improvements:
- Balance reconciliation UI with detailed breakdown
- Automatic detection of missing transactions
- Balance history graph/timeline
- Period-specific reconciliation (monthly, yearly)
- Export reconciliation reports

