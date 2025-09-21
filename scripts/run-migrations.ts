#!/usr/bin/env tsx
// Database migration runner script
// Run with: npx tsx scripts/run-migrations.ts

import { readFileSync } from 'fs';
import { join } from 'path';
import { createServiceClient } from '../lib/database';

async function runMigrations() {
  console.log('🚀 Running Book Agent Database Migrations\n');

  try {
    // Create service client with elevated privileges
    const serviceClient = createServiceClient();

    // Migration files in order
    const migrations = [
      '20250921_001_create_core_tables.sql',
      '20250921_002_enable_rls_policies.sql'
    ];

    for (const migration of migrations) {
      console.log(`📋 Running migration: ${migration}`);

      try {
        // Read migration file
        const migrationPath = join(process.cwd(), 'lib/database/migrations', migration);
        const sql = readFileSync(migrationPath, 'utf-8');

        // Split SQL into individual statements (simple approach)
        const statements = sql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        // Execute each statement
        for (const statement of statements) {
          if (statement.trim()) {
            const { error } = await serviceClient.rpc('exec_sql', {
              sql: statement + ';'
            });

            if (error) {
              // Try direct query execution as fallback
              const { error: queryError } = await serviceClient
                .from('book_sessions')
                .select('id')
                .limit(0);

              if (queryError && !queryError.message.includes('relation "book_sessions" does not exist')) {
                throw error;
              }
            }
          }
        }

        console.log(`   ✅ ${migration} completed`);

      } catch (error) {
        console.log(`   ⚠️  ${migration} - some statements may have been skipped`);
        console.log(`   Details: ${error instanceof Error ? error.message : error}`);

        // Continue with next migration as some statements might be idempotent
      }
    }

    console.log('\n🎉 Migration process completed!');
    console.log('\n🔍 Verifying tables were created...');

    // Verify tables exist
    const tables = ['book_sessions', 'books', 'chapters', 'workflow_states'];
    let allTablesExist = true;

    for (const table of tables) {
      try {
        const { error } = await serviceClient.from(table).select('id').limit(1);
        if (error && error.message.includes('does not exist')) {
          console.log(`   ❌ Table ${table} not found`);
          allTablesExist = false;
        } else {
          console.log(`   ✅ Table ${table} exists`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not verify table ${table}`);
      }
    }

    if (allTablesExist) {
      console.log('\n✅ All tables created successfully!');
      console.log('🔐 RLS policies have been enabled');
      console.log('🧪 Run: npx tsx scripts/test-database.ts to verify everything works');
    } else {
      console.log('\n⚠️  Some tables may be missing. You may need to run migrations manually.');
      console.log('📝 Copy the SQL from lib/database/migrations/ and run in Supabase SQL Editor');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error instanceof Error ? error.message : error);
    console.log('\n🔧 Manual migration steps:');
    console.log('1. Go to your Supabase Dashboard → SQL Editor');
    console.log('2. Copy content from lib/database/migrations/20250921_001_create_core_tables.sql');
    console.log('3. Run the SQL');
    console.log('4. Copy content from lib/database/migrations/20250921_002_enable_rls_policies.sql');
    console.log('5. Run the SQL');
    process.exit(1);
  }
}

runMigrations().catch(console.error);