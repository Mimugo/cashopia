# Integrated Database Architecture

## Summary of Changes

The SQLite database is now **fully integrated** into the Next.js application. No more separate initialization scripts or Docker containers needed!

## 🎯 What Changed

### Before
```
┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  SQLite (file)  │
└─────────────────┘     └─────────────────┘
         ▲
         │
         │ Manual initialization
         │
┌─────────────────┐
│  init-db.js     │ ◀── Run manually
└─────────────────┘
```

**Problems**:
- Had to remember to run `npm run db:init`
- Separate Docker container for initialization
- Manual migration scripts
- Easy to forget steps
- More complex setup

### After
```
┌─────────────────────────────────────┐
│         Next.js App                 │
│  ┌───────────────────────────────┐ │
│  │   Auto-Migrations System      │ │
│  │  (runs on startup)            │ │
│  └───────────────────────────────┘ │
│              │                      │
│              ▼                      │
│  ┌───────────────────────────────┐ │
│  │   SQLite Database             │ │
│  │   (./data/cashopia.db)        │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Benefits**:
- ✅ Auto-initializes on startup
- ✅ Single Docker container
- ✅ Migrations run automatically
- ✅ Zero manual steps
- ✅ Simpler architecture

## 📁 New Files

### 1. `src/lib/db-migrations.ts`
- **Purpose**: Migration system
- **Contains**: All database schema definitions
- **Features**:
  - Migration tracking in `_migrations` table
  - Automatic migration detection and execution
  - Idempotent (safe to run multiple times)
  - Easy to add new migrations

### 2. `src/lib/startup.ts`
- **Purpose**: Application initialization
- **Contains**: Startup orchestration
- **Features**:
  - Ensures single initialization
  - Handles initialization errors
  - Thread-safe

### 3. `src/middleware.ts`
- **Purpose**: Request middleware
- **Contains**: Placeholder for future middleware
- **Features**: Currently just passes through

### 4. `DATABASE_SETUP.md`
- **Purpose**: Complete database documentation
- **Contains**: Setup guide, troubleshooting, best practices

## 🔄 Modified Files

### 1. `src/lib/db.ts`
**Before**:
```typescript
export function getDb() {
  if (!db) {
    db = new Database(dbPath);
  }
  return db;
}
```

**After**:
```typescript
import { getDatabase } from './db-migrations';

export function getDb() {
  return getDatabase(); // Uses migration system
}
```

### 2. `src/lib/auth-config.ts`
**Before**:
```typescript
const db = new Database(dbPath);
export const auth = betterAuth({ database: db });
```

**After**:
```typescript
import { getDatabase, initializeDatabase } from './db-migrations';

// Run migrations on module load
initializeDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});

export const auth = betterAuth({ database: getDatabase() });
```

**Key Change**: Migrations run when auth-config is first imported (which happens on server startup).

### 3. `docker-compose.yml`
**Before**:
```yaml
services:
  app:
    depends_on:
      - db-init  # Separate initialization container
  
  db-init:
    command: npm run db:init  # Manual initialization
```

**After**:
```yaml
services:
  app:
    # That's it! No db-init service needed
    command: npm run start
```

**Removed**:
- `db-init` service
- `depends_on` dependency
- Separate initialization step

### 4. `README.md`
Updated to remove manual initialization steps:
- Removed "Initialize the database" step
- Added note about auto-initialization
- Simplified setup instructions

## 🚀 How It Works

### Startup Sequence

1. **Next.js Starts**
   - Server begins initialization
   
2. **Auth Config Loads**
   - `src/lib/auth-config.ts` is imported
   - Triggers `initializeDatabase()`
   
3. **Migrations Run**
   - Checks `_migrations` table for applied migrations
   - Runs any pending migrations
   - Records applied migrations
   
4. **Database Ready**
   - Schema is up to date
   - App continues startup
   
5. **Server Ready**
   - Accepts requests

### Migration System

**Adding a New Migration**:
```typescript
// In src/lib/db-migrations.ts
const migrations = [
  {
    name: '001_initial_schema',
    up: (db) => { /* ... */ },
  },
  {
    name: '002_your_new_migration',  // Add here
    up: (db) => {
      db.exec(`
        ALTER TABLE transactions ADD COLUMN new_field TEXT;
        CREATE INDEX idx_new_field ON transactions(new_field);
      `);
    },
  },
];
```

**Restart the app** → Migration runs automatically!

### Migration Tracking

The `_migrations` table tracks what's been applied:

```sql
CREATE TABLE _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Example data:
```
id | name                | applied_at
---+---------------------+-------------------
 1 | 001_initial_schema  | 2024-01-07 10:15:00
 2 | 002_add_accounts    | 2024-01-07 10:15:01
```

## 📊 Developer Experience

### Development (Local)

**Before**:
```bash
npm install
npm run db:init      # Don't forget this!
npm run dev
```

**After**:
```bash
npm install
npm run dev          # Database auto-initializes
```

### Development (Docker)

**Before**:
```bash
docker-compose up --build
# Wait for db-init to complete
# Then app starts
```

**After**:
```bash
docker-compose up --build
# App starts immediately, database auto-initializes
```

### Production Deployment

**Before**:
```bash
# Deploy app
# SSH into server
npm run db:init      # Must run manually
npm start
```

**After**:
```bash
# Deploy app
npm start            # Database auto-initializes
```

## 🔧 Maintenance

### Checking Database Status

```bash
# View applied migrations
sqlite3 ./data/cashopia.db "SELECT * FROM _migrations ORDER BY applied_at;"
```

### Forcing Re-initialization

```bash
# Backup first!
cp ./data/cashopia.db ./data/backup.db

# Remove database
rm ./data/cashopia.db*

# Restart app - database recreates automatically
npm run dev
```

### Manual Migrations (if needed)

The old scripts still work if you need them:
```bash
node scripts/migrate-add-accounts.js
node scripts/add-new-categories.js
```

But they're **not required** for normal operation.

## ✅ Benefits Summary

### Simplified Architecture
- **1 Container** instead of 2
- **Zero config** instead of manual setup
- **Auto-everything** instead of manual steps

### Better Developer Experience
- No forgotten initialization steps
- Faster onboarding for new developers
- Less documentation to read
- More reliable setup

### Production Ready
- Automatic schema updates on deployment
- No manual intervention needed
- Safer (migrations tracked and versioned)
- Easier rollback if needed

### Maintainability
- All migrations in one file
- Clear migration history
- Easy to add new migrations
- TypeScript type safety

## 🎓 Learning Resources

- See `DATABASE_SETUP.md` for complete documentation
- See `src/lib/db-migrations.ts` for migration examples
- See `src/lib/auth-config.ts` for initialization pattern

## 🚨 Breaking Changes

None! The change is backward compatible:
- Existing databases work without changes
- Old scripts still work (but not needed)
- Data is preserved
- No migration needed for existing installations

## 🎉 Conclusion

The database is now a **first-class citizen** of the Next.js app. No more separate scripts, containers, or manual steps. Everything just works! 🚀

---

**Quick Start**:
```bash
npm install && npm run dev
```

That's it! The database is ready to go. ✨

