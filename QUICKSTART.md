# Cashopia - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Start the Application

```bash
docker-compose up --build
```

Wait for the build to complete (first time takes 2-3 minutes). You'll see:
```
app_1  | ▲ Next.js 15.1.0
app_1  | - Local:        http://localhost:3000
```

### Step 2: Create Your Account

1. Open `http://localhost:3000` in your browser
2. Click "Register"
3. Fill in:
   - Your name
   - Email address
   - Password (min 6 characters)
   - Household name (e.g., "Smith Family")
4. Click "Create account"

You'll be automatically logged in! 🎉

### Step 3: Start Tracking

**Option A: Add Transactions Manually**
1. Click "Transactions" in the top menu
2. Click "Add Transaction"
3. Enter details and click "Create"

**Option B: Import from CSV**
1. Click "Import CSV" in the top menu
2. Upload your bank statement CSV
3. Review the auto-detected column mappings
4. Click "Continue" → "Import Transactions"

## 📊 Key Features Overview

### Dashboard
- View income vs expenses
- See spending by category (pie chart)
- Track daily trends (line chart)
- Review recent transactions

### Transactions
- Add/edit/delete transactions
- Automatic categorization
- Filter by date, category, type

### CSV Import
- Intelligent column detection
- Save mapping templates for reuse
- Bulk import hundreds of transactions
- Preview before importing

### Budgets
- Set monthly or yearly budgets per category
- Visual progress bars
- Color-coded warnings (green → yellow → red)
- See remaining budget at a glance

### Household
- Invite family members
- Multiple users share the same data
- Role-based access (admin/member)

## 🎯 Example Workflow

### New User Journey

1. **Register** → Create account with household name
2. **Import** → Upload bank CSV with last 3 months
3. **Review** → Check transactions on Dashboard
4. **Categorize** → Edit any miscategorized transactions
5. **Budget** → Set budgets for top spending categories
6. **Track** → Monitor spending throughout the month
7. **Invite** → Add family members to collaborate

## 💡 Tips & Tricks

### Better Auto-Categorization

The app learns from patterns. If transactions contain:
- "STARBUCKS" → Auto-categorized as Dining
- "SHELL GAS" → Auto-categorized as Transportation
- "NETFLIX" → Auto-categorized as Entertainment

### CSV Import Best Practices

Your CSV should have these columns (names can vary):
- **Date**: Transaction date
- **Description**: Merchant/payee name
- **Amount**: Transaction amount
- **Type** (optional): Income/Expense/Debit/Credit

Common formats supported:
- Bank of America
- Chase
- Wells Fargo
- Most online banking exports

### Budget Management

Start with these categories:
1. **Groceries** - Track food spending
2. **Dining** - Restaurants and takeout
3. **Transportation** - Gas, parking, rideshares
4. **Utilities** - Bills and subscriptions

Review monthly and adjust as needed.

## 🔧 Common Commands

```bash
# Start application
docker-compose up

# Start in background
docker-compose up -d

# Stop application
docker-compose down

# View logs
docker-compose logs -f app

# Rebuild after updates
docker-compose up --build

# Backup database
cp data/cashopia.db data/backup-$(date +%Y%m%d).db
```

## 📱 Mobile Access

Access from any device on your network:
1. Find your computer's IP (e.g., 192.168.1.100)
2. Open `http://192.168.1.100:3000` on mobile

## 🐛 Troubleshooting

**Problem**: Can't connect to `localhost:3000`
- **Solution**: Wait 30 seconds after starting, or check logs: `docker-compose logs`

**Problem**: "Database is locked"
- **Solution**: Restart: `docker-compose down && docker-compose up`

**Problem**: Port 3000 in use
- **Solution**: Edit `docker-compose.yml`, change `"3000:3000"` to `"3001:3000"`

**Problem**: CSV import fails
- **Solution**: Ensure CSV has headers and uses comma delimiter

## 📚 Next Steps

- [Full Documentation](README.md)
- Customize categories for your needs
- Set up budgets for all expense categories
- Invite household members
- Import historical transactions
- Review monthly reports

## 🎨 Default Categories

**Income (3)**: Salary, Freelance, Investment
**Expenses (12)**: Groceries, Dining, Transportation, Utilities, Rent/Mortgage, Healthcare, Entertainment, Shopping, Insurance, Education, Fitness, and Uncategorized

You can add custom categories as needed!

---

**Need Help?** Check the [full README](README.md) or open an issue.

