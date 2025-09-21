// Supabase client configuration for Book Agent application
// Following CLAUDE.md standards: typed interfaces, error handling, environment validation

import { createClient } from '@supabase/supabase-js';
import { getEnvironmentConfig } from '../config/environment';

import type { Database } from './types';
import type { DatabaseError } from '../../types';

/**
 * Supabase client configuration optimized for serverless execution
 * Includes connection pooling and proper authentication settings
 */
function createSupabaseClient() {
  const config = getEnvironmentConfig();

  const supabase = createClient<Database>(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY,
    {
      db: {
        schema: 'public',
      },
      auth: {
        // Enable session persistence for RLS user context
        persistSession: true,
        // Auto refresh enabled for proper RLS authentication
        autoRefreshToken: true,
        // Detect session from URL for OAuth flows
        detectSessionInUrl: true,
      },
      // Optimize for serverless execution
      realtime: {
        // Enable real-time subscriptions for live progress updates
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  );

  return supabase;
}

/**
 * Singleton Supabase client instance
 * Reused across application to avoid connection overhead
 */
export const supabase = createSupabaseClient();

/**
 * Type-safe database error handler
 * Converts Supabase errors to application DatabaseError format
 */
export function handleDatabaseError(
  error: unknown,
  operation: string,
  table?: string,
  query?: string
): DatabaseError {
  const timestamp = new Date().toISOString();

  if (error && typeof error === 'object' && 'message' in error) {
    return {
      name: 'DatabaseError',
      message: `Database ${operation} failed: ${(error as Error).message}`,
      code: 'code' in error ? String(error.code) : undefined,
      timestamp,
      operation,
      table,
      query,
      context: { originalError: error },
    };
  }

  return {
    name: 'DatabaseError',
    message: `Database ${operation} failed: Unknown error`,
    timestamp,
    operation,
    table,
    query,
    context: { originalError: error },
  };
}

/**
 * Database connection health check
 * Verifies Supabase connection and returns status
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
  latency?: number;
}> {
  try {
    const startTime = Date.now();

    // Simple query to test connection
    const { error } = await supabase
      .from('book_sessions')
      .select('id')
      .limit(1)
      .maybeSingle();

    const latency = Date.now() - startTime;

    if (error) {
      return {
        connected: false,
        error: error.message,
        latency,
      };
    }

    return {
      connected: true,
      latency,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown connection error',
    };
  }
}

/**
 * Execute database query with error handling and logging
 * Provides consistent error handling pattern for all database operations
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>,
  operation: string,
  table?: string
): Promise<T> {
  try {
    const { data, error } = await queryFn();

    if (error) {
      throw handleDatabaseError(error, operation, table);
    }

    if (data === null) {
      throw handleDatabaseError(
        new Error('Query returned null data'),
        operation,
        table
      );
    }

    return data;
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'DatabaseError') {
      throw error;
    }
    throw handleDatabaseError(error, operation, table);
  }
}

/**
 * Batch operation helper for multiple database operations
 * Provides transaction-like behavior for related operations
 */
export async function executeBatch<T>(
  operations: Array<() => Promise<T>>,
  operationName: string
): Promise<T[]> {
  try {
    // Execute all operations in parallel for better performance
    const results = await Promise.all(operations.map(op => op()));
    return results;
  } catch (error) {
    throw handleDatabaseError(error, `batch_${operationName}`);
  }
}

/**
 * Real-time subscription helper with error handling
 * Manages Supabase real-time subscriptions for live updates
 */
export function createSubscription(
  table: string,
  filter: string,
  callback: (payload: unknown) => void,
  onError?: (error: string) => void
) {
  const channel = supabase
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter,
      },
      (payload) => {
        try {
          callback(payload);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Subscription callback error';
          console.error(`Subscription error for ${table}:`, errorMessage);
          onError?.(errorMessage);
        }
      }
    )
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') {
        const errorMessage = `Failed to subscribe to ${table} changes: ${status}`;
        console.error(errorMessage);
        onError?.(errorMessage);
      }
    });

  return {
    unsubscribe: () => supabase.removeChannel(channel),
    channel,
  };
}

/**
 * Database migration status check
 * Verifies that required tables exist (migrations should be run via Supabase CLI)
 */
export async function checkMigrationStatus(): Promise<{
  tablesExist: boolean;
  missingTables: string[];
}> {
  const requiredTables = ['book_sessions', 'books', 'chapters', 'workflow_states'];
  const missingTables: string[] = [];

  for (const table of requiredTables) {
    try {
      await supabase.from(table).select('id').limit(1);
    } catch (error) {
      missingTables.push(table);
    }
  }

  return {
    tablesExist: missingTables.length === 0,
    missingTables,
  };
}

/**
 * Get current user for RLS context
 * Returns user ID or null for anonymous users
 */
export async function getCurrentUser(): Promise<{
  userId: string | null;
  isAnonymous: boolean;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  return {
    userId: user?.id || null,
    isAnonymous: !user,
  };
}

/**
 * Create authenticated Supabase client for service operations
 * Uses service role key for operations that bypass RLS
 */
export function createServiceClient() {
  const config = getEnvironmentConfig();

  // Note: This requires SUPABASE_SERVICE_ROLE_KEY in environment
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY required for service operations');
  }

  return createClient<Database>(
    config.SUPABASE_URL,
    serviceKey,
    {
      db: { schema: 'public' },
      auth: { persistSession: false },
    }
  );
}

/**
 * Test RLS policies are working correctly
 * Validates that data isolation is properly enforced
 */
export async function testRlsPolicies(): Promise<{
  success: boolean;
  tests: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
}> {
  try {
    const { data, error } = await supabase.rpc('test_rls_policies');

    if (error) {
      throw error;
    }

    const tests = (data || []) as Array<{ passed: boolean; name: string; details: string }>;
    const success = tests.every((test) => test.passed);

    return { success, tests };
  } catch (error) {
    return {
      success: false,
      tests: [{
        name: 'RLS policy test execution',
        passed: false,
        details: error instanceof Error ? error.message : 'Unknown error',
      }],
    };
  }
}

/**
 * Create a book session with proper user context
 * Handles both authenticated and anonymous users
 */
export async function createBookSession(requirements?: unknown): Promise<{
  sessionId: string;
  userId: string | null;
}> {
  const { userId } = await getCurrentUser();

  // Type assertion needed due to JSONB field complexity
  const insertData = {
    user_id: userId,
    requirements,
  } as any;

  const { data, error } = await supabase
    .from('book_sessions')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    throw handleDatabaseError(error, 'create_session', 'book_sessions');
  }

  if (!data) {
    throw handleDatabaseError(
      new Error('No data returned from insert'),
      'create_session',
      'book_sessions'
    );
  }

  return {
    sessionId: (data as { id: string }).id,
    userId,
  };
}

// Export types for external use
export type { Database } from './types';