# Cashopia - Project Structure

## 📁 Complete File Overview

### Root Configuration Files

```
cashopia/
├── docker-compose.yml         # Docker orchestration configuration
├── Dockerfile                 # NextJS application container definition
├── package.json               # NPM dependencies and scripts
├── tsconfig.json              # TypeScript compiler configuration
├── next.config.js             # Next.js configuration (standalone output)
├── tailwind.config.ts         # TailwindCSS styling configuration
├── postcss.config.js          # PostCSS configuration for Tailwind
├── .gitignore                 # Git ignore rules
├── .dockerignore              # Docker build ignore rules
├── README.md                  # Full documentation
├── QUICKSTART.md              # Quick start guide
└── PROJECT_STRUCTURE.md       # This file
```

### Database & Scripts

```
scripts/
└── init-db.js                 # Database initialization script
                               # Creates all tables, indexes, and schema

data/                          # Created on first run
└── cashopia.db               # SQLite database (auto-created)
```

### Application Source Code

```
src/
├── app/                       # Next.js 15 App Router
│   ├── layout.tsx             # Root layout component
│   ├── page.tsx               # Home page (redirects to dashboard)
│   ├── globals.css            # Global styles and Tailwind imports
│   │
│   ├── api/
│   │   └── auth/
│   │       └── [...all]/
│   │           └── route.ts   # better-auth API handler
│   │
│   ├── actions/               # Server Actions (business logic)
│   │   ├── auth.ts            # User registration, household creation
│   │   ├── transactions.ts    # CRUD operations for transactions
│   │   ├── csv-import.ts      # CSV detection, parsing, importing
│   │   ├── budgets.ts         # Budget management and progress tracking
│   │   └── dashboard.ts       # Dashboard data aggregation
│   │
│   ├── login/
│   │   └── page.tsx           # Login page with credentials form
│   │
│   ├── register/
│   │   └── page.tsx           # Registration page with household setup
│   │
│   ├── dashboard/
│   │   ├── layout.tsx         # Dashboard layout with navbar
│   │   └── page.tsx           # Main dashboard with charts and summary
│   │
│   ├── transactions/
│   │   ├── layout.tsx         # Transactions layout
│   │   └── page.tsx           # Transaction list with CRUD modal
│   │
│   ├── import/
│   │   ├── layout.tsx         # Import layout
│   │   └── page.tsx           # CSV import wizard (4 steps)
│   │
│   ├── budgets/
│   │   ├── layout.tsx         # Budgets layout
│   │   └── page.tsx           # Budget cards with progress tracking
│   │
│   └── household/
│       ├── layout.tsx         # Household layout
│       └── page.tsx           # Household info and member management
│
├── components/
│   ├── Navbar.tsx             # Top navigation bar with menu items
│   └── SessionProvider.tsx   # Session provider wrapper (simplified)
│
└── lib/
    ├── db.ts                  # Database connection and TypeScript types
    ├── auth.ts                # Authentication helper functions
    ├── auth-config.ts         # better-auth server configuration
    ├── auth-client.ts         # better-auth client hooks
    └── categories.ts          # Category management and auto-categorization
```

## 🗄️ Database Schema

### Tables

**users**
- id, email, password_hash, name, created_at, updated_at
- Stores user accounts

**households**
- id, name, created_by, created_at, updated_at
- Represents family/household groups

**household_members**
- id, household_id, user_id, role, joined_at
- Junction table linking users to households

**categories**
- id, household_id, name, type, color, created_at
- Expense and income categories per household

**transactions**
- id, household_id, category_id, date, description, amount, type, import_batch_id, created_by
- Financial transactions

**csv_mappings**
- id, household_id, name, date_column, description_column, amount_column, type_column
- Saved CSV import configurations

**categorization_patterns**
- id, household_id, category_id, pattern, priority, is_default
- Rules for auto-categorizing transactions

**budgets**
- id, household_id, category_id, amount, period, start_date, end_date
- Budget limits per category

## 🔄 Data Flow

### Authentication Flow
```
User Login → better-auth API → Email/Password Provider → Database Lookup → Secure Session
```

### Transaction Creation
```
Client Form → Server Action → Database Insert → Auto-categorization → Success Response
```

### CSV Import Flow
```
Upload CSV → Parse/Detect Columns → User Maps Columns → Save Mapping → 
Batch Import → Auto-categorize Each Row → Store in DB
```

### Dashboard Data
```
Page Load → Server Action → Multiple DB Queries → Aggregate Data → 
Return to Client → Render Charts
```

## 🎨 UI Components by Page

### Dashboard (`/dashboard`)
- Summary cards (income, expenses, net, count)
- Pie chart (spending by category)
- Line chart (daily trend)
- Recent transactions table

### Transactions (`/transactions`)
- Transaction table with sorting
- Add/Edit modal with form
- Delete confirmation
- Category badges with colors

### Import (`/import`)
- File upload dropzone
- Step wizard (Upload → Map → Confirm → Complete)
- CSV preview table
- Saved mappings list

### Budgets (`/budgets`)
- Budget cards with progress bars
- Color-coded status (green/yellow/red)
- Add/Edit modal
- Period toggle (monthly/yearly)

### Household (`/household`)
- Household info card
- Members list with roles
- Invite modal

## 🔐 Security Features

1. **Password Hashing**: better-auth's built-in secure hashing
2. **Session Management**: Type-safe, secure session handling
3. **Authorization Checks**: Every server action validates user access
4. **Household Isolation**: Users only see their household's data
5. **SQL Injection Prevention**: Prepared statements with better-sqlite3
6. **CORS Protection**: Next.js built-in security
7. **Modern Auth**: better-auth provides enterprise-grade security out of the box

## 🚀 Performance Optimizations

1. **Database Indexes**: On foreign keys and frequently queried columns
2. **Server Components**: Most pages use React Server Components
3. **Standalone Output**: Optimized Docker image with only production files
4. **SQLite**: Fast, zero-config, embedded database
5. **Lazy Loading**: Charts loaded on demand

## 📦 Key Dependencies

### Production
- `next` (v15) - Full-stack React framework
- `react` (v19) - UI library
- `better-auth` - Modern, TypeScript-first authentication
- `better-sqlite3` - Fast SQLite driver
- `papaparse` - CSV parsing
- `recharts` - Data visualization
- `lucide-react` - Icon library
- `zod` - Runtime validation
- `date-fns` - Date utilities

### Development
- `typescript` - Type safety
- `tailwindcss` - Utility-first CSS
- `eslint` - Code linting
- `autoprefixer` - CSS post-processing

## 🔧 Development vs Production

### Development Mode
```bash
npm run dev
# - Hot reload enabled
# - Source maps available
# - Verbose logging
# - No optimizations
```

### Production Mode (Docker)
```bash
docker-compose up --build
# - Standalone output
# - Minified bundles
# - Optimized images
# - Production logging
```

## 📝 Customization Points

### Adding New Categories
Edit `src/lib/categories.ts` → `DEFAULT_PATTERNS` array

### Changing Database Location
Edit `docker-compose.yml` → `DATABASE_URL` environment variable

### Adding New Pages
1. Create `src/app/[page-name]/page.tsx`
2. Add layout if needed
3. Update navbar in `src/components/Navbar.tsx`

### Custom Categorization Rules
Add patterns via UI (automatically stored in DB) or edit defaults in code

## 🐳 Docker Architecture

### Services
- **app**: Next.js application (port 3000)
- **db-init**: One-time database initialization

### Volumes
- `./data:/app/data` - Database persistence
- `./src:/app/src` - Source code (development)

### Networks
- Default bridge network (services can communicate)

## 📊 Data Models

### User Model
```typescript
interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
  updated_at: string;
}
```

### Transaction Model
```typescript
interface Transaction {
  id: number;
  household_id: number;
  category_id: number | null;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  import_batch_id: number | null;
  created_by: number;
}
```

### Budget Model
```typescript
interface Budget {
  id: number;
  household_id: number;
  category_id: number;
  amount: number;
  period: 'monthly' | 'yearly';
  start_date: string;
  end_date: string | null;
}
```

## 🔄 Server Actions

All server actions are marked with `'use server'` directive and handle:
- Authentication verification
- Authorization checks
- Database operations
- Error handling
- Response formatting

## 🆕 Recent Major Updates

### v2.0.0 - Modern Stack Upgrade
- **Next.js 15**: Latest features and performance improvements
- **React 19**: Cutting-edge React capabilities
- **better-auth**: Modern, TypeScript-first authentication
  - Simpler API than NextAuth
  - Full type safety across auth layer
  - Built-in security features
  - Better developer experience
  - No provider wrapper needed

## 🎯 Future Enhancement Ideas

- [ ] Export transactions to CSV/PDF
- [ ] Recurring transactions
- [ ] Mobile app (React Native)
- [ ] Receipt photo upload
- [ ] Multi-currency support
- [ ] Financial reports (monthly/yearly)
- [ ] Spending trends and insights
- [ ] Budget alerts and notifications
- [ ] Category splitting for transactions
- [ ] Tags for flexible organization
- [ ] OAuth providers (Google, GitHub) via better-auth
- [ ] Two-factor authentication via better-auth
- [ ] Magic link authentication via better-auth

---

This structure provides a solid foundation for a production-ready financial tracking application with modern authentication!

