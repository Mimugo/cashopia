# Cashopia - Household Financial Tracker

A comprehensive financial tracking application for households with budgeting, transaction management, and CSV import capabilities.

## Features

- **User Authentication** - Secure login and registration system
- **Household Management** - Create households and invite multiple users
- **Multi-Account Support** - Manage multiple bank accounts per household with balance tracking
- **Transaction Management** - Add, edit, and categorize transactions linked to specific accounts
- **CSV Import** - Import transactions from CSV files with intelligent column detection and balance tracking
- **Auto-Categorization** - Automatically categorize transactions based on patterns
- **Budgets** - Set and track budgets for different spending categories
- **Dashboard** - Visual overview of finances with charts, graphs, and account balances
- **Multi-user Support** - Multiple users per household with role-based access
- **Balance Reconciliation** - Compare stored balances with calculated balances from transactions

## Tech Stack

- **Frontend/Backend**: Next.js 15 with Server Actions
- **Database**: SQLite with better-sqlite3
- **Authentication**: better-auth (modern, TypeScript-first)
- **UI**: TailwindCSS + Recharts for data visualization
- **Container**: Docker + Docker Compose

## Prerequisites

- Docker and Docker Compose installed on your system
- At least 1GB of free disk space

## Getting Started

### 1. Clone and Setup

```bash
cd cashopia
```

### 2. Configure Environment Variables

The application comes with sensible defaults for Docker. For production, update the following in `docker-compose.yml`:

- `BETTER_AUTH_SECRET` - Generate a secure random string
- `BETTER_AUTH_URL` - Set to your production URL
- `NEXT_PUBLIC_BETTER_AUTH_URL` - Set to your production URL (must be publicly accessible)

### 3. Start the Application

```bash
# Build and start (database auto-initializes on first run)
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

The application will be available at `http://localhost:3000`

### 4. First-Time Setup

1. Navigate to `http://localhost:3000`
2. Click "Register" to create your first account
3. Enter your details and create a household name
4. You'll be automatically logged in and redirected to the dashboard

## Usage Guide

### Creating Your First Transaction

1. Click on "Transactions" in the navigation
2. Click "Add Transaction"
3. Fill in the date, description, amount, type (income/expense), and category
4. Click "Create"

### Importing Transactions from CSV

1. Click on "Import CSV" in the navigation
2. Upload your CSV file (bank statement export)
3. Review the auto-detected column mappings
4. Adjust mappings if needed
5. Preview and confirm the import
6. Transactions will be automatically categorized

### Setting Up Budgets

1. Click on "Budgets" in the navigation
2. Click "Add Budget"
3. Select a category (e.g., "Groceries")
4. Set the budget amount
5. Choose period (monthly or yearly)
6. Set the start date
7. Track your spending against the budget

### Managing Your Household

1. Click on "Household" in the navigation
2. View all household members
3. Click "Invite Member" to add new users
4. Enter their email (they must have an account first)

## Database

The SQLite database is stored in the `./data` directory on your host machine, which is mounted as a Docker volume. This means your data persists even if you restart or rebuild the containers.

### Database Location

- Container path: `/app/data/cashopia.db`
- Host path: `./data/cashopia.db`

### Backup Your Data

Simply copy the database file:

```bash
cp data/cashopia.db data/cashopia.db.backup
```

## Default Categories

The application comes with pre-configured categories:

**Income Categories:**
- Salary
- Freelance
- Investment

**Expense Categories:**
- Groceries
- Dining
- Transportation
- Utilities
- Rent/Mortgage
- Healthcare
- Entertainment
- Shopping
- Insurance
- Education
- Fitness

## Auto-Categorization Patterns

Transactions are automatically categorized based on keywords in the description. For example:

- "STARBUCKS" → Dining
- "WHOLE FOODS" → Groceries
- "UBER" → Transportation
- "NETFLIX" → Entertainment

You can add custom patterns for your specific needs.

## Development

### Running in Development Mode

If you want to run the application in development mode (without Docker):

```bash
# Install dependencies
npm install

# Start development server (database auto-initializes)
npm run dev
```

The application will be available at `http://localhost:3000`

**Note**: The database automatically initializes on first run. No manual setup required!

### Project Structure

```
cashopia/
├── src/
│   ├── app/
│   │   ├── actions/          # Server actions
│   │   ├── api/              # API routes (NextAuth)
│   │   ├── dashboard/        # Dashboard page
│   │   ├── transactions/     # Transactions page
│   │   ├── import/           # CSV import page
│   │   ├── budgets/          # Budgets page
│   │   ├── household/        # Household management
│   │   └── login/            # Authentication pages
│   ├── components/           # React components
│   ├── lib/                  # Utility functions
│   └── types/                # TypeScript types
├── scripts/
│   └── init-db.js           # Database initialization
├── data/                     # SQLite database (created on first run)
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## Docker Commands

```bash
# Start the application
docker-compose up

# Start in background
docker-compose up -d

# Stop the application
docker-compose down

# View logs
docker-compose logs -f

# Rebuild after code changes
docker-compose up --build

# Reset everything (including database)
docker-compose down -v
rm -rf data/
docker-compose up --build
```

## Troubleshooting

### Database locked error

If you get a "database is locked" error, make sure only one instance of the application is running:

```bash
docker-compose down
docker-compose up
```

### Port 3000 already in use

Change the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Host:Container
```

### Cannot connect to database

Ensure the data directory has proper permissions:

```bash
mkdir -p data
chmod 755 data
```

## Security Notes

- Change the `BETTER_AUTH_SECRET` before deploying to production
- Use HTTPS in production (update `BETTER_AUTH_URL` and `NEXT_PUBLIC_BETTER_AUTH_URL`)
- Regularly backup your database
- Keep Docker images updated
- better-auth provides built-in security features like password hashing and session management

## 📚 Documentation

### Getting Started
- **[QUICKSTART.md](QUICKSTART.md)** - Get running in 3 steps
- **[README.md](README.md)** - Complete documentation (you are here)

### Technical Documentation
- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - Technical deep dive and architecture
- **[AUTH_QUICK_REFERENCE.md](AUTH_QUICK_REFERENCE.md)** - Authentication patterns and code examples

### Upgrade Information
- **[UPGRADE_SUMMARY.md](UPGRADE_SUMMARY.md)** - Quick overview of v2.0 changes
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Detailed migration from NextAuth to better-auth
- **[CHANGELOG.md](CHANGELOG.md)** - Complete version history

## Recent Updates

### v2.0.0 - Authentication Migration

- **Upgraded to Next.js 15** and React 19 for latest features and performance
- **Migrated from NextAuth to better-auth** for modern, TypeScript-first authentication
- Improved security with better-auth's built-in password hashing and session management
- Simplified authentication code and better developer experience

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for details on the authentication changes.

## License

MIT

## Support

For issues and questions, please open an issue on the repository.

