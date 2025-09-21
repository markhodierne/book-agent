#!/usr/bin/env tsx
// Database connection test script
// Run with: npx tsx scripts/test-database.ts

import { runVerification } from '../lib/database/verify';
import { checkDatabaseConnection, testRlsPolicies } from '../lib/database';

async function main() {
  console.log('🔧 Book Agent Database Testing\n');

  try {
    // Test 1: Environment validation and basic connection
    console.log('1️⃣ Running database verification...');
    await runVerification();

    // Test 2: Connection latency
    console.log('\n2️⃣ Testing connection latency...');
    const connectionResult = await checkDatabaseConnection();
    if (connectionResult.connected) {
      console.log(`✅ Connected successfully (${connectionResult.latency}ms)`);
    } else {
      console.log(`❌ Connection failed: ${connectionResult.error}`);
      return;
    }

    // Test 3: RLS policies (if tables exist)
    console.log('\n3️⃣ Testing RLS policies...');
    try {
      const rlsResult = await testRlsPolicies();
      if (rlsResult.success) {
        console.log('✅ RLS policies working correctly');
        rlsResult.tests.forEach(test => {
          console.log(`  - ${test.name}: ${test.details}`);
        });
      } else {
        console.log('⚠️  RLS policies need attention:');
        rlsResult.tests.forEach(test => {
          const status = test.passed ? '✅' : '❌';
          console.log(`  ${status} ${test.name}: ${test.details}`);
        });
      }
    } catch (error) {
      console.log('⚠️  RLS test requires migrations to be run first');
      console.log('   Run: npx tsx scripts/run-migrations.ts');
    }

    console.log('\n🎉 Database testing complete!');

  } catch (error) {
    console.error('\n❌ Database test failed:');
    console.error(error instanceof Error ? error.message : error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your .env.local file has valid Supabase credentials');
    console.log('2. Verify your Supabase project is active');
    console.log('3. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are correct');
    process.exit(1);
  }
}

main().catch(console.error);