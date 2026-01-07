# Database Setup Guide

## Overview

Cashopia uses SQLite as its database, which is now **fully integrated** into the Next.js application. The database automatically initializes and runs migrations on app startup.

## ✨ Key Features

- **Zero Configuration**: Database auto-initializes on first run
- **Auto Migrations**: Migrations run automatically when the app starts
- **Single Container**: No separate database container needed
- **File-Based**: All data stored in `./data/cashopia.db`
- **Version Control**: Migration history tracked in `_migrations` table

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server (database auto-initializes)
npm run dev
```

That's it! The database will be created at `./data/cashopia.db` automatically.

### Production (Docker)

```bash
# Build and start
docker-compose up --build

# The database will auto-initialize on first startup
```

### Production (Manual)

```bash
# Build
npm run build

# Start (database auto-initializes)
npm start
```

## 📁 Database Location

- **Development**: `./data/cashopia.db`
- **Docker**: `/app/data/cashopia.db` (mounted from `./data`)
- **Custom**: Set `DATABASE_URL` environment variable

## 🔄 How It Works

### Automatic Initialization

1. **App Starts**: Next.js server begins startup
2. **Auth Config Loads**: `src/lib/auth-config.ts` is imported
3. **Migrations Run**: `initializeDatabase()` executes automatically
4. **Schema Created**: All tables and indexes are created if needed
5. **Migration Tracking**: Applied migrations are recorded in `_migrations` table
6. **App Ready**: Server starts accepting requests

### Migration System

Migrations are defined in `src/lib/db-migrations.ts`:

```typescript
const migrations = [
  {
    name: '001_initial_schema',
    up: (db) => {
      // SQL to create tables, indexes, etc.
    },
  },
  // Add new migrations here...
];
```

### Adding New Migrations

To add a new migration:

1. **Edit** `src/lib/db-migrations.ts`
2. **Add** a new migration object to the `migrations` array:

```typescript
{
  name: '002_add_new_feature',
  up: (db: Database.Database) => {
    db.exec(`
      ALTER TABLE transactions ADD COLUMN new_column TEXT;
      CREATE INDEX idx_new_column ON transactions(new_column);
    `);
  },
},
```

3. **Restart** the app - migration runs automatically

The system will:
- Check if the migration has been applied
- Skip if already applied
- Run if new
- Record in `_migrations` table

## 🗄️ Database Schema

### Core Tables

- **user**: User accounts (better-auth)
- **session**: User sessions (better-auth)
- **households**: Financial households/families
- **household_members**: Members in each household
- **bank_accounts**: Bank accounts per household
- **transactions**: Financial transactions
- **categories**: Income/expense categories
- **budgets**: Budget limits
- **categorization_patterns**: Auto-categorization rules
- **csv_mappings**: CSV import configurations

### System Tables

- **_migrations**: Tracks applied migrations

### Full Schema

See `src/lib/db-migrations.ts` for the complete schema definition.

## 🛠️ Manual Scripts (Legacy)

While the database auto-initializes, you can still run migrations manually if needed:

```bash
# Initialize database (not needed, but available)
node scripts/init-db.js

# Run specific migrations
node scripts/migrate-add-accounts.js
node scripts/migrate-add-budget-month-start.js
node scripts/migrate-add-excluded-flag.js
node scripts/add-new-categories.js
```

**Note**: These are kept for backward compatibility but are not required in normal operation.

## 🔍 Checking Database

### View Migration Status

```bash
sqlite3 ./data/cashopia.db "SELECT * FROM _migrations;"
```

### View Tables

```bash
sqlite3 ./data/cashopia.db ".tables"
```

### Backup Database

```bash
cp ./data/cashopia.db ./data/cashopia-backup-$(date +%Y%m%d).db
```

## 🐛 Troubleshooting

### Database Locked Error

**Problem**: `database is locked` error

**Solution**: 
- Ensure only one instance of the app is running
- Check for zombie processes: `ps aux | grep node`
- Delete `./data/cashopia.db-shm` and `./data/cashopia.db-wal` files

### Migration Failed

**Problem**: App won't start after adding a migration

**Solution**:
1. Check logs for specific SQL error
2. Fix the migration SQL
3. Delete the failed migration from `_migrations` table:
   ```sql
   DELETE FROM _migrations WHERE name = 'your_migration_name';
   ```
4. Restart the app

### Reset Database

**Warning**: This will delete all data!

```bash
# Backup first!
cp ./data/cashopia.db ./data/backup.db

# Remove database
rm ./data/cashopia.db*

# Restart app - database will recreate from scratch
npm run dev
```

### Fresh Start in Docker

```bash
# Stop and remove containers
docker-compose down

# Remove database volume
rm -rf ./data/cashopia.db*

# Start fresh
docker-compose up --build
```

## 📊 Database Performance

### WAL Mode

The database uses Write-Ahead Logging (WAL) for better concurrency:

```sql
PRAGMA journal_mode = WAL;
```

Benefits:
- Readers don't block writers
- Writers don't block readers
- Better performance for concurrent access

### Indexes

All frequently queried columns are indexed:
- `household_id` on all tables
- `date` on transactions
- `category_id` on transactions
- `excluded_from_reports` on transactions
- And more...

## 🔐 Security Notes

### Production Checklist

- [ ] Set strong `BETTER_AUTH_SECRET` environment variable
- [ ] Restrict file permissions on `./data/cashopia.db`
- [ ] Enable database encryption (optional)
- [ ] Regular backups
- [ ] Monitor database size

### File Permissions

```bash
# Restrict database file permissions
chmod 600 ./data/cashopia.db
chmod 700 ./data
```

## 📈 Monitoring

### Database Size

```bash
du -h ./data/cashopia.db
```

### Query Performance

Enable query logging in development:

```typescript
// In src/lib/db-migrations.ts
db.on('trace', (sql) => console.log('SQL:', sql));
```

### Connection Pool

SQLite uses a single connection per database file. Better-sqlite3 is synchronous and thread-safe.

## 🚢 Deployment

### Docker Production

```yaml
# docker-compose.yml
services:
  app:
    volumes:
      - ./data:/app/data  # Database persists here
    environment:
      - DATABASE_URL=/app/data/cashopia.db
```

### Cloud Deployment

**Persistent Volume Required**: The `./data` directory must be persistent storage.

Examples:
- **AWS**: Use EBS volume
- **GCP**: Use Persistent Disk
- **Azure**: Use Azure Disk
- **DigitalOcean**: Use Block Storage

**Note**: SQLite is great for single-server deployments. For multi-server, consider PostgreSQL.

## ✅ Benefits of Integrated Setup

### Before (Separate Scripts)
- ❌ Had to run `npm run db:init` manually
- ❌ Separate Docker container for initialization
- ❌ Migration scripts run separately
- ❌ Easy to forget to initialize
- ❌ More complex docker-compose

### After (Integrated)
- ✅ Auto-initializes on startup
- ✅ Single Docker container
- ✅ Migrations run automatically
- ✅ Impossible to forget
- ✅ Simpler architecture
- ✅ Better developer experience

## 📚 Additional Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Better-SQLite3 Documentation](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
- [Next.js Database Integration](https://nextjs.org/docs/app/building-your-application/data-fetching)

## 🆘 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f app`
2. Verify database file exists: `ls -la ./data/`
3. Check migration status: `sqlite3 ./data/cashopia.db "SELECT * FROM _migrations;"`
4. Review this documentation
5. Check issue tracker

---

**Summary**: The database now automatically initializes and migrates on app startup. No manual steps required! 🎉

