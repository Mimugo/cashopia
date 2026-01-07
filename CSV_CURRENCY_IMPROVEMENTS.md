# CSV Import & Currency Display Improvements

## Overview
This document outlines the improvements made to handle international number formats, multi-currency support, and saved mapping selection.

## 1. Fixed CSV Number Parsing (European Format)

### Problem
CSV files with European number formatting (comma as decimal separator) were being parsed incorrectly:
- Input: `-3418,00` or `575,10`
- Previous result: `-341800` or `57510` (two extra zeros)

### Solution
Enhanced `parseAmount()` function to intelligently detect and handle different number formats:

**Format Detection Logic:**
```typescript
// European format: 1.234,56 or 3418,00
// US format: 1,234.56 or 3418.00

1. If both comma and period present:
   - Last separator is decimal separator
   - Other is thousands separator

2. If only comma present:
   - If followed by 2-3 digits → decimal separator
   - Otherwise → thousands separator

3. If only period → US format (leave as-is)
```

**Supported Formats:**
- ✅ `3418,00` → `3418.00` (European)
- ✅ `1.234,56` → `1234.56` (European with thousands)
- ✅ `1,234.56` → `1234.56` (US with thousands)
- ✅ `3418.00` → `3418.00` (US)
- ✅ `-3418,00` → `-3418.00` (European negative)

**Currency Symbols Handled:**
- $, £, €, ¥, ₹, kr (Swedish/Norwegian/Danish Krona)

## 2. Automatic Delimiter Detection

### Problem
European CSV files often use semicolons (`;`) as delimiters instead of commas.

### Solution
Added automatic delimiter detection:

```typescript
// Count semicolons vs commas in first line
const firstLine = csvContent.split('\n')[0];
const semicolonCount = (firstLine.match(/;/g) || []).length;
const commaCount = (firstLine.match(/,/g) || []).length;
const delimiter = semicolonCount > commaCount ? ';' : ',';
```

**Applied to:**
- `detectCsvStructure()` - Column detection
- `importCsvTransactions()` - Actual import

## 3. Multi-Currency Support

### New Currency Library (`/src/lib/currency.ts`)

**Features:**
- 17+ currency symbols (USD, EUR, GBP, SEK, NOK, DKK, JPY, etc.)
- Proper symbol positioning (before/after amount)
- Locale-aware number formatting
- Currency string parsing

**Key Function:**
```typescript
formatCurrency(amount: number, currency: string = 'USD', options?: {
  showSymbol?: boolean;
  decimals?: number;
  locale?: string;
})
```

**Examples:**
```typescript
formatCurrency(3418.00, 'USD')  // → "$3,418.00"
formatCurrency(3418.00, 'EUR')  // → "€3.418,00"
formatCurrency(3418.00, 'SEK')  // → "3 418,00 kr"
formatCurrency(3418.00, 'GBP')  // → "£3,418.00"
```

**Currency Symbol Positioning:**
- **Before**: USD, EUR, GBP, JPY, INR, CAD, AUD, etc.
- **After**: SEK, NOK, DKK, RUB

### UI Updates

All currency displays now use proper formatting:

**Dashboard:**
- Account balances
- Total balance
- Income/Expense/Net summaries

**Accounts Page:**
- Individual account balances
- Total balance across accounts
- Balance reconciliation details

**Future:** Transactions and Budgets pages will also use currency formatting

## 4. Saved Mapping Selection Before Upload

### Problem
Users had to upload a CSV file before they could load a saved mapping, which was backwards.

### Solution
Redesigned import flow:

**New Flow:**
1. **Select Configuration** (Step 1a)
   - Choose "New Mapping" (auto-detect)
   - OR select a saved mapping
   
2. **Upload CSV File** (Step 1b)
   - File is parsed using selected mapping
   - If "New Mapping" chosen → auto-detect columns
   - If saved mapping chosen → use those column assignments

3. **Review & Adjust Mapping** (Step 2)
   - See/edit column assignments
   - Add account selection
   - Add balance column

4. **Confirm & Import** (Steps 3-4)
   - Preview transactions
   - Complete import

**UI Improvements:**
- Radio-button style selection for mappings
- Shows mapping details (date column, amount column, balance column)
- Clear indication of which mapping is being used
- Can still auto-detect with new files

## Technical Implementation Details

### Files Modified

1. **`/src/lib/currency.ts`** (NEW)
   - Complete currency formatting library
   - 17+ currencies supported
   - Locale-aware formatting

2. **`/src/app/actions/csv-import.ts`**
   - Enhanced `parseAmount()` for European numbers
   - Added delimiter auto-detection
   - Added `detectBalanceColumn()`
   - Updated structure detection

3. **`/src/app/import/page.tsx`**
   - New mapping selection UI
   - `selectedMappingId` state
   - `handleSelectMapping()` and `handleUseNewMapping()`
   - Updated file upload handler
   - Improved UI flow

4. **`/src/app/dashboard/page.tsx`**
   - Imported `formatCurrency()`
   - Updated all currency displays
   - Dynamic currency based on account

5. **`/src/app/accounts/page.tsx`**
   - Imported `formatCurrency()`
   - Updated all balance displays
   - Removed redundant currency code display

## Usage Examples

### Importing a Swedish Bank CSV

**CSV Format:**
```csv
2026/01/05;-3418,00;3093 01 21155;;;Betalning PG 4798401-8;575,10;SEK;
2026/01/02;2000,00;;3093 01 21155;;Överföring;3993,10;SEK;
```

**Steps:**
1. Create account with currency = "SEK"
2. Go to Import CSV
3. Select saved mapping if available (e.g., "Nordea Bank")
4. Upload CSV file
5. System automatically:
   - Detects semicolon delimiter
   - Parses amounts correctly: `-3418,00` → `-3418.00`
   - Maps balance column: `575,10` → `575.10`
   - Updates account balance

**Result:**
- Transactions imported with correct amounts
- Account balance updated to 575.10 SEK
- Dashboard shows: "575,10 kr"

### Creating a New Currency Account

```typescript
// Example: Norwegian Checking Account
{
  name: "DNB Checking",
  accountType: "checking",
  institution: "DNB",
  balance: 15000.50,
  currency: "NOK"
}

// Displays as: "15 000,50 kr"
```

## Testing Recommendations

1. **Number Parsing:**
   - Test with European format: `1.234,56`
   - Test with US format: `1,234.56`
   - Test with simple decimals: `1234,56` and `1234.56`
   - Test negative numbers
   - Test with currency symbols

2. **Delimiter Detection:**
   - Test semicolon-delimited files
   - Test comma-delimited files
   - Test tab-delimited files (may need enhancement)

3. **Currency Display:**
   - Create accounts in different currencies
   - Verify proper symbol and positioning
   - Check locale-specific formatting (comma vs period)

4. **Saved Mappings:**
   - Create a mapping
   - Select it before uploading
   - Verify columns are pre-filled correctly
   - Upload file and confirm it uses those columns

## Known Limitations & Future Enhancements

### Current Limitations:
1. Mixed currencies in single household not fully handled in summaries
2. Currency conversion not supported (shows values in original currency)
3. Tab-delimited files may not auto-detect correctly

### Potential Enhancements:
1. **Currency Conversion:**
   - Integrate with exchange rate API
   - Show converted values in household's primary currency
   - Track exchange rates over time

2. **More Delimiters:**
   - Tab-delimited (TSV)
   - Pipe-delimited
   - Custom delimiter selection

3. **Date Format Detection:**
   - Auto-detect date formats (YYYY/MM/DD vs DD/MM/YYYY)
   - Support more international date formats

4. **Number Format Selection:**
   - Allow user to specify decimal separator preference
   - Manual override for ambiguous cases

5. **CSV Templates:**
   - Export template CSV files
   - Download mapping configurations

## Migration Notes

No database migration required for these changes. They are purely frontend and processing logic improvements.

All existing data remains compatible, and the enhancements are backwards-compatible with previously imported transactions.

