# Troubleshooting Guide

## SQLite / better-sqlite3 Module Error

### Problem
```
Module not found: Can't resolve 'fs'
```
or
```
The "original" argument must be of type Function
```

### Solution

These errors occur when `better-sqlite3` (a Node.js native module) is being bundled for the browser. We've implemented several safeguards:

#### 1. **Webpack Configuration** (`next.config.js`)
```javascript
webpack: (config, { isServer }) => {
  if (!isServer) {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      'better-sqlite3': false,
    };
    config.externals = config.externals || [];
    config.externals.push('better-sqlite3');
  }
  return config;
},
serverComponentsExternalPackages: ['better-sqlite3'],
```

#### 2. **Server-Only Checks**
Both `db.ts` and `auth-config.ts` include runtime checks:
```javascript
if (typeof window !== 'undefined') {
  throw new Error('This file should not be imported on the client side');
}
```

#### 3. **Environment Variables**
Create `.env.local` in the project root:
```env
DATABASE_URL=./data/cashopia.db
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

### Steps to Fix

1. **Clear the Next.js cache**:
```bash
rm -rf .next
rm -rf node_modules/.cache
```

2. **Reinstall dependencies** (if needed):
```bash
rm -rf node_modules package-lock.json
npm install
```

3. **Create/verify `.env.local` file** with the variables above

4. **Reinitialize database**:
```bash
rm -rf data/
npm run db:init
```

5. **Start dev server**:
```bash
npm run dev
```

## Common Issues

### Issue: "auth-config.ts should not be imported on the client side"

**Cause**: You're importing server-side auth code in a client component.

**Solution**: 
- Use `@/lib/auth-client` for client components
- Use `@/lib/auth-config` ONLY in server components and API routes

**Example:**
```typescript
// ❌ Wrong (client component)
'use client';
import { auth } from '@/lib/auth-config'; // ERROR!

// ✅ Correct (client component)
'use client';
import { useSession, signIn } from '@/lib/auth-client';

// ✅ Correct (server component/API route)
import { auth } from '@/lib/auth-config';
```

### Issue: Database file not found

**Cause**: The `data/` directory doesn't exist or the database hasn't been initialized.

**Solution**:
```bash
mkdir -p data
npm run db:init
```

### Issue: Session not working

**Cause**: Environment variables not set properly.

**Solution**:
1. Verify `.env.local` exists with correct values
2. Restart dev server
3. Clear browser cookies for localhost:3000

### Issue: TypeScript errors after upgrade

**Cause**: Type definitions need to be regenerated.

**Solution**:
```bash
rm -rf node_modules/.cache
npm install
# Restart TypeScript server in VS Code: Cmd+Shift+P > "TypeScript: Restart TS Server"
```

## Verification Checklist

After fixing issues, verify:

- [ ] `npm run dev` starts without errors
- [ ] Can access http://localhost:3000
- [ ] Can register new account
- [ ] Can log in
- [ ] Can view dashboard
- [ ] No console errors in browser
- [ ] No webpack errors in terminal

## Architecture Notes

### Server vs Client Separation

```
Server-side ONLY:
├── src/lib/auth-config.ts     (better-auth server)
├── src/lib/db.ts               (better-sqlite3)
├── src/lib/auth.ts             (database queries)
└── src/app/actions/*.ts        (server actions)

Client-side SAFE:
├── src/lib/auth-client.ts      (better-auth/react)
└── src/app/**/**/page.tsx      (uses auth-client)

Both (API Routes):
└── src/app/api/auth/[...all]/route.ts  (marked with runtime: "nodejs")
```

### Database Connections

- **Server Actions**: Import from `@/lib/db` or `@/lib/auth`
- **Client Components**: Call server actions, never access DB directly
- **API Routes**: Import from `@/lib/auth-config`

## Still Having Issues?

1. Check the browser console for errors
2. Check the terminal for build errors
3. Verify all imports follow the server/client separation
4. Try Docker if local development is problematic:
   ```bash
   docker-compose up --build
   ```

## Getting Help

If you're still stuck:
1. Note the exact error message
2. Check which file is importing what
3. Verify your Node.js version: `node --version` (should be 20+)
4. Open an issue with:
   - Error message
   - Steps to reproduce
   - Your environment (OS, Node version)

