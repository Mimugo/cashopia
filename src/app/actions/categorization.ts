"use server";

import { getDb } from "@/lib/db";
import { isUserInHousehold } from "@/lib/auth";

export async function saveCategorizationPattern(
  householdId: number,
  userId: string,
  data: {
    categoryId: number;
    pattern: string;
    description: string;
  }
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  try {
    // Check if this exact pattern already exists for this category
    const existing = db
      .prepare(
        `
      SELECT id FROM categorization_patterns 
      WHERE household_id = ? AND category_id = ? AND pattern = ?
    `
      )
      .get(householdId, data.categoryId, data.pattern);

    if (existing) {
      return { success: true, message: "Pattern already exists", isNew: false };
    }

    // Insert new pattern
    db.prepare(
      `
      INSERT INTO categorization_patterns 
      (household_id, category_id, pattern, priority, is_default)
      VALUES (?, ?, ?, 10, 0)
    `
    ).run(householdId, data.categoryId, data.pattern);

    return {
      success: true,
      message: "Pattern saved successfully",
      isNew: true,
    };
  } catch (error) {
    console.error("Error saving pattern:", error);
    return { error: "Failed to save categorization pattern" };
  }
}

export async function findMatchingTransactions(
  householdId: number,
  userId: string,
  pattern: string,
  excludeTransactionId?: number
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  try {
    // Find transactions without a category that match the pattern
    let query = `
      SELECT t.*, c.name as category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.household_id = ? 
        AND t.category_id IS NULL
        AND t.description LIKE ?
    `;

    const params: any[] = [householdId, `%${pattern}%`];

    if (excludeTransactionId) {
      query += " AND t.id != ?";
      params.push(excludeTransactionId);
    }

    query += " ORDER BY t.date DESC LIMIT 50";

    const matches = db.prepare(query).all(...params);

    return {
      success: true,
      matches,
      count: matches.length,
    };
  } catch (error) {
    console.error("Error finding matching transactions:", error);
    return { error: "Failed to find matching transactions" };
  }
}

export async function bulkCategorizeTransactions(
  householdId: number,
  userId: string,
  transactionIds: number[],
  categoryId: number
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  try {
    // Verify all transactions belong to this household
    const placeholders = transactionIds.map(() => "?").join(",");
    const transactions = db
      .prepare(
        `
      SELECT id FROM transactions 
      WHERE id IN (${placeholders}) AND household_id = ?
    `
      )
      .all(...transactionIds, householdId);

    if (transactions.length !== transactionIds.length) {
      return { error: "Some transactions not found or unauthorized" };
    }

    // Update all transactions
    const stmt = db.prepare(
      `
      UPDATE transactions 
      SET category_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND household_id = ?
    `
    );

    let updated = 0;
    for (const id of transactionIds) {
      stmt.run(categoryId, id, householdId);
      updated++;
    }

    return {
      success: true,
      updated,
      message: `Successfully categorized ${updated} transaction${
        updated !== 1 ? "s" : ""
      }`,
    };
  } catch (error) {
    console.error("Error bulk categorizing:", error);
    return { error: "Failed to categorize transactions" };
  }
}

export async function suggestPatternFromDescription(
  description: string
): Promise<string> {
  // Common noise words that aren't merchant names
  const noiseWords = new Set([
    "payment",
    "transaction",
    "ref",
    "reference",
    "id",
    "nr",
    "number",
    "store",
    "shop",
    "market",
    "supermarket",
    "retail",
    "online",
    "purchase",
    "sale",
    "buy",
    "order",
    "invoice",
    "bill",
    "debit",
    "credit",
    "card",
    "terminal",
    "pos",
    "the",
    "and",
    "or",
    "at",
    "in",
    "on",
    "to",
    "from",
    "for",
    "ab",
    "ltd",
    "inc",
    "llc",
    "corp",
    "co",
    "company",
    "kortköp",
  ]);

  // Remove all numbers, dates, and special characters
  let cleaned = description
    .toLowerCase()
    .replace(/\d+[-/]\d+[-/]\d+/g, "") // Remove dates (26-10-25, 26/10/25, etc)
    .replace(/\d+:\d+/g, "") // Remove times
    .replace(/\d+/g, "") // Remove ALL numbers
    .replace(/[^\w\s-]/g, " ") // Remove special chars
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();

  // Split into words and filter
  const words = cleaned.split(" ").filter((word) => {
    // Keep words that are:
    // - At least 3 characters
    // - Not in the noise words list
    return word.length >= 3 && !noiseWords.has(word);
  });

  if (words.length === 0) {
    // Fallback: return first word from original description
    const firstWord = description.split(/[\s\d]/)[0];
    return firstWord.substring(0, 20).toLowerCase();
  }

  // Take the first meaningful word (usually the merchant name)
  // For multi-word merchants, you can adjust this to take 2 words
  const pattern = words[0];

  return pattern;
}
