# Multi-Account Support & Balance Tracking

## Overview

Cashopia now supports multiple bank accounts per household with automatic balance tracking from CSV imports.

## Features Added

### 1. Bank Accounts Management

- **Create Multiple Accounts**: Each household can have unlimited bank accounts
- **Account Types**: Checking, Savings, Credit Card, Investment, Other
- **Account Details**: Store institution name, last 4 digits, currency
- **Active/Inactive Status**: Deactivate accounts without deleting them
- **Balance Tracking**: Current balance with historical tracking

### 2. Transaction-Account Linking

- Transactions can now be linked to specific bank accounts
- Track balance after each transaction
- Filter transactions by account
- Maintain account balance accuracy

### 3. CSV Import Enhancements

- **Account Selection**: Choose which account to import transactions into
- **Balance Column Detection**: Automatically detect balance columns in CSV files
- **Auto-Balance Update**: Final balance from CSV automatically updates account balance
- **Balance History**: Track how account balances change over time

### 4. Dashboard Integration

- View all account balances at a glance
- See total balance across all active accounts
- Quick access to accounts page
- Visual cards showing each account's current balance

## Database Schema

### New Tables

#### `bank_accounts`
- `id`: Primary key
- `household_id`: Foreign key to households
- `name`: Account name (e.g., "Main Checking")
- `account_type`: Type of account (checking, savings, etc.)
- `institution`: Bank name
- `account_number_last4`: Last 4 digits
- `balance`: Current balance
- `currency`: Currency code (default: USD)
- `is_active`: Active status
- `created_at`, `updated_at`: Timestamps

#### `account_balance_history`
- `id`: Primary key
- `account_id`: Foreign key to bank_accounts
- `balance`: Balance at this point in time
- `recorded_at`: Timestamp

### Modified Tables

#### `transactions`
- Added `account_id`: Foreign key to bank_accounts (nullable)
- Added `balance_after`: Balance after transaction (nullable)

#### `csv_mappings`
- Added `balance_column`: CSV column name for balance (nullable)

## Usage Guide

### Creating an Account

1. Navigate to **Accounts** in the main navigation
2. Click **Add Account**
3. Fill in the account details:
   - Account Name (required)
   - Account Type (required)
   - Institution (optional)
   - Last 4 Digits (optional)
   - Current Balance (optional)
   - Currency (default: USD)
4. Click **Add Account**

### Managing Accounts

- **View Balance Details**: Click "View Details" to see stored vs. calculated balance
- **Edit Account**: Modify account information
- **Update Balance**: Manually adjust the current balance
- **Deactivate**: Mark an account as inactive (preserves transaction history)
- **Delete**: Remove account (only if no transactions exist)

### Importing Transactions to an Account

1. Go to **Import CSV**
2. Upload your CSV file
3. Map the columns (system will auto-detect)
4. **Select Account**: Choose which account these transactions belong to
5. **Balance Column**: If your CSV has a running balance column, select it
6. Confirm and import
7. The account balance will automatically update to the last balance in the CSV

### Viewing Account Balances

#### On Dashboard
- Account balances appear at the top of the dashboard
- Shows up to 6 accounts with total balance
- Click "View All" to go to the accounts page

#### On Accounts Page
- See all accounts with their current balances
- Total balance across all active accounts
- Individual account cards with details
- Balance reconciliation tools

## API / Server Actions

### Account Management
- `getAccounts(householdId, userId)`: Get all accounts for a household
- `createAccount(householdId, userId, data)`: Create a new account
- `updateAccount(accountId, householdId, userId, data)`: Update account details
- `deleteAccount(accountId, householdId, userId)`: Delete an account
- `getAccountBalance(accountId, householdId, userId)`: Get balance details
- `updateAccountBalance(accountId, householdId, userId, newBalance)`: Update balance

### CSV Import
- `importCsvTransactions()`: Now accepts optional `accountId` parameter
- Balance column mapping supported in CSV structure detection
- Automatic balance update on successful import

### Dashboard
- `getDashboardData()`: Now includes `accountBalances` and `totalBalance`

## Balance Reconciliation

The system tracks two types of balances:

1. **Stored Balance**: The balance stored in the `bank_accounts` table
2. **Calculated Balance**: Sum of all income minus expenses for that account

When viewing account details, you can see both balances and any difference. This helps you:
- Identify missing transactions
- Catch data import errors
- Ensure accuracy with your bank statements

## Migration

A migration script (`scripts/migrate-add-accounts.js`) was created to add the new tables and columns to existing databases without data loss.

To run the migration:
```bash
node scripts/migrate-add-accounts.js
```

## Future Enhancements

Potential improvements for the accounts feature:

- **Account Transfers**: Record transfers between accounts
- **Multi-Currency**: Better support for accounts in different currencies
- **Balance Alerts**: Notify when balance drops below threshold
- **Reconciliation Mode**: Step-by-step balance reconciliation tool
- **Account Groups**: Group related accounts (e.g., all checking accounts)
- **Net Worth Tracking**: Calculate total net worth across all accounts over time
- **Account Closing**: Formal process for closing accounts with final balance
- **Overdraft Protection**: Track overdraft limits for checking accounts
- **Interest Tracking**: Record interest earned/charged per account

