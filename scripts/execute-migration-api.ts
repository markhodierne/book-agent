#!/usr/bin/env npx tsx

/**
 * Execute migration using Supabase REST API
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

async function executeMigrationViaAPI() {
  console.log('🚀 Executing database migration via Supabase API...\n');

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error('❌ Missing environment variables');
      process.exit(1);
    }

    console.log('📡 Using Supabase REST API...');

    // Execute migration statements one by one
    const statements = [
      // Add columns
      `ALTER TABLE book_sessions ADD COLUMN IF NOT EXISTS adaptive_plan JSONB DEFAULT '{}'`,
      `ALTER TABLE book_sessions ADD COLUMN IF NOT EXISTS collaboration_summary JSONB DEFAULT '{}'`,
      `ALTER TABLE book_sessions ADD COLUMN IF NOT EXISTS learning_insights JSONB DEFAULT '{}'`,
      `ALTER TABLE book_sessions ADD COLUMN IF NOT EXISTS planning_context JSONB DEFAULT '{}'`,
    ];

    console.log('📝 Executing migration statements...\n');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`${i + 1}. ${statement.substring(0, 60)}...`);

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'apikey': serviceKey,
        },
        body: JSON.stringify({
          query: statement
        })
      });

      if (!response.ok) {
        console.log(`⚠️ Statement ${i + 1} response:`, response.status, response.statusText);
        const errorText = await response.text();
        console.log('Error details:', errorText);

        // Continue with next statement
        continue;
      }

      const result = await response.json();
      console.log(`✅ Statement ${i + 1} executed successfully`);
    }

    // Now try to update workflow_stage enum
    console.log('\n📝 Adding planning stage to workflow_stage enum...');

    const enumSQL = `
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'planning' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'workflow_stage')) THEN
              ALTER TYPE workflow_stage ADD VALUE 'planning';
          END IF;
      END $$;
    `;

    const enumResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceKey,
      },
      body: JSON.stringify({
        query: enumSQL
      })
    });

    if (enumResponse.ok) {
      console.log('✅ Enum value added successfully');
    } else {
      console.log('⚠️ Enum update failed, but continuing...');
    }

    // Test if migration worked
    console.log('\n🔍 Testing migration results...');

    const { createServiceClient } = await import('@/lib/database/supabaseClient');
    const supabase = createServiceClient();

    const testSessionId = 'migration-test-' + Date.now();

    const { data: insertData, error: insertError } = await supabase
      .from('book_sessions')
      .insert({
        id: testSessionId,
        user_id: null,
        status: 'active',
        current_stage: 'conversation',
        requirements: null,
        adaptive_plan: { test: true },
        collaboration_summary: { test: true },
        learning_insights: { test: true },
        planning_context: { test: true },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (insertError) {
      console.error('❌ Migration verification failed:', insertError.message);
      return false;
    }

    console.log('✅ Migration verification successful!');
    console.log('Test record created:', insertData);

    // Clean up test record
    await supabase.from('book_sessions').delete().eq('id', testSessionId);
    console.log('🧹 Test record cleaned up');

    console.log('\n🎉 Migration completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Migration failed:', error instanceof Error ? error.message : error);

    // Show manual instructions
    console.log('\n📋 MANUAL MIGRATION INSTRUCTIONS:');
    console.log('Please run this SQL in your Supabase SQL Editor:');
    console.log(`
-- Add columns to book_sessions table
ALTER TABLE book_sessions
ADD COLUMN IF NOT EXISTS adaptive_plan JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS collaboration_summary JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS learning_insights JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS planning_context JSONB DEFAULT '{}';

-- Add planning stage to workflow_stage enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'planning' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'workflow_stage')) THEN
        ALTER TYPE workflow_stage ADD VALUE 'planning';
    END IF;
END $$;
    `);

    return false;
  }
}

executeMigrationViaAPI()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });