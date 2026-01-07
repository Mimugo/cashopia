import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This is a workaround to ensure database initialization
// Since middleware runs on edge runtime, we can't import db code directly
// Instead, we'll ensure initialization happens in API routes

export function middleware(request: NextRequest) {
  // Just pass through - initialization happens in layout.tsx
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

