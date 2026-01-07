/**
 * Application startup initialization
 * Runs database migrations and other startup tasks
 */

import { initializeDatabase } from './db-migrations';

let initialized = false;
let initializing = false;
let initPromise: Promise<void> | null = null;

export async function ensureInitialized() {
  // If already initialized, return immediately
  if (initialized) {
    return;
  }

  // If currently initializing, wait for it to complete
  if (initializing && initPromise) {
    await initPromise;
    return;
  }

  // Start initialization
  initializing = true;
  initPromise = (async () => {
    try {
      console.log('🚀 Initializing application...');
      
      // Run database migrations
      const result = await initializeDatabase();
      
      if (!result.success) {
        throw new Error('Database initialization failed');
      }
      
      initialized = true;
      console.log('✅ Application initialized successfully');
    } catch (error) {
      console.error('❌ Application initialization failed:', error);
      initializing = false;
      throw error;
    }
  })();

  await initPromise;
}

