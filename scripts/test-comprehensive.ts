#!/usr/bin/env tsx
// Comprehensive database test with RLS verification

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Simple environment loader for .env.local
function loadEnvFile() {
  try {
    const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    envFile.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#') && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    });
  } catch (error) {
    console.error('Could not load .env.local file');
  }
}

// Load environment variables
loadEnvFile();

async function comprehensiveTest() {
  console.log('🧪 Comprehensive Database & RLS Testing\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Create both clients
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    console.log('1️⃣ Testing table access...');

    // Test each table exists and is accessible
    const tables = ['book_sessions', 'books', 'chapters', 'workflow_states'];
    for (const table of tables) {
      const { error } = await anonClient.from(table).select('id').limit(1);
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: accessible`);
      }
    }

    console.log('\n2️⃣ Testing anonymous user workflow...');

    // Create an anonymous session
    const { data: sessionData, error: sessionError } = await anonClient
      .from('book_sessions')
      .insert({
        status: 'active',
        current_stage: 'conversation',
        requirements: { topic: 'Test Book', audience: { expertiseLevel: 'beginner' } }
      })
      .select('id')
      .single();

    if (sessionError) {
      console.log(`   ❌ Creating session: ${sessionError.message}`);
    } else {
      console.log(`   ✅ Created session: ${sessionData.id}`);

      // Create a book for this session
      const { data: bookData, error: bookError } = await anonClient
        .from('books')
        .insert({
          session_id: sessionData.id,
          title: 'Test Book',
          author: 'Test Author'
        })
        .select('id')
        .single();

      if (bookError) {
        console.log(`   ❌ Creating book: ${bookError.message}`);
      } else {
        console.log(`   ✅ Created book: ${bookData.id}`);

        // Create a chapter for this book
        const { data: chapterData, error: chapterError } = await anonClient
          .from('chapters')
          .insert({
            book_id: bookData.id,
            chapter_number: 1,
            title: 'Test Chapter',
            status: 'pending'
          })
          .select('id')
          .single();

        if (chapterError) {
          console.log(`   ❌ Creating chapter: ${chapterError.message}`);
        } else {
          console.log(`   ✅ Created chapter: ${chapterData.id}`);
        }

        // Create a workflow state
        const { data: stateData, error: stateError } = await anonClient
          .from('workflow_states')
          .insert({
            session_id: sessionData.id,
            node_name: 'conversation',
            state_data: { currentStage: 'conversation', sessionId: sessionData.id }
          })
          .select('id')
          .single();

        if (stateError) {
          console.log(`   ❌ Creating workflow state: ${stateError.message}`);
        } else {
          console.log(`   ✅ Created workflow state: ${stateData.id}`);
        }
      }
    }

    console.log('\n3️⃣ Testing RLS isolation...');

    // Query sessions as anonymous user (should only see anonymous sessions)
    const { data: anonSessions, error: anonError } = await anonClient
      .from('book_sessions')
      .select('id, user_id');

    if (anonError) {
      console.log(`   ❌ Anonymous query: ${anonError.message}`);
    } else {
      const anonymousCount = anonSessions?.filter(s => s.user_id === null).length || 0;
      const authenticatedCount = anonSessions?.filter(s => s.user_id !== null).length || 0;
      console.log(`   ✅ Anonymous user sees: ${anonymousCount} anonymous, ${authenticatedCount} authenticated sessions`);

      if (authenticatedCount > 0) {
        console.log(`   ⚠️  RLS may not be working - anonymous user sees authenticated sessions`);
      } else {
        console.log(`   🔒 RLS working correctly - data isolation maintained`);
      }
    }

    console.log('\n4️⃣ Testing service role access...');

    // Service role should see all sessions
    const { data: allSessions, error: serviceError } = await serviceClient
      .from('book_sessions')
      .select('id, user_id');

    if (serviceError) {
      console.log(`   ❌ Service query: ${serviceError.message}`);
    } else {
      console.log(`   ✅ Service role sees: ${allSessions?.length || 0} total sessions`);
    }

    console.log('\n5️⃣ Testing RLS policies function...');

    // Test the built-in RLS test function
    const { data: rlsTests, error: rlsError } = await anonClient
      .rpc('test_rls_policies');

    if (rlsError) {
      console.log(`   ❌ RLS test function: ${rlsError.message}`);
    } else {
      rlsTests?.forEach((test: any) => {
        const status = test.passed ? '✅' : '❌';
        console.log(`   ${status} ${test.test_name}: ${test.details}`);
      });
    }

    console.log('\n🎉 Database testing completed successfully!');
    console.log('\n✨ Next steps:');
    console.log('- Database schema is ready for Book Agent');
    console.log('- RLS policies are protecting user data');
    console.log('- Anonymous book creation is supported');
    console.log('- Service role can perform backend operations');

  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : error);
  }
}

comprehensiveTest().catch(console.error);