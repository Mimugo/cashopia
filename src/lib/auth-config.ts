import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import path from "path";

// This file should ONLY be imported on the server side
if (typeof window !== 'undefined') {
  throw new Error('auth-config.ts should not be imported on the client side');
}

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), "data/cashopia.db");

export const auth = betterAuth({
  database: new Database(dbPath),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  hooks: {
    user: {
      create: {
        before: async (user) => {
          // Ensure name is set from the request
          return user;
        },
      },
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || "change-this-to-a-secure-random-string-in-production",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;

