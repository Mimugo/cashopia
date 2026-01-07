"use server";

import { getDb } from "@/lib/db";
import { isUserInHousehold } from "@/lib/auth";
import {
  categorizeTransaction,
  getCategorizationPatterns,
} from "@/lib/categories";
import Papa from "papaparse";

interface CsvRow {
  [key: string]: string;
}

export async function detectCsvStructure(csvContent: string) {
  return new Promise((resolve, reject) => {
    // Try to detect delimiter (semicolon is common in European CSVs)
    const firstLine = csvContent.split("\n")[0];
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ";" : ",";

    Papa.parse(csvContent, {
      preview: 10,
      header: true,
      delimiter: delimiter,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const samples = results.data;

        // Try to detect which columns are what
        const detection = {
          headers,
          samples,
          delimiter,
          suggestedMapping: {
            dateColumn: detectDateColumn(headers, samples),
            descriptionColumn: detectDescriptionColumn(headers),
            amountColumn: detectAmountColumn(headers, samples),
            typeColumn: detectTypeColumn(headers),
            balanceColumn: detectBalanceColumn(headers),
          },
        };

        resolve(detection);
      },
      error: (error: any) => reject(error),
    });
  });
}

function detectDateColumn(headers: string[], samples: any[]): string | null {
  const dateKeywords = [
    "date",
    "time",
    "posted",
    "transaction date",
    "datetime",
  ];

  for (const header of headers) {
    const lowerHeader = header.toLowerCase();
    if (dateKeywords.some((keyword) => lowerHeader.includes(keyword))) {
      return header;
    }
  }

  return headers[0] || null;
}

function detectDescriptionColumn(headers: string[]): string | null {
  const descKeywords = [
    "description",
    "memo",
    "details",
    "merchant",
    "payee",
    "name",
  ];

  for (const header of headers) {
    const lowerHeader = header.toLowerCase();
    if (descKeywords.some((keyword) => lowerHeader.includes(keyword))) {
      return header;
    }
  }

  return headers[1] || null;
}

function detectAmountColumn(headers: string[], samples: any[]): string | null {
  const amountKeywords = ["amount", "value", "total", "sum", "debit", "credit"];

  for (const header of headers) {
    const lowerHeader = header.toLowerCase();
    if (amountKeywords.some((keyword) => lowerHeader.includes(keyword))) {
      // Verify it contains numbers
      const sampleValue = samples[0]?.[header];
      if (sampleValue && /[\d.,]+/.test(sampleValue)) {
        return header;
      }
    }
  }

  return null;
}

function detectTypeColumn(headers: string[]): string | null {
  const typeKeywords = ["type", "transaction type", "debit/credit"];

  for (const header of headers) {
    const lowerHeader = header.toLowerCase();
    if (typeKeywords.some((keyword) => lowerHeader.includes(keyword))) {
      return header;
    }
  }

  return null;
}

function detectBalanceColumn(headers: string[]): string | null {
  const balanceKeywords = [
    "balance",
    "running balance",
    "account balance",
    "current balance",
  ];

  for (const header of headers) {
    const lowerHeader = header.toLowerCase();
    if (balanceKeywords.some((keyword) => lowerHeader.includes(keyword))) {
      return header;
    }
  }

  return null;
}

export async function saveCsvMapping(
  householdId: number,
  userId: string,
  mapping: {
    name: string;
    dateColumn: string;
    descriptionColumn: string;
    amountColumn: string;
    typeColumn?: string;
    balanceColumn?: string;
    dateFormat?: string;
    delimiter?: string;
    hasHeader?: boolean;
  }
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();

  try {
    const result = db
      .prepare(
        `
      INSERT INTO csv_mappings (
        household_id, name, date_column, description_column, 
        amount_column, type_column, balance_column, date_format, delimiter, has_header
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        householdId,
        mapping.name,
        mapping.dateColumn,
        mapping.descriptionColumn,
        mapping.amountColumn,
        mapping.typeColumn || null,
        mapping.balanceColumn || null,
        mapping.dateFormat || "YYYY-MM-DD",
        mapping.delimiter || ",",
        mapping.hasHeader !== false ? 1 : 0
      );

    return { success: true, mappingId: result.lastInsertRowid };
  } catch (error) {
    return { error: "Failed to save mapping" };
  }
}

export async function getCsvMappings(householdId: number, userId: string) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  const db = getDb();
  const mappings = db
    .prepare(
      "SELECT * FROM csv_mappings WHERE household_id = ? ORDER BY created_at DESC"
    )
    .all(householdId);

  return { success: true, mappings };
}

export async function importCsvTransactions(
  householdId: number,
  userId: string,
  csvContent: string,
  mapping: {
    dateColumn: string;
    descriptionColumn: string;
    amountColumn: string;
    typeColumn?: string;
    balanceColumn?: string;
    dateFormat?: string;
  },
  accountId?: number
) {
  if (!isUserInHousehold(userId, householdId)) {
    return { error: "Unauthorized" };
  }

  return new Promise((resolve) => {
    // Detect delimiter
    const firstLine = csvContent.split("\n")[0];
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ";" : ",";

    Papa.parse(csvContent, {
      header: true,
      delimiter: delimiter,
      skipEmptyLines: true,
      complete: async (results) => {
        const db = getDb();
        const patterns = getCategorizationPatterns(householdId);

        const importBatchId = Date.now();
        let imported = 0;
        let failed = 0;
        let lastBalance: number | null = null;

        const stmt = db.prepare(`
          INSERT INTO transactions (
            household_id, account_id, category_id, date, description, 
            amount, type, balance_after, import_batch_id, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const row of results.data as CsvRow[]) {
          try {
            const date = parseDate(row[mapping.dateColumn], mapping.dateFormat);
            const description = row[mapping.descriptionColumn] || "Unknown";
            const amount = parseAmount(row[mapping.amountColumn]);

            let balanceAfter: number | null = null;
            if (mapping.balanceColumn && row[mapping.balanceColumn]) {
              balanceAfter = parseAmount(row[mapping.balanceColumn]);
              lastBalance = balanceAfter;
            }

            let type: "income" | "expense" = "expense";
            if (mapping.typeColumn && row[mapping.typeColumn]) {
              const typeValue = row[mapping.typeColumn].toLowerCase();
              if (
                typeValue.includes("credit") ||
                typeValue.includes("income") ||
                amount > 0
              ) {
                type = "income";
              }
            } else if (amount > 0) {
              type = "income";
            }

            const absAmount = Math.abs(amount);

            // Auto-categorize
            const categoryId = categorizeTransaction(description, patterns);

            stmt.run(
              householdId,
              accountId || null,
              categoryId || null,
              date,
              description,
              absAmount,
              type,
              balanceAfter,
              importBatchId,
              userId
            );

            imported++;
          } catch (error) {
            failed++;
            console.error("Failed to import row:", error);
          }
        }

        // Update account balance if we have a last balance from CSV
        if (accountId && lastBalance !== null) {
          db.prepare(
            "UPDATE bank_accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).run(lastBalance, accountId);

          // Record in history
          db.prepare(
            "INSERT INTO account_balance_history (account_id, balance) VALUES (?, ?)"
          ).run(accountId, lastBalance);
        }

        resolve({
          success: true,
          imported,
          failed,
          batchId: importBatchId,
          finalBalance: lastBalance,
        });
      },
      error: (error: any) => {
        resolve({ error: "Failed to parse CSV: " + error.message });
      },
    });
  });
}

function parseDate(dateStr: string, format?: string): string {
  // Simple date parsing - in production, use a proper date library
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return date.toISOString().split("T")[0];
}

function parseAmount(amountStr: string): number {
  // Remove currency symbols first
  let cleaned = amountStr.replace(/[$£€¥₹kr]/gi, "").trim();

  // Detect format: European (comma as decimal) vs US (period as decimal)
  // European: 1.234,56 or 1234,56
  // US: 1,234.56 or 1234.56

  // If we have both comma and period, determine which is decimal separator
  const hasComma = cleaned.includes(",");
  const hasPeriod = cleaned.includes(".");

  if (hasComma && hasPeriod) {
    // Both present: the one that appears last is the decimal separator
    const lastComma = cleaned.lastIndexOf(",");
    const lastPeriod = cleaned.lastIndexOf(".");

    if (lastComma > lastPeriod) {
      // European format: 1.234,56
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // US format: 1,234.56
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (hasComma && !hasPeriod) {
    // Only comma: check if it's likely a decimal separator
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length <= 3) {
      // Likely decimal separator: 3418,00
      cleaned = cleaned.replace(",", ".");
    } else {
      // Likely thousands separator: 1,234,567
      cleaned = cleaned.replace(/,/g, "");
    }
  }
  // If only period, leave as is (US format)

  const amount = parseFloat(cleaned);
  if (isNaN(amount)) {
    throw new Error("Invalid amount");
  }
  return amount;
}
