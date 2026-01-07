import Database from 'better-sqlite3';
import path from 'path';

// This file should ONLY be imported on the server side
if (typeof window !== 'undefined') {
  throw new Error('db.ts should not be imported on the client side');
}

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'data/cashopia.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Household {
  id: number;
  name: string;
  currency: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: number;
  household_id: number;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface Category {
  id: number;
  household_id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  created_at: string;
}

export interface BankAccount {
  id: number;
  household_id: number;
  name: string;
  account_type: 'checking' | 'savings' | 'credit_card' | 'investment' | 'other';
  institution: string | null;
  account_number_last4: string | null;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  household_id: number;
  account_id: number | null;
  category_id: number | null;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  balance_after: number | null;
  import_batch_id: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AccountBalanceHistory {
  id: number;
  account_id: number;
  balance: number;
  recorded_at: string;
}

export interface CsvMapping {
  id: number;
  household_id: number;
  name: string;
  date_column: string;
  description_column: string;
  amount_column: string;
  type_column: string | null;
  date_format: string;
  delimiter: string;
  has_header: boolean;
  created_at: string;
}

export interface CategorizationPattern {
  id: number;
  household_id: number;
  category_id: number;
  pattern: string;
  priority: number;
  is_default: boolean;
  created_at: string;
}

export interface Budget {
  id: number;
  household_id: number;
  category_id: number;
  amount: number;
  period: 'monthly' | 'yearly';
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

