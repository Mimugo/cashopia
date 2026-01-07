const Database = require("better-sqlite3");
const path = require("path");

const dbPath =
  process.env.DATABASE_URL || path.join(process.cwd(), "data", "cashopia.db");
const db = new Database(dbPath);

console.log("Adding new categories to existing households...\n");

// New categories to add
const newCategories = [
  {
    name: "Streaming",
    type: "expense",
    pattern:
      "netflix|spotify|hulu|disney|hbo|apple music|youtube premium|amazon prime video|paramount|peacock|max|apple tv|deezer|tidal",
  },
  {
    name: "Parking",
    type: "expense",
    pattern: "parking|parkering|park fee|valet|garage",
  },
  {
    name: "Fuel",
    type: "expense",
    pattern:
      "gas station|fuel|petrol|bensin|diesel|shell|bp|chevron|exxon|circle k|ingo",
  },
  {
    name: "Furniture",
    type: "expense",
    pattern:
      "ikea|furniture|sofa|chair|table|bed|mattress|wayfair|ashley|crate and barrel|jysk|mio",
  },
  {
    name: "Home Improvement",
    type: "expense",
    pattern:
      "home depot|lowe's|hardware|paint|tool|bauhaus|hornbach|rona|menards|ace hardware|byggmax|k-rauta",
  },
];

try {
  // Get all households
  const households = db.prepare("SELECT id, name FROM households").all();
  console.log(`Found ${households.length} household(s)\n`);

  for (const household of households) {
    console.log(
      `Processing household: ${household.name} (ID: ${household.id})`
    );

    for (const newCat of newCategories) {
      // Check if category already exists
      const existing = db
        .prepare(
          "SELECT id FROM categories WHERE household_id = ? AND name = ?"
        )
        .get(household.id, newCat.name);

      if (existing) {
        console.log(`  ✓ Category "${newCat.name}" already exists`);
        continue;
      }

      // Create category
      const result = db
        .prepare(
          "INSERT INTO categories (household_id, name, type, color) VALUES (?, ?, ?, ?)"
        )
        .run(household.id, newCat.name, newCat.type, "#3B82F6");

      const categoryId = result.lastInsertRowid;

      // Add default pattern
      db.prepare(
        "INSERT INTO categorization_patterns (household_id, category_id, pattern, is_default) VALUES (?, ?, ?, 1)"
      ).run(household.id, categoryId, newCat.pattern);

      console.log(
        `  ✅ Added category "${newCat.name}" with auto-categorization patterns`
      );
    }

    console.log("");
  }

  // Also update Transportation category to remove fuel and parking
  console.log("Updating Transportation category patterns...");
  const transportationUpdate = db.prepare(`
    UPDATE categorization_patterns 
    SET pattern = 'uber|lyft|taxi|transit|subway|bus fare|train|metro'
    WHERE is_default = 1 
      AND category_id IN (SELECT id FROM categories WHERE name = 'Transportation')
      AND pattern LIKE '%fuel%'
  `);
  const updated = transportationUpdate.run();
  if (updated.changes > 0) {
    console.log(`✅ Updated ${updated.changes} Transportation pattern(s)\n`);
  } else {
    console.log("✓ Transportation patterns already up to date\n");
  }

  // Update Entertainment category to remove streaming services
  console.log("Updating Entertainment category patterns...");
  const entertainmentUpdate = db.prepare(`
    UPDATE categorization_patterns 
    SET pattern = 'movie|theater|cinema|concert|game|festival|amusement|bowling|minigolf'
    WHERE is_default = 1 
      AND category_id IN (SELECT id FROM categories WHERE name = 'Entertainment')
      AND pattern LIKE '%netflix%'
  `);
  const entertainmentUpdated = entertainmentUpdate.run();
  if (entertainmentUpdated.changes > 0) {
    console.log(
      `✅ Updated ${entertainmentUpdated.changes} Entertainment pattern(s)\n`
    );
  } else {
    console.log("✓ Entertainment patterns already up to date\n");
  }

  console.log("✅ Successfully added new categories to all households!");
  console.log("\nNew categories added:");
  newCategories.forEach((cat) => console.log(`  - ${cat.name}`));
} catch (error) {
  console.error("Error adding categories:", error);
} finally {
  db.close();
}
