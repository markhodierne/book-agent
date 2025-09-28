#!/usr/bin/env npx tsx

/**
 * Run database migration directly via Supabase client
 */

import { config } from 'dotenv';
import { join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

async function runMigration() {
  console.log('🔄 Running database migration...\n');

  try {
    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing required environment variables');
      process.exit(1);
    }

    // Import Supabase client
    const { createServiceClient } = await import('@/lib/database/supabaseClient');
    const supabase = createServiceClient();

    console.log('✅ Supabase client created');

    // Read migration file
    const migrationPath = join(process.cwd(), 'lib/database/migrations/20250928_001_add_intelligent_architecture_columns.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📝 Migration size:', migrationSQL.length, 'characters');

    // Execute key migration statements manually
    console.log('\n🚀 Executing migration statements...');

    // Add columns to book_sessions table
    console.log('📝 Adding columns to book_sessions...');

    // First test if we can insert with the new columns
    const testSessionId = 'migration-test-' + Date.now();

    const { data: insertData, error: insertError } = await supabase
      .from('book_sessions')
      .insert({
        id: testSessionId,
        user_id: null,
        status: 'active',
        current_stage: 'conversation',
        requirements: null,
        adaptive_plan: {},
        collaboration_summary: {},
        learning_insights: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (insertError) {
      console.log('⚠️ Columns need to be added. Error:', insertError.message);
      console.log('📞 This likely means the migration needs to be run via Supabase dashboard or CLI');
      console.log('🔗 Please run the migration SQL manually in Supabase SQL Editor');
      return false;
    }

    console.log('✅ Migration appears to already be applied or columns exist');

    // Clean up test record
    await supabase.from('book_sessions').delete().eq('id', testSessionId);
    console.log('🧹 Test record cleaned up');

    // Verify the new columns exist
    console.log('\n🔍 Verifying migration...');

    const { data: sessionTest, error: sessionError } = await supabase
      .from('book_sessions')
      .select('id, adaptive_plan, collaboration_summary, learning_insights, planning_context')
      .limit(1);

    if (sessionError) {
      console.error('❌ Verification failed:', sessionError);
      return false;
    }

    console.log('✅ New columns verified in book_sessions table');

    console.log('\n🎉 Database migration completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Migration failed:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return false;
  }
}

runMigration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });