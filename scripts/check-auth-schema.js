const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../data/cashopia.db');
const db = new Database(dbPath);

console.log('Checking better-auth required tables...\n');

const requiredTables = ['user', 'account', 'session', 'verification'];
const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
const tableNames = existingTables.map(t => t.name);

console.log('Existing tables:', tableNames.join(', '));
console.log('\nChecking required better-auth tables:');

let missingTables = [];
for (const table of requiredTables) {
  const exists = tableNames.includes(table);
  console.log(`  ${table}: ${exists ? '✓' : '✗ MISSING'}`);
  if (!exists) {
    missingTables.push(table);
  }
}

if (missingTables.length > 0) {
  console.log('\n⚠️  Missing tables:', missingTables.join(', '));
  console.log('Run: npm run db:init');
} else {
  console.log('\n✓ All better-auth tables exist!');
  
  // Check user table structure
  console.log('\nUser table columns:');
  const userColumns = db.prepare("PRAGMA table_info(user)").all();
  userColumns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
}

db.close();

