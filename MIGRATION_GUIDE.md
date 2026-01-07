# Migration Guide: NextAuth to better-auth

This document outlines the migration from NextAuth.js to better-auth in Cashopia.

## What Changed

### 1. Dependencies

**Removed:**
- `next-auth` - Legacy authentication library
- `bcryptjs` - Replaced by better-auth's built-in hashing
- `@types/bcryptjs` - No longer needed

**Added:**
- `better-auth` - Modern, TypeScript-first authentication library

### 2. Version Updates

- **Next.js**: 14.2.15 → 15.1.0
- **React**: 18.3.1 → 19.0.0
- **React DOM**: 18.3.1 → 19.0.0

### 3. Authentication Architecture

#### Before (NextAuth)
```
NextAuth API Route → Credentials Provider → Manual password hashing → JWT sessions
```

#### After (better-auth)
```
better-auth API Route → Email/Password provider → Built-in security → Type-safe sessions
```

## Key Benefits of better-auth

1. **TypeScript-First**: Full type safety across the auth layer
2. **Modern API**: Simpler, more intuitive API design
3. **Built-in Security**: Automatic password hashing, session management
4. **Better DX**: Easier to configure and extend
5. **React 19 Ready**: Full support for latest React features
6. **No Provider Wrapper**: Cleaner component tree

## File Changes

### New Files

1. `src/lib/auth-config.ts` - better-auth server configuration
2. `src/lib/auth-client.ts` - better-auth client hooks
3. `src/app/api/auth/[...all]/route.ts` - better-auth API handler

### Deleted Files

1. `src/app/api/auth/[...nextauth]/route.ts` - Old NextAuth route
2. `src/types/next-auth.d.ts` - NextAuth type definitions

### Modified Files

1. `package.json` - Updated dependencies
2. `src/components/SessionProvider.tsx` - Simplified (no provider needed)
3. `src/components/Navbar.tsx` - Updated hooks
4. `src/app/login/page.tsx` - Updated sign-in logic
5. `src/app/register/page.tsx` - Updated sign-up logic
6. All page components - Updated `useSession` hook usage

## API Changes

### Session Hook

**Before (NextAuth):**
```typescript
import { useSession } from 'next-auth/react';

const { data: session, status } = useSession();
// status: 'loading' | 'authenticated' | 'unauthenticated'
```

**After (better-auth):**
```typescript
import { useSession } from '@/lib/auth-client';

const { data: session, isPending } = useSession();
// isPending: boolean
```

### Sign In

**Before (NextAuth):**
```typescript
import { signIn } from 'next-auth/react';

await signIn('credentials', {
  email,
  password,
  redirect: false,
});
```

**After (better-auth):**
```typescript
import { signIn } from '@/lib/auth-client';

await signIn.email({
  email,
  password,
});
```

### Sign Up

**Before (NextAuth):**
```typescript
// Manual user creation + sign in
const result = await registerUser(formData);
await signIn('credentials', { email, password });
```

**After (better-auth):**
```typescript
import { signUp, signIn } from '@/lib/auth-client';

await signUp.email({
  email,
  password,
  name,
});
await signIn.email({ email, password });
```

### Sign Out

**Before (NextAuth):**
```typescript
import { signOut } from 'next-auth/react';

await signOut({ callbackUrl: '/login' });
```

**After (better-auth):**
```typescript
import { signOut } from '@/lib/auth-client';

await signOut();
window.location.href = '/login';
```

## Database Changes

### New Tables

```sql
CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE auth_verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires INTEGER NOT NULL,
  PRIMARY KEY (identifier, token)
);
```

## Environment Variables

### Before (NextAuth)

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
```

### After (better-auth)

```bash
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-here
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

## Migration Steps for Existing Projects

If you have an existing Cashopia instance running with NextAuth:

### 1. Backup Your Data

```bash
cp data/cashopia.db data/cashopia.db.backup
```

### 2. Pull Latest Changes

```bash
git pull origin main
```

### 3. Update Dependencies

```bash
npm install
```

### 4. Run Database Migration

The new auth tables will be created automatically on next run:

```bash
npm run db:init
```

### 5. Update Environment Variables

Update your `.env.local` or `docker-compose.yml`:

```bash
# Remove these
NEXTAUTH_URL=...
NEXTAUTH_SECRET=...

# Add these
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=change-this-to-a-secure-random-string
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

### 6. Rebuild Docker Container

```bash
docker-compose down
docker-compose up --build
```

### 7. Test Authentication

1. Try logging in with existing credentials
2. Create a new test account
3. Verify all protected pages work
4. Test sign out functionality

## Troubleshooting

### Issue: "Cannot find module 'next-auth'"

**Solution**: Clear node_modules and reinstall
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Session not persisting

**Solution**: Clear browser cookies and local storage, then sign in again

### Issue: Auth tables not created

**Solution**: Run database initialization manually
```bash
npm run db:init
```

### Issue: Build errors with React 19

**Solution**: Ensure all React-related packages are using version 19
```bash
npm list react react-dom
```

## Rollback Instructions

If you need to rollback to NextAuth:

```bash
git checkout <previous-commit-hash>
npm install
npm run db:init
docker-compose up --build
```

## Additional Resources

- [better-auth Documentation](https://better-auth.com)
- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading)
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)

## Support

For issues specific to the migration, please open an issue on the repository with:
- Error messages
- Steps to reproduce
- Your environment (OS, Node version, Docker version)

