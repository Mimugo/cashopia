const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '..', 'data', 'cashopia.db');
const db = new Database(dbPath);

console.log('Fixing account balance calculations...\n');

try {
  // Get all accounts
  const accounts = db.prepare('SELECT * FROM bank_accounts').all();
  
  console.log(`Found ${accounts.length} accounts\n`);

  for (const account of accounts) {
    console.log(`Processing account: ${account.name} (ID: ${account.id})`);
    
    // Check if this account has an opening balance history entry
    const hasHistory = db.prepare(
      'SELECT COUNT(*) as count FROM account_balance_history WHERE account_id = ?'
    ).get(account.id);

    if (hasHistory.count === 0) {
      console.log(`  ⚠️  No balance history found`);
      
      // Get the earliest transaction for this account
      const firstTransaction = db.prepare(
        'SELECT * FROM transactions WHERE account_id = ? ORDER BY date ASC, created_at ASC LIMIT 1'
      ).get(account.id);

      if (firstTransaction) {
        console.log(`  📝 First transaction: ${firstTransaction.date} - ${firstTransaction.description}`);
        
        // Calculate what the opening balance should have been
        // Current balance - (all income - all expenses) = opening balance
        const totals = db.prepare(`
          SELECT 
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
          FROM transactions
          WHERE account_id = ?
        `).get(account.id);

        const openingBalance = account.balance - (totals.total_income - totals.total_expenses);
        
        console.log(`  💰 Current balance: ${account.balance}`);
        console.log(`  📊 Income: ${totals.total_income}, Expenses: ${totals.total_expenses}`);
        console.log(`  🎯 Calculated opening balance: ${openingBalance}`);
        
        // Insert the opening balance history entry dated just before the first transaction
        const historyDate = new Date(firstTransaction.date);
        historyDate.setDate(historyDate.getDate() - 1); // One day before first transaction
        
        db.prepare(
          'INSERT INTO account_balance_history (account_id, balance, recorded_at) VALUES (?, ?, ?)'
        ).run(account.id, openingBalance, historyDate.toISOString());
        
        console.log(`  ✅ Created opening balance history entry`);
      } else {
        // No transactions, just record the current balance as opening balance
        console.log(`  📝 No transactions found`);
        console.log(`  💰 Recording current balance as opening: ${account.balance}`);
        
        db.prepare(
          'INSERT INTO account_balance_history (account_id, balance) VALUES (?, ?)'
        ).run(account.id, account.balance);
        
        console.log(`  ✅ Created opening balance history entry`);
      }
    } else {
      console.log(`  ✅ Balance history already exists (${hasHistory.count} entries)`);
    }
    
    console.log('');
  }

  console.log('✅ All account balances have been fixed!\n');
  console.log('Summary:');
  console.log('- Opening balance history entries have been created for all accounts');
  console.log('- Balance reconciliation should now work correctly');
  console.log('- You can view balance details on the Accounts page');
  
} catch (error) {
  console.error('❌ Error fixing account balances:', error);
  process.exit(1);
} finally {
  db.close();
}

