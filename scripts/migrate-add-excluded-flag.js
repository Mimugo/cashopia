const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'cashopia.db');
const db = new Database(dbPath);

console.log('Starting migration: Add excluded_from_reports to transactions...');

try {
  // Add excluded_from_reports column to transactions table
  try {
    db.prepare("SELECT excluded_from_reports FROM transactions LIMIT 1").get();
    console.log('✓ excluded_from_reports column already exists in transactions.');
  } catch (e) {
    db.prepare("ALTER TABLE transactions ADD COLUMN excluded_from_reports BOOLEAN DEFAULT 0 NOT NULL").run();
    console.log('✓ Added excluded_from_reports column to transactions (default: 0 = included).');
  }

  // Create index for better query performance
  try {
    db.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_excluded ON transactions(excluded_from_reports);").run();
    console.log('✓ Created index on excluded_from_reports column.');
  } catch (e) {
    console.log('✓ Index already exists.');
  }

  console.log('✅ Migration completed successfully!');

} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}

