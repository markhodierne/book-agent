#!/usr/bin/env npx tsx

/**
 * Database Connectivity Test for Planning Agent
 * Tests Supabase connection and table existence
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

import { createServiceClient } from '@/lib/database/supabaseClient';
import { randomUUID } from 'crypto';

async function testDatabaseConnectivity() {
  console.log('🔍 Testing Supabase Database Connectivity...\n');

  try {
    // 1. Test basic connection
    const supabase = createServiceClient();
    console.log('✅ Service client created successfully');

    // 2. Test a simple query
    const { data: testData, error: testError } = await supabase
      .from('workflow_states')
      .select('*')
      .limit(1);

    if (testError) {
      console.log('❌ Database query failed:', testError.message);
      console.log('Error details:', testError);

      // Check if table exists
      const { data: tableData, error: tableError } = await supabase
        .rpc('check_table_exists', { table_name: 'workflow_states' });

      if (tableError) {
        console.log('❌ Could not check if table exists:', tableError.message);
      } else {
        console.log('Table exists:', tableData);
      }

      return false;
    }

    console.log('✅ Database connection and query successful');
    console.log('Current workflow_states count:', testData?.length || 0);

    // 3. Create a book session first (required for foreign key)
    const { data: sessionData, error: sessionError } = await supabase
      .from('book_sessions')
      .insert({
        user_id: null, // Anonymous user
        requirements: { test: true }
      })
      .select('id')
      .single();

    if (sessionError) {
      console.log('❌ Could not create test book session:', sessionError.message);
      return false;
    }

    console.log('✅ Test book session created');

    // 4. Test insert operation into workflow_states
    const testRecord = {
      session_id: sessionData.id,
      node_name: 'test',
      state_data: { test: true },
      timestamp: new Date().toISOString(),
    };

    const { data: insertData, error: insertError } = await supabase
      .from('workflow_states')
      .insert(testRecord)
      .select()
      .single();

    if (insertError) {
      console.log('❌ Insert operation failed:', insertError.message);
      console.log('Insert error details:', insertError);
      return false;
    }

    console.log('✅ Insert operation successful');

    // 5. Test delete operation (cleanup)
    const { error: deleteError } = await supabase
      .from('workflow_states')
      .delete()
      .eq('session_id', testRecord.session_id);

    if (deleteError) {
      console.log('⚠️ Workflow states cleanup failed:', deleteError.message);
    } else {
      console.log('✅ Workflow states cleanup successful');
    }

    // 6. Cleanup book session too
    const { error: sessionDeleteError } = await supabase
      .from('book_sessions')
      .delete()
      .eq('id', sessionData.id);

    if (sessionDeleteError) {
      console.log('⚠️ Book session cleanup failed:', sessionDeleteError.message);
    } else {
      console.log('✅ Book session cleanup successful');
    }

    console.log('\n🎉 All database connectivity tests passed!');
    return true;

  } catch (error) {
    console.log('❌ Unexpected error:', error);
    return false;
  }
}

// Check environment
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('SUPABASE_URL:', !!process.env.SUPABASE_URL);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

testDatabaseConnectivity()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });