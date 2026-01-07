# Changelog

All notable changes to Cashopia will be documented in this file.

## [2.0.0] - 2026-01-07

### 🚀 Major Updates

#### Framework Upgrades
- **Next.js**: Upgraded from 14.2.15 to 15.1.0
  - Latest performance improvements
  - Enhanced server actions
  - Improved caching strategies
  - Better build optimization

- **React**: Upgraded from 18.3.1 to 19.0.0
  - New compiler optimizations
  - Improved concurrent features
  - Better error handling
  - Enhanced developer experience

#### Authentication Migration
- **Migrated from NextAuth to better-auth**
  - Modern, TypeScript-first authentication library
  - Simpler and more intuitive API
  - Built-in security features (password hashing, session management)
  - No provider wrapper needed - cleaner component tree
  - Full type safety across authentication layer
  - Better developer experience

### 🗑️ Removed

- `next-auth` package
- `bcryptjs` package (better-auth handles password hashing)
- `@types/bcryptjs`
- NextAuth configuration files
- NextAuth type definitions

### ➕ Added

- `better-auth` package (v1.1.1)
- `src/lib/auth-config.ts` - Server-side auth configuration
- `src/lib/auth-client.ts` - Client-side auth hooks
- `src/app/api/auth/[...all]/route.ts` - better-auth API handler
- `auth_sessions` database table for better-auth
- `auth_verification_tokens` database table for better-auth
- `MIGRATION_GUIDE.md` - Comprehensive migration documentation
- `CHANGELOG.md` - This file

### 🔄 Changed

**Authentication Flow:**
- Login/Register pages now use better-auth's simplified API
- Session hook changed from `status` to `isPending` flag
- Sign-in/sign-up methods now use dedicated functions
- Removed session provider wrapper (better-auth doesn't need it)

**Environment Variables:**
- `NEXTAUTH_URL` → `BETTER_AUTH_URL`
- `NEXTAUTH_SECRET` → `BETTER_AUTH_SECRET`
- Added `NEXT_PUBLIC_BETTER_AUTH_URL` for client-side auth

**Database:**
- Added new auth session tables
- Updated database initialization script
- New indexes for auth session lookups

**Components:**
- Updated all page components to use new `useSession` hook
- Simplified `SessionProvider` component
- Updated `Navbar` to use better-auth's `signOut`

### 📚 Documentation

- Updated README.md with new tech stack information
- Updated QUICKSTART.md with latest version numbers
- Updated PROJECT_STRUCTURE.md with auth changes
- Created comprehensive MIGRATION_GUIDE.md

### 🔧 Configuration

- Updated `docker-compose.yml` with new environment variables
- Updated `.env.example` files
- Updated database initialization script
- Enhanced Docker build process

## [1.0.0] - 2026-01-07

### Initial Release

#### Features

- 🔐 **User Authentication & Authorization**
  - Secure login and registration
  - Password hashing
  - Session management

- 👥 **Household Management**
  - Multi-user support
  - Role-based access (admin/member)
  - Invite system

- 💰 **Transaction Management**
  - CRUD operations
  - Manual transaction entry
  - Transaction categorization
  - Income and expense tracking

- 📊 **CSV Import**
  - Intelligent column detection
  - Customizable field mapping
  - Bulk import support
  - Preview before import
  - Save mapping templates

- 🎯 **Auto-Categorization**
  - 15+ default category patterns
  - Custom pattern creation
  - Pattern priority system
  - Smart transaction matching

- 💳 **Budget Management**
  - Set monthly/yearly budgets
  - Category-based budgets
  - Visual progress tracking
  - Budget alerts (color-coded)

- 📈 **Dashboard & Analytics**
  - Income vs expense summary
  - Spending by category (pie chart)
  - Daily trend analysis (line chart)
  - Recent transactions view
  - Customizable time periods (week/month/year)

#### Technical Stack

- Next.js 14 with App Router
- React 18
- TypeScript
- SQLite with better-sqlite3
- NextAuth for authentication
- TailwindCSS for styling
- Recharts for data visualization
- Docker & Docker Compose

#### Default Categories

**Income (3):**
- Salary
- Freelance
- Investment

**Expenses (12):**
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

---

## Version Format

Versions follow [Semantic Versioning](https://semver.org/):
- MAJOR version for incompatible API changes
- MINOR version for new functionality (backwards compatible)
- PATCH version for backwards compatible bug fixes

## Links

- [Repository](https://github.com/yourusername/cashopia)
- [Issues](https://github.com/yourusername/cashopia/issues)
- [Documentation](README.md)

