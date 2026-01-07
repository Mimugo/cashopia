const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '..', 'data', 'cashopia.db');
const db = new Database(dbPath);

console.log('Starting migration: Add accounts support...');

try {
  // Check if bank_accounts table already exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='bank_accounts'
  `).get();

  if (!tableExists) {
    console.log('Creating bank_accounts table...');
    db.exec(`
      CREATE TABLE bank_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        account_type TEXT NOT NULL CHECK(account_type IN ('checking', 'savings', 'credit_card', 'investment', 'other')),
        institution TEXT,
        account_number_last4 TEXT,
        balance REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
      );
    `);
    console.log('✓ Created bank_accounts table');
  } else {
    console.log('✓ bank_accounts table already exists');
  }

  // Check if account_balance_history table exists
  const historyExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='account_balance_history'
  `).get();

  if (!historyExists) {
    console.log('Creating account_balance_history table...');
    db.exec(`
      CREATE TABLE account_balance_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        balance REAL NOT NULL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE
      );
    `);
    console.log('✓ Created account_balance_history table');
  } else {
    console.log('✓ account_balance_history table already exists');
  }

  // Check if transactions table has account_id column
  const columns = db.prepare(`PRAGMA table_info(transactions)`).all();
  const hasAccountId = columns.some(col => col.name === 'account_id');
  const hasBalanceAfter = columns.some(col => col.name === 'balance_after');

  if (!hasAccountId || !hasBalanceAfter) {
    console.log('Adding new columns to transactions table...');
    
    if (!hasAccountId) {
      db.exec(`ALTER TABLE transactions ADD COLUMN account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL;`);
      console.log('✓ Added account_id column to transactions');
    }
    
    if (!hasBalanceAfter) {
      db.exec(`ALTER TABLE transactions ADD COLUMN balance_after REAL;`);
      console.log('✓ Added balance_after column to transactions');
    }
  } else {
    console.log('✓ Transactions table already has account columns');
  }

  // Check if csv_mappings has balance_column
  const csvColumns = db.prepare(`PRAGMA table_info(csv_mappings)`).all();
  const hasBalanceColumn = csvColumns.some(col => col.name === 'balance_column');

  if (!hasBalanceColumn) {
    console.log('Adding balance_column to csv_mappings...');
    db.exec(`ALTER TABLE csv_mappings ADD COLUMN balance_column TEXT;`);
    console.log('✓ Added balance_column to csv_mappings');
  } else {
    console.log('✓ csv_mappings already has balance_column');
  }

  // Create indexes
  console.log('Creating indexes...');
  
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);`,
    `CREATE INDEX IF NOT EXISTS idx_bank_accounts_household ON bank_accounts(household_id);`,
    `CREATE INDEX IF NOT EXISTS idx_balance_history_account ON account_balance_history(account_id);`
  ];

  for (const indexSql of indexes) {
    db.exec(indexSql);
  }
  console.log('✓ Created indexes');

  console.log('\n✅ Migration completed successfully!');
  console.log('\nYou can now:');
  console.log('  1. Create bank accounts via /accounts');
  console.log('  2. Import transactions with account selection');
  console.log('  3. Track account balances from CSV imports');
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

