# Automatic Pattern Learning for Transaction Categorization

## Overview

When you manually categorize a transaction, Cashopia can learn from your choice and automatically apply the same category to similar transactions.

## How It Works

### 1. Manual Categorization Trigger

When you assign a category to a transaction (either creating new or editing existing), the system:
1. Extracts a meaningful pattern from the transaction description
2. Searches for other uncategorized transactions matching that pattern
3. If matches are found, shows a confirmation dialog

### 2. Pattern Extraction

The system intelligently extracts patterns by:
- Removing noise words (payment, transaction, ref, reference, ID, etc.)
- Removing long numbers (transaction IDs, reference numbers)
- Removing special characters
- Keeping the meaningful parts (usually merchant/company names)

**Examples:**
- `"Payment PG 4798401-8 Partille Ene"` → `"partille ene"`
- `"GOOGLE YOUTUBE ID:12345678"` → `"google youtube"`
- `"Amazon.com #REF-9876543"` → `"amazon com"`

### 3. Pattern Learning Modal

After categorizing a transaction, if similar matches are found, you'll see a modal showing:
- The extracted pattern
- The category being applied
- A list of matching uncategorized transactions
- Checkboxes to select which transactions to categorize

### 4. Confirmation Options

**Save Pattern & Categorize:**
- Saves the pattern to the database for future auto-categorization
- Applies the category to all selected matching transactions
- Future transactions matching this pattern will be automatically categorized

**Skip:**
- Doesn't save the pattern
- Doesn't categorize other transactions
- No pattern learning occurs

## Usage Examples

### Example 1: Recurring Bills

**Scenario:** You get monthly electricity bills from "Partille Energi"

1. You manually categorize one transaction:
   - Description: `"Payment PG 4798401-8 Partille Energi"`
   - Category: `"Utilities"`

2. System shows you 3 similar transactions:
   - `"Payment PG 4798401-8 Partille Energi"` (Last month)
   - `"Payment PG 4798401-8 Partille Energi"` (2 months ago)
   - `"Payment PG 4798401-8 Partille Energi"` (3 months ago)

3. You confirm → All 4 transactions now categorized as "Utilities"

4. Next month's bill will be **automatically categorized** as "Utilities"

### Example 2: Online Shopping

**Scenario:** You shop at Amazon frequently

1. Categorize one Amazon transaction as "Shopping"
2. System finds all other Amazon transactions
3. You select which ones to categorize (maybe some are work-related)
4. Future Amazon purchases auto-categorize as "Shopping"

### Example 3: Subscription Services

**Scenario:** Monthly Spotify subscription

1. Categorize one Spotify transaction as "Entertainment"
2. System finds all past Spotify charges
3. Confirm → All Spotify transactions categorized
4. Future charges auto-categorize

## Technical Details

### Pattern Matching

- **Case-insensitive**: "Netflix" matches "NETFLIX" and "netflix"
- **Partial match**: Pattern "spotify" matches "SPOTIFY PREMIUM AB"
- **Wildcards**: Uses SQL LIKE with wildcards: `%pattern%`

### Pattern Storage

Patterns are stored in the `categorization_patterns` table:
- `household_id`: Patterns are household-specific
- `category_id`: Which category to apply
- `pattern`: The extracted text pattern
- `priority`: Higher priority patterns match first (default: 10)
- `is_default`: System defaults vs. user-learned (learned = 0)

### Auto-Categorization

When importing CSV or creating transactions:
1. System checks if description matches any saved patterns
2. Applies the category from the highest priority matching pattern
3. User can still manually override if needed

### Bulk Categorization

The confirmation modal allows bulk operations:
- Up to 50 matching transactions shown
- Select/deselect individual transactions
- One-click to categorize all selected

## Benefits

1. **Time Saving**: Categorize multiple transactions at once
2. **Consistency**: Same merchants always get same category
3. **Automation**: Future transactions auto-categorize
4. **Accuracy**: Reduces manual categorization errors
5. **Learning**: System gets smarter over time

## Best Practices

### When to Save Patterns

✅ **Good candidates for pattern learning:**
- Recurring bills (utilities, rent, subscriptions)
- Regular merchants (grocery stores, gas stations)
- Service providers (internet, phone)
- Payroll/salary (employer name)

❌ **Not recommended for:**
- One-time purchases
- Generic descriptions ("Payment", "Transfer")
- Person-to-person transfers (P2P)
- Highly variable descriptions

### Pattern Refinement

If a pattern is too broad or too narrow:
1. Go to Categories page
2. View categorization patterns for that category
3. Edit or delete the pattern
4. Manually recategorize affected transactions

### Managing Patterns

You can manage saved patterns:
- View all patterns for a category
- Edit pattern text for better matching
- Adjust priority for conflicting patterns
- Delete patterns that are no longer useful

## Privacy & Security

- **Household-specific**: Your patterns don't affect other households
- **Local storage**: All patterns stored in your database
- **User control**: You choose which patterns to save
- **Reversible**: Can always manually change categories

## Future Enhancements

Potential improvements:
- **Machine Learning**: AI-powered categorization suggestions
- **Pattern suggestions**: System suggests patterns to create
- **Pattern confidence**: Show match confidence percentage
- **Pattern testing**: Test patterns before saving
- **Pattern export/import**: Share patterns between households
- **Smart categories**: Suggest categories based on patterns
- **Duplicate detection**: Warn about overlapping patterns
- **Pattern analytics**: Show which patterns are most used

## Troubleshooting

### Pattern Not Matching

**Problem**: Saved pattern doesn't match expected transactions

**Solutions:**
1. Check the pattern text - it might be too specific
2. Try a shorter, more generic pattern
3. Remove unnecessary words from the pattern
4. Check for typos or special characters

### Too Many Matches

**Problem**: Pattern matches unrelated transactions

**Solutions:**
1. Make the pattern more specific
2. Add more context words to the pattern
3. Delete the pattern and create a more precise one
4. Manually categorize the incorrect matches

### Pattern Conflicts

**Problem**: Multiple patterns match the same transaction

**Solutions:**
1. The highest priority pattern wins
2. Adjust pattern priorities
3. Make patterns more specific to avoid overlap
4. Delete or edit conflicting patterns

## API Reference

### Server Actions

**`saveCategorizationPattern()`**
```typescript
saveCategorizationPattern(
  householdId: number,
  userId: string,
  data: {
    categoryId: number;
    pattern: string;
    description: string;
  }
)
```

**`findMatchingTransactions()`**
```typescript
findMatchingTransactions(
  householdId: number,
  userId: string,
  pattern: string,
  excludeTransactionId?: number
)
```

**`bulkCategorizeTransactions()`**
```typescript
bulkCategorizeTransactions(
  householdId: number,
  userId: string,
  transactionIds: number[],
  categoryId: number
)
```

**`suggestPatternFromDescription()`**
```typescript
suggestPatternFromDescription(
  description: string
): Promise<string>
```

## Files Modified

- `/src/app/actions/categorization.ts` (new) - Server actions
- `/src/app/transactions/page.tsx` - Pattern learning UI
- `/PATTERN_LEARNING.md` (this file) - Documentation

## Summary

Pattern Learning is a powerful feature that:
- ✅ Learns from your manual categorizations
- ✅ Finds similar uncategorized transactions
- ✅ Lets you bulk-categorize with confirmation
- ✅ Automatically categorizes future transactions
- ✅ Saves time and improves accuracy
- ✅ Gets smarter as you use it

