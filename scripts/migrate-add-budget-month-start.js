const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'cashopia.db');
const db = new Database(dbPath);

console.log('Starting migration: Add budget_month_start_day to households...');

try {
  // Add budget_month_start_day column to households table
  try {
    db.prepare("SELECT budget_month_start_day FROM households LIMIT 1").get();
    console.log('✓ budget_month_start_day column already exists in households.');
  } catch (e) {
    db.prepare("ALTER TABLE households ADD COLUMN budget_month_start_day INTEGER DEFAULT 1 NOT NULL").run();
    console.log('✓ Added budget_month_start_day column to households (default: 1st of month).');
  }

  console.log('✅ Migration completed successfully!');

} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}

