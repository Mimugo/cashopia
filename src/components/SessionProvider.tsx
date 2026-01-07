"use client";

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // better-auth doesn't need a provider wrapper
  return <>{children}</>;
}

