import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cashopia - Financial Tracker',
  description: 'Track your household finances with ease',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

