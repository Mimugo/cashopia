/**
 * Database migrations system
 * Automatically runs migrations on app startup
 */

// This file should ONLY be imported on the server side
if (typeof window !== "undefined") {
  throw new Error("db-migrations.ts should not be imported on the client side");
}

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath =
  process.env.DATABASE_URL || path.join(process.cwd(), "data", "cashopia.db");

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

// Track which migrations have been applied
function ensureMigrationsTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function isMigrationApplied(db: Database.Database, name: string): boolean {
  const result = db
    .prepare("SELECT id FROM _migrations WHERE name = ?")
    .get(name);
  return !!result;
}

function markMigrationApplied(db: Database.Database, name: string) {
  db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(name);
}

// Migration definitions
const migrations = [
  {
    name: "001_initial_schema",
    up: (db: Database.Database) => {
      console.log("Running migration: 001_initial_schema");

      db.exec(`
        -- Users table (compatible with better-auth)
        CREATE TABLE IF NOT EXISTS user (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          emailVerified INTEGER DEFAULT 0,
          name TEXT,
          image TEXT,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );
        
        -- Account table for better-auth
        CREATE TABLE IF NOT EXISTS account (
          id TEXT PRIMARY KEY,
          accountId TEXT NOT NULL,
          providerId TEXT NOT NULL,
          userId TEXT NOT NULL,
          accessToken TEXT,
          refreshToken TEXT,
          idToken TEXT,
          accessTokenExpiresAt INTEGER,
          refreshTokenExpiresAt INTEGER,
          scope TEXT,
          password TEXT,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
        );
        
        -- Session table for better-auth
        CREATE TABLE IF NOT EXISTS session (
          id TEXT PRIMARY KEY,
          expiresAt INTEGER NOT NULL,
          token TEXT NOT NULL UNIQUE,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          ipAddress TEXT,
          userAgent TEXT,
          userId TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
        );
        
        -- Verification table for better-auth
        CREATE TABLE IF NOT EXISTS verification (
          id TEXT PRIMARY KEY,
          identifier TEXT NOT NULL,
          value TEXT NOT NULL,
          expiresAt INTEGER NOT NULL,
          createdAt INTEGER,
          updatedAt INTEGER
        );
        
        -- Households table
        CREATE TABLE IF NOT EXISTS households (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          currency TEXT DEFAULT 'USD',
          budget_month_start_day INTEGER DEFAULT 1 NOT NULL,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES user(id) ON DELETE CASCADE
        );
        
        -- Bank Accounts table
        CREATE TABLE IF NOT EXISTS bank_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          household_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          account_type TEXT NOT NULL,
          institution TEXT,
          account_number_last4 TEXT,
          balance REAL DEFAULT 0 NOT NULL,
          currency TEXT DEFAULT 'USD' NOT NULL,
          is_active BOOLEAN DEFAULT 1 NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
        );
        
        -- Account Balance History table
        CREATE TABLE IF NOT EXISTS account_balance_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          balance REAL NOT NULL,
          recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE
        );
        
        -- Household members table
        CREATE TABLE IF NOT EXISTS household_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          household_id INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'member')),
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
          UNIQUE(household_id, user_id)
        );
        
        -- Categories table
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          household_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
          color TEXT DEFAULT '#3B82F6',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
        );
        
        -- Transactions table
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          household_id INTEGER NOT NULL,
          account_id INTEGER,
          category_id INTEGER,
          date DATE NOT NULL,
          description TEXT NOT NULL,
          amount REAL NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
          balance_after REAL,
          excluded_from_reports BOOLEAN DEFAULT 0 NOT NULL,
          import_batch_id INTEGER,
          created_by TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES user(id) ON DELETE CASCADE
        );
        
        -- CSV Import mappings table
        CREATE TABLE IF NOT EXISTS csv_mappings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          household_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          date_column TEXT NOT NULL,
          description_column TEXT NOT NULL,
          amount_column TEXT NOT NULL,
          type_column TEXT,
          balance_column TEXT,
          date_format TEXT DEFAULT 'YYYY-MM-DD',
          delimiter TEXT DEFAULT ',',
          has_header BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
        );
        
        -- Budgets table
        CREATE TABLE IF NOT EXISTS budgets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          household_id INTEGER NOT NULL,
          category_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          period TEXT NOT NULL CHECK(period IN ('monthly', 'yearly')),
          start_date DATE NOT NULL,
          end_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );
        
        -- Categorization patterns table
        CREATE TABLE IF NOT EXISTS categorization_patterns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          household_id INTEGER NOT NULL,
          category_id INTEGER NOT NULL,
          pattern TEXT NOT NULL,
          priority INTEGER DEFAULT 0,
          is_default BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);
        CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_household ON transactions(household_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
        CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_excluded ON transactions(excluded_from_reports);
        CREATE INDEX IF NOT EXISTS idx_categories_household ON categories(household_id);
        CREATE INDEX IF NOT EXISTS idx_budgets_household ON budgets(household_id);
        CREATE INDEX IF NOT EXISTS idx_bank_accounts_household ON bank_accounts(household_id);
        CREATE INDEX IF NOT EXISTS idx_balance_history_account ON account_balance_history(account_id);
        CREATE INDEX IF NOT EXISTS idx_session_userId ON session(userId);
        CREATE INDEX IF NOT EXISTS idx_account_userId ON account(userId);
      `);

      console.log("✓ Initial schema created");
    },
  },
];

// Run all pending migrations
export async function runMigrations() {
  console.log("🔄 Checking database migrations...");

  const db = getDatabase();
  ensureMigrationsTable(db);

  let migrationsRun = 0;

  for (const migration of migrations) {
    if (!isMigrationApplied(db, migration.name)) {
      try {
        migration.up(db);
        markMigrationApplied(db, migration.name);
        migrationsRun++;
        console.log(`✅ Applied migration: ${migration.name}`);
      } catch (error) {
        console.error(`❌ Failed to apply migration ${migration.name}:`, error);
        throw error;
      }
    } else {
      console.log(
        `⏭️  Skipping migration: ${migration.name} (already applied)`
      );
    }
  }

  if (migrationsRun === 0) {
    console.log("✅ Database is up to date");
  } else {
    console.log(`✅ Applied ${migrationsRun} migration(s)`);
  }

  return migrationsRun;
}

// Initialize database (run migrations)
export async function initializeDatabase() {
  try {
    await runMigrations();
    return { success: true };
  } catch (error) {
    console.error("Failed to initialize database:", error);
    return { success: false, error };
  }
}
