// Database connection verification script
// Tests Supabase client setup and type safety

import { supabase, checkDatabaseConnection } from './supabaseClient';

import type { BookSessionInsert } from './types';

/**
 * Verify database connection and type safety
 * This function tests that our Supabase client can connect and types work correctly
 */
export async function verifyDatabaseSetup(): Promise<{
  success: boolean;
  tests: Array<{
    name: string;
    passed: boolean;
    error?: string;
    duration?: number;
  }>;
}> {
  const tests: Array<{
    name: string;
    passed: boolean;
    error?: string;
    duration?: number;
  }> = [];

  // Test 1: Environment variables loaded
  try {
    const startTime = Date.now();

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    }

    tests.push({
      name: 'Environment variables loaded',
      passed: true,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    tests.push({
      name: 'Environment variables loaded',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 2: Database connection
  try {
    const startTime = Date.now();
    const connectionResult = await checkDatabaseConnection();

    if (!connectionResult.connected) {
      throw new Error(connectionResult.error || 'Connection failed');
    }

    tests.push({
      name: 'Database connection',
      passed: true,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    tests.push({
      name: 'Database connection',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 3: Type safety verification
  try {
    const startTime = Date.now();

    // Test that our types work correctly
    const testSession: BookSessionInsert = {
      status: 'active',
      current_stage: 'conversation',
      requirements: null,
    };

    // This should compile without errors if types are correct
    const query = supabase
      .from('book_sessions')
      .select('id, status, current_stage')
      .eq('status', 'active')
      .limit(1);

    // We don't execute the query, just verify it compiles
    if (query && testSession) {
      tests.push({
        name: 'Type safety verification',
        passed: true,
        duration: Date.now() - startTime,
      });
    }
  } catch (error) {
    tests.push({
      name: 'Type safety verification',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 4: Schema validation (if tables exist)
  try {
    const startTime = Date.now();

    // Try to query each table to verify schema
    const tableChecks = await Promise.allSettled([
      supabase.from('book_sessions').select('id').limit(1).single(),
      supabase.from('books').select('id').limit(1).single(),
      supabase.from('chapters').select('id').limit(1).single(),
      supabase.from('workflow_states').select('id').limit(1).single(),
    ]);

    // All queries should either succeed or fail with "no rows" - not schema errors
    const schemaErrors = tableChecks
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason)
      .filter(error =>
        error &&
        typeof error === 'object' &&
        'message' in error &&
        !error.message.includes('No rows') &&
        !error.message.includes('PGRST116')
      );

    if (schemaErrors.length > 0) {
      throw new Error(`Schema validation failed: ${schemaErrors[0].message}`);
    }

    tests.push({
      name: 'Schema validation',
      passed: true,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    tests.push({
      name: 'Schema validation',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  const allPassed = tests.every(test => test.passed);

  return {
    success: allPassed,
    tests,
  };
}

/**
 * Run verification and log results
 * Useful for development and debugging
 */
export async function runVerification(): Promise<void> {
  console.log('🔍 Verifying database setup...\n');

  const result = await verifyDatabaseSetup();

  result.tests.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    const duration = test.duration ? ` (${test.duration}ms)` : '';
    console.log(`${status} ${test.name}${duration}`);

    if (!test.passed && test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });

  console.log(`\n${result.success ? '✅ All tests passed!' : '❌ Some tests failed'}`);

  if (!result.success) {
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure .env.local contains valid SUPABASE_URL and SUPABASE_ANON_KEY');
    console.log('2. Run the migration: `supabase db push` or execute the SQL manually');
    console.log('3. Check Supabase project status and network connectivity');
  }
}

// Allow direct execution for testing
if (require.main === module) {
  runVerification().catch(console.error);
}