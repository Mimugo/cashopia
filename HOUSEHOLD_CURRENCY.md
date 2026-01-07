# Household-Level Currency Implementation

## Overview

Currency is now managed at the household level rather than the account level. This provides a consistent display currency across the entire application for all financial data within a household.

## Changes Made

### 1. Database Schema

**Migration: `scripts/migrate-add-household-currency.js`**
- Added `currency` column to `households` table (default: 'USD')

**Updated Schema:**
```sql
ALTER TABLE households ADD COLUMN currency TEXT DEFAULT 'USD';
```

### 2. Registration Flow

**Updated: `src/app/register/page.tsx`**
- Added currency selection dropdown during registration
- 13 currencies available: USD, EUR, GBP, SEK, NOK, DKK, JPY, CNY, INR, CAD, AUD, CHF, BRL
- Default: USD

**Flow:**
1. User enters name, email, password
2. User enters household name
3. **NEW:** User selects household currency
4. Household is created with selected currency

### 3. Household Settings

**New Action: `src/app/actions/household.ts`**
- `updateHouseholdSettings()` - Update household name and currency
- Only admins can modify household settings

**Updated: `src/app/household/page.tsx`**
- Added "Settings" button with gear icon
- Settings modal for editing:
  - Household name
  - Currency selection
- Shows current currency in household info

### 4. Display Updates

All currency displays now use the household's currency:

**Dashboard (`src/app/dashboard/page.tsx`):**
- Total balance across all accounts
- Individual account balances
- Total income
- Total expenses
- Net income

**Accounts Page (`src/app/accounts/page.tsx`):**
- Total balance summary
- Individual account balances
- Balance details modal
- Balance reconciliation

**Updated Actions:**
- `getDashboardData()` - Returns `householdCurrency`
- `getAccounts()` - Returns `householdCurrency`

### 5. Type Updates

**Updated: `src/lib/db.ts`**
```typescript
export interface Household {
  id: number;
  name: string;
  currency: string;  // NEW
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

**Updated: `src/app/actions/auth.ts`**
```typescript
export async function createHousehold(
  userId: string, 
  name: string, 
  currency: string = 'USD'  // NEW parameter
)
```

## Supported Currencies

The application supports 13 major world currencies:

| Code | Name | Symbol | Position |
|------|------|--------|----------|
| USD | US Dollar | $ | Before |
| EUR | Euro | € | Before |
| GBP | British Pound | £ | Before |
| SEK | Swedish Krona | kr | After |
| NOK | Norwegian Krone | kr | After |
| DKK | Danish Krone | kr | After |
| JPY | Japanese Yen | ¥ | Before |
| CNY | Chinese Yuan | ¥ | Before |
| INR | Indian Rupee | ₹ | Before |
| CAD | Canadian Dollar | C$ | Before |
| AUD | Australian Dollar | A$ | Before |
| CHF | Swiss Franc | CHF | Before |
| BRL | Brazilian Real | R$ | Before |

## Usage

### For New Users

1. **During Registration:**
   - Fill in personal details
   - Choose household name
   - Select currency from dropdown
   - Currency applies to all financial displays

### For Existing Users

1. **Changing Currency:**
   - Go to **Household** page
   - Click **Settings** button
   - Select new currency from dropdown
   - Click **Save Settings**
   - All amounts immediately display in new currency

### Important Notes

- **Account currency field still exists** but is primarily for reference
- All displays use the household currency regardless of account currency
- Currency conversion is NOT performed - values are displayed as-is
- Multi-currency support (actual conversion) is a future enhancement

## Technical Details

### Currency Formatting

Uses the `formatCurrency()` function from `/src/lib/currency.ts`:

```typescript
formatCurrency(amount: number, currency: string)
```

**Features:**
- Locale-aware number formatting
- Correct symbol positioning (before/after)
- Proper thousands and decimal separators per currency

**Examples:**
```typescript
formatCurrency(3418.50, 'USD')  // → "$3,418.50"
formatCurrency(3418.50, 'EUR')  // → "€3.418,50"
formatCurrency(3418.50, 'SEK')  // → "3 418,50 kr"
```

### Authorization

- Only household **admins** can change currency
- Currency change is instant for all household members
- No transaction recalculation needed (amounts stay the same)

## Migration Path

### Existing Installations

1. **Run Migration:**
   ```bash
   node scripts/migrate-add-household-currency.js
   ```

2. **Result:**
   - Adds `currency` column to `households` table
   - Defaults all existing households to 'USD'
   - No data loss or corruption

3. **Post-Migration:**
   - Users can update their household currency in settings
   - Application continues working normally

### No Migration Needed For

- New installations (schema includes currency by default)
- Docker deployments (database initialized with new schema)

## Future Enhancements

### Potential Features

1. **Currency Conversion:**
   - Integrate exchange rate API
   - Convert between currencies
   - Track historical exchange rates
   - Display amounts in multiple currencies

2. **Multi-Currency Households:**
   - Support accounts in different currencies
   - Automatic conversion to household currency
   - Track exchange gains/losses

3. **Currency History:**
   - Track when currency was changed
   - Historical reports in original currency
   - Currency change audit log

4. **More Currencies:**
   - Add support for 150+ world currencies
   - Crypto currencies
   - Custom/regional currencies

## Testing Checklist

- [ ] Register new user with different currencies
- [ ] Verify currency appears in all displays
- [ ] Change household currency in settings
- [ ] Verify all pages update immediately
- [ ] Test with Swedish CSV import (SEK)
- [ ] Verify formatting is locale-appropriate
- [ ] Test with large numbers (thousands separator)
- [ ] Test with negative numbers
- [ ] Verify admin-only access to settings

## Files Modified

### New Files
- `/scripts/migrate-add-household-currency.js` - Migration script
- `/HOUSEHOLD_CURRENCY.md` - This documentation

### Modified Files
- `/scripts/init-db.js` - Added currency to households table
- `/src/lib/db.ts` - Updated Household interface
- `/src/app/actions/auth.ts` - Added currency parameter to createHousehold
- `/src/app/actions/household.ts` - Added updateHouseholdSettings
- `/src/app/actions/dashboard.ts` - Returns householdCurrency
- `/src/app/actions/accounts.ts` - Returns householdCurrency
- `/src/app/register/page.tsx` - Added currency selection
- `/src/app/household/page.tsx` - Added settings modal
- `/src/app/dashboard/page.tsx` - Uses household currency
- `/src/app/accounts/page.tsx` - Uses household currency

## Backwards Compatibility

✅ **Fully backwards compatible**
- Existing households default to USD
- Existing accounts retain their currency field
- No breaking changes to API
- Migration is safe and reversible

## Summary

Currency is now a household-wide setting that:
- ✅ Is set during registration
- ✅ Can be changed by admins in household settings
- ✅ Applies to all financial displays
- ✅ Supports 13 major world currencies
- ✅ Uses proper locale formatting
- ✅ Is fully backwards compatible

