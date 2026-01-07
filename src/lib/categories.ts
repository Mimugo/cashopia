import { getDb, Category, CategorizationPattern } from "./db";

// Default categorization patterns
export const DEFAULT_PATTERNS = [
  // Income patterns
  { category: "Salary", pattern: "salary|payroll|wage", type: "income" },
  {
    category: "Freelance",
    pattern: "freelance|contractor|consulting",
    type: "income",
  },
  {
    category: "Investment",
    pattern: "dividend|interest|investment",
    type: "income",
  },

  // Expense patterns
  {
    category: "Groceries",
    pattern:
      "grocery|supermarket|whole foods|trader joe|safeway|walmart|costco",
    type: "expense",
  },
  {
    category: "Dining",
    pattern:
      "restaurant|cafe|coffee|starbucks|mcdonald|burger|pizza|food delivery|doordash|ubereats",
    type: "expense",
  },
  {
    category: "Transportation",
    pattern: "uber|lyft|taxi|transit|subway|bus fare|train|metro",
    type: "expense",
  },
  {
    category: "Fuel",
    pattern:
      "gas station|fuel|petrol|bensin|diesel|shell|bp|chevron|exxon|circle k|ingo",
    type: "expense",
  },
  {
    category: "Parking",
    pattern: "parking|parkering|park fee|valet|garage",
    type: "expense",
  },
  {
    category: "Utilities",
    pattern: "electric|water|gas bill|utility|internet|phone bill|cable",
    type: "expense",
  },
  {
    category: "Rent/Mortgage",
    pattern: "rent|mortgage|property management",
    type: "expense",
  },
  {
    category: "Healthcare",
    pattern:
      "pharmacy|doctor|hospital|medical|health insurance|dental|vision|apoteket",
    type: "expense",
  },
  {
    category: "Streaming",
    pattern:
      "netflix|spotify|hulu|disney|hbo|apple music|youtube premium|amazon prime video|paramount|peacock|max|apple tv|deezer|tidal",
    type: "expense",
  },
  {
    category: "Entertainment",
    pattern:
      "movie|theater|cinema|concert|game|festival|amusement|bowling|minigolf",
    type: "expense",
  },
  {
    category: "Furniture",
    pattern:
      "ikea|furniture|sofa|chair|table|bed|mattress|wayfair|ashley|crate and barrel|jysk|mio",
    type: "expense",
  },
  {
    category: "Home Improvement",
    pattern:
      "home depot|lowe's|hardware|paint|tool|bauhaus|hornbach|rona|menards|ace hardware|byggmax|k-rauta",
    type: "expense",
  },
  {
    category: "Shopping",
    pattern: "amazon|ebay|target|mall|retail|clothing|fashion",
    type: "expense",
  },
  {
    category: "Insurance",
    pattern: "insurance|policy premium",
    type: "expense",
  },
  {
    category: "Education",
    pattern: "school|tuition|education|course|book|university",
    type: "expense",
  },
  {
    category: "Fitness",
    pattern: "gym|fitness|yoga|sports|athletic",
    type: "expense",
  },
];

export function getCategories(householdId: number): Category[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM categories WHERE household_id = ? ORDER BY name ASC"
    )
    .all(householdId) as Category[];
}

export function createCategory(
  householdId: number,
  name: string,
  type: "income" | "expense",
  color: string = "#3B82F6"
): number {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO categories (household_id, name, type, color) VALUES (?, ?, ?, ?)"
    )
    .run(householdId, name, type, color);
  return result.lastInsertRowid as number;
}

export function ensureDefaultCategories(householdId: number) {
  const existingCategories = getCategories(householdId);

  if (existingCategories.length === 0) {
    // Create default categories
    const uniqueCategories = [
      ...new Set(
        DEFAULT_PATTERNS.map((p) => ({ name: p.category, type: p.type }))
      ),
    ];

    const categoryMap: Record<string, number> = {};

    for (const cat of uniqueCategories) {
      const categoryId = createCategory(
        householdId,
        cat.name,
        cat.type as "income" | "expense"
      );
      categoryMap[cat.name] = categoryId;
    }

    // Create default patterns
    const db = getDb();
    const stmt = db.prepare(
      "INSERT INTO categorization_patterns (household_id, category_id, pattern, is_default) VALUES (?, ?, ?, 1)"
    );

    for (const pattern of DEFAULT_PATTERNS) {
      const categoryId = categoryMap[pattern.category];
      if (categoryId) {
        stmt.run(householdId, categoryId, pattern.pattern);
      }
    }
  }
}

export function getCategorizationPatterns(
  householdId: number
): CategorizationPattern[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM categorization_patterns WHERE household_id = ? ORDER BY priority DESC, is_default DESC"
    )
    .all(householdId) as CategorizationPattern[];
}

export function addCategorizationPattern(
  householdId: number,
  categoryId: number,
  pattern: string,
  priority: number = 0
): number {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO categorization_patterns (household_id, category_id, pattern, priority, is_default) VALUES (?, ?, ?, ?, 0)"
    )
    .run(householdId, categoryId, pattern, priority);
  return result.lastInsertRowid as number;
}

export function categorizeTransaction(
  description: string,
  patterns: CategorizationPattern[]
): number | null {
  const lowerDesc = description.toLowerCase();

  // Sort by priority and check each pattern
  for (const pattern of patterns) {
    const patternParts = pattern.pattern.toLowerCase().split("|");
    for (const part of patternParts) {
      if (lowerDesc.includes(part.trim())) {
        return pattern.category_id;
      }
    }
  }

  return null;
}
