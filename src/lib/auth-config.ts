import { betterAuth } from "better-auth";
import { getDatabase, initializeDatabase } from "./db-migrations";

// This file should ONLY be imported on the server side
if (typeof window !== "undefined") {
  throw new Error("auth-config.ts should not be imported on the client side");
}

// Initialize database (runs migrations if needed)
// This runs synchronously during module load
initializeDatabase().catch((error) => {
  console.error("Failed to initialize database:", error);
  process.exit(1);
});

export const auth = betterAuth({
  database: getDatabase(),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "change-this-to-a-secure-random-string-in-production",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
