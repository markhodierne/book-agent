#!/usr/bin/env npx tsx

/**
 * Test Supabase connection and basic operations
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Connection...\n');

  try {
    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing required environment variables:');
      console.error('SUPABASE_URL:', !!process.env.SUPABASE_URL);
      console.error('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      process.exit(1);
    }

    console.log('✅ Environment variables loaded');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL?.substring(0, 30) + '...');

    // Import and test Supabase client
    const { createServiceClient } = await import('@/lib/database/supabaseClient');
    const supabase = createServiceClient();

    console.log('✅ Supabase client created');

    // Test basic connection with a simple query
    console.log('📡 Testing basic connection...');
    const { data, error } = await supabase
      .from('book_sessions')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Connection test failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('✅ Connection test successful');
    console.log('Book sessions count query result:', data);

    // Test session creation
    console.log('\n📝 Testing session creation...');
    const testSessionId = 'test-' + Date.now();

    const { data: insertData, error: insertError } = await supabase
      .from('book_sessions')
      .insert({
        id: testSessionId,
        user_id: null,
        status: 'active',
        current_stage: 'planning',
        adaptive_plan: {},
        collaboration_summary: {},
        learning_insights: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (insertError) {
      console.error('❌ Session creation failed:', insertError);
      console.error('Error details:', JSON.stringify(insertError, null, 2));
      return false;
    }

    console.log('✅ Session creation successful');
    console.log('Created session:', insertData);

    // Clean up test session
    console.log('\n🧹 Cleaning up test session...');
    const { error: deleteError } = await supabase
      .from('book_sessions')
      .delete()
      .eq('id', testSessionId);

    if (deleteError) {
      console.warn('⚠️ Failed to clean up test session:', deleteError);
    } else {
      console.log('✅ Test session cleaned up');
    }

    console.log('\n🎉 All Supabase tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return false;
  }
}

testSupabaseConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });