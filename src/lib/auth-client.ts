"use client";

import { createAuthClient } from "better-auth/react";

const baseURL =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL,
});

console.log("Better auth client url: ", baseURL);

export const { signIn, signUp, signOut, useSession } = authClient;
