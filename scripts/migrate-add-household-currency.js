const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '..', 'data', 'cashopia.db');
const db = new Database(dbPath);

console.log('Starting migration: Add currency to households...');

try {
  // Check if households table has currency column
  const columns = db.prepare(`PRAGMA table_info(households)`).all();
  const hasCurrency = columns.some(col => col.name === 'currency');

  if (!hasCurrency) {
    console.log('Adding currency column to households table...');
    db.exec(`ALTER TABLE households ADD COLUMN currency TEXT DEFAULT 'USD';`);
    console.log('✓ Added currency column to households');
  } else {
    console.log('✓ Households table already has currency column');
  }

  console.log('\n✅ Migration completed successfully!');
  console.log('\nHouseholds can now have a default currency.');
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

