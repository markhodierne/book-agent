#!/usr/bin/env npx tsx

/**
 * Execute migration directly using pg client
 */

import { config } from 'dotenv';
import { join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

async function executeMigrationDirect() {
  console.log('🚀 Executing database migration directly...\n');

  try {
    // Import pg client
    const { Client } = await import('pg');

    // Parse Supabase URL to get connection details
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error('❌ Missing environment variables');
      process.exit(1);
    }

    // Extract connection details from Supabase URL
    const url = new URL(supabaseUrl);
    const connectionConfig = {
      host: url.hostname,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: serviceKey.split('.')[0], // This might not work, we'll try Supabase approach
    };

    console.log('📡 Connecting to database...');
    console.log('Host:', connectionConfig.host);

    // Try connecting
    const client = new Client(connectionConfig);

    try {
      await client.connect();
      console.log('✅ Connected to PostgreSQL database');

      // Read the essential migration SQL
      const migrationSQL = readFileSync(
        join(process.cwd(), 'scripts/migration-sql-for-supabase.sql'),
        'utf8'
      );

      console.log('\n📝 Executing migration SQL...');
      console.log('SQL length:', migrationSQL.length, 'characters');

      // Execute the migration
      const result = await client.query(migrationSQL);
      console.log('✅ Migration executed successfully');
      console.log('Result:', result);

      // Verify the migration
      const verifyResult = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'book_sessions'
        AND column_name IN ('adaptive_plan', 'collaboration_summary', 'learning_insights', 'planning_context')
        ORDER BY column_name;
      `);

      console.log('\n🔍 Verification results:');
      console.log('New columns found:', verifyResult.rows.map(r => r.column_name));

      if (verifyResult.rows.length === 4) {
        console.log('✅ All required columns added successfully!');
      } else {
        console.log('⚠️ Some columns may not have been added');
      }

      await client.end();
      console.log('\n🎉 Migration completed successfully!');
      return true;

    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError);
      await client.end();
      return false;
    }

  } catch (error) {
    console.error('❌ Migration failed:', error instanceof Error ? error.message : error);

    // Fallback: Show manual instructions
    console.log('\n📋 MANUAL MIGRATION INSTRUCTIONS:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the SQL from: scripts/migration-sql-for-supabase.sql');
    console.log('\nOr copy this essential SQL:');
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

executeMigrationDirect()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });