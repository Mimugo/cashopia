# better-auth Quick Reference

Quick reference guide for using better-auth in Cashopia.

## 📦 Imports

```typescript
// Client-side (in components)
import { useSession, signIn, signUp, signOut } from '@/lib/auth-client';

// Server-side (in server actions)
import { auth } from '@/lib/auth-config';
```

## 🔐 Client-Side Authentication

### Get Current Session

```typescript
'use client';

import { useSession } from '@/lib/auth-client';

export default function MyComponent() {
  const { data: session, isPending } = useSession();
  
  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Please log in</div>;
  
  return <div>Hello, {session.user.name}!</div>;
}
```

### Sign In

```typescript
import { signIn } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

const router = useRouter();

// Email/Password sign in
const handleSignIn = async () => {
  try {
    const result = await signIn.email({
      email: 'user@example.com',
      password: 'password123',
    });
    
    if (result.error) {
      console.error('Sign in failed:', result.error);
    } else {
      router.push('/dashboard');
      router.refresh(); // Important: refresh to update session
    }
  } catch (error) {
    console.error('Sign in error:', error);
  }
};
```

### Sign Up

```typescript
import { signUp } from '@/lib/auth-client';

const handleSignUp = async () => {
  try {
    const result = await signUp.email({
      email: 'newuser@example.com',
      password: 'password123',
      name: 'John Doe',
    });
    
    if (result.error) {
      console.error('Sign up failed:', result.error);
    } else {
      // User created successfully
      // Optionally sign in automatically
      await signIn.email({
        email: 'newuser@example.com',
        password: 'password123',
      });
    }
  } catch (error) {
    console.error('Sign up error:', error);
  }
};
```

### Sign Out

```typescript
import { signOut } from '@/lib/auth-client';

const handleSignOut = async () => {
  await signOut();
  window.location.href = '/login';
};
```

## 🖥️ Server-Side Authentication

### Get Session in Server Component

```typescript
import { auth } from '@/lib/auth-config';
import { cookies } from 'next/headers';

export default async function ServerComponent() {
  const session = await auth.api.getSession({
    headers: await cookies(),
  });
  
  if (!session) {
    return <div>Not authenticated</div>;
  }
  
  return <div>User ID: {session.user.id}</div>;
}
```

### Protect Server Actions

```typescript
'use server';

import { auth } from '@/lib/auth-config';
import { cookies } from 'next/headers';

export async function myServerAction() {
  const session = await auth.api.getSession({
    headers: await cookies(),
  });
  
  if (!session) {
    return { error: 'Unauthorized' };
  }
  
  // Your protected logic here
  const userId = session.user.id;
  // ...
}
```

### Protect API Routes

```typescript
import { auth } from '@/lib/auth-config';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  return NextResponse.json({ data: 'protected data' });
}
```

## 📊 Session Object Structure

```typescript
{
  user: {
    id: string;           // User ID
    email: string;        // User email
    name: string;         // User name
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
  session: {
    id: string;           // Session ID
    userId: string;       // User ID
    expiresAt: Date;      // Expiration date
  }
}
```

## 🔒 Middleware Protection (Optional)

Create `middleware.ts` in project root:

```typescript
import { auth } from '@/lib/auth-config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Skip auth check for public routes
  if (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register') ||
    request.nextUrl.pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }
  
  // Check session
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/transactions/:path*',
    '/budgets/:path*',
    '/import/:path*',
    '/household/:path*',
  ],
};
```

## 🎨 Common Patterns

### Loading State

```typescript
const { data: session, isPending } = useSession();

if (isPending) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );
}
```

### Protected Component

```typescript
'use client';

import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login');
    }
  }, [isPending, session, router]);
  
  if (isPending) return <div>Loading...</div>;
  if (!session) return null;
  
  return <div>Protected content</div>;
}
```

### User Avatar/Profile

```typescript
const { data: session } = useSession();

return (
  <div className="flex items-center space-x-3">
    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
      <span className="text-white font-semibold">
        {session?.user.name?.charAt(0).toUpperCase()}
      </span>
    </div>
    <div>
      <p className="font-medium">{session?.user.name}</p>
      <p className="text-sm text-gray-500">{session?.user.email}</p>
    </div>
  </div>
);
```

## 🔧 Configuration

### Server Config (`src/lib/auth-config.ts`)

```typescript
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  database: sqliteAdapter, // Your database adapter
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // 1 day
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});
```

### Client Config (`src/lib/auth-client.ts`)

```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

## 🌍 Environment Variables

```bash
# Server-side (available in server components and API routes)
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000

# Client-side (available in browser)
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

## 🐛 Debugging

### Check Session in Browser Console

```javascript
// In browser console
fetch('/api/auth/session')
  .then(res => res.json())
  .then(console.log);
```

### Common Issues

1. **Session not persisting**
   - Clear cookies and local storage
   - Check environment variables
   - Verify database tables exist

2. **"Unauthorized" errors**
   - Ensure session is being passed correctly
   - Check if session has expired
   - Verify auth middleware configuration

3. **TypeScript errors**
   - Run `npm install` to update types
   - Restart TypeScript server in VS Code

## 📚 Additional Resources

- [better-auth Documentation](https://better-auth.com)
- [API Reference](https://better-auth.com/docs/api)
- [Examples](https://better-auth.com/docs/examples)

---

**Quick Tip**: Keep this file open while developing for easy reference! 📖

