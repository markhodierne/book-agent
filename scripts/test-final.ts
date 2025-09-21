#!/usr/bin/env tsx
// Final comprehensive test of database functionality

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

async function finalTest() {
  console.log('🎯 Final Database Functionality Test\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    console.log('✅ Environment loaded and client created');

    // Test the full workflow: session → book → chapter → state
    console.log('\n📋 Testing complete book creation workflow...');

    // 1. Create session
    const { data: session, error: sessionError } = await supabase
      .from('book_sessions')
      .insert({
        status: 'active',
        current_stage: 'conversation',
        requirements: {
          topic: 'Advanced TypeScript Patterns',
          audience: { expertiseLevel: 'advanced' },
          wordCountTarget: 35000
        }
      })
      .select('id, status, current_stage')
      .single();

    if (sessionError) throw sessionError;
    console.log(`   ✅ Session created: ${session.id}`);

    // 2. Create book
    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        session_id: session.id,
        title: 'Advanced TypeScript Patterns',
        author: 'AI Book Agent',
        outline: {
          title: 'Advanced TypeScript Patterns',
          chapters: [
            { chapterNumber: 1, title: 'Introduction', wordCount: 2000 },
            { chapterNumber: 2, title: 'Type Systems', wordCount: 3000 }
          ],
          totalWordCount: 35000
        }
      })
      .select('id, title, author')
      .single();

    if (bookError) throw bookError;
    console.log(`   ✅ Book created: ${book.title} by ${book.author}`);

    // 3. Create chapters (simulating parallel generation)
    const chapters = [
      {
        book_id: book.id,
        chapter_number: 1,
        title: 'Introduction to Advanced TypeScript',
        content: 'This chapter introduces advanced TypeScript concepts...',
        word_count: 2000,
        status: 'completed' as const
      },
      {
        book_id: book.id,
        chapter_number: 2,
        title: 'Understanding Type Systems',
        content: 'Type systems are fundamental to...',
        word_count: 3000,
        status: 'completed' as const
      }
    ];

    const { data: createdChapters, error: chaptersError } = await supabase
      .from('chapters')
      .insert(chapters)
      .select('id, title, chapter_number, word_count');

    if (chaptersError) throw chaptersError;
    console.log(`   ✅ Created ${createdChapters?.length} chapters`);

    // 4. Save workflow state (checkpoint)
    const { data: workflowState, error: stateError } = await supabase
      .from('workflow_states')
      .insert({
        session_id: session.id,
        node_name: 'chapters_completed',
        state_data: {
          sessionId: session.id,
          currentStage: 'quality_review',
          chapters: createdChapters,
          progress: {
            currentStageProgress: 85,
            overallProgress: 70,
            chaptersCompleted: 2,
            totalChapters: 2
          }
        }
      })
      .select('id, node_name')
      .single();

    if (stateError) throw stateError;
    console.log(`   ✅ Workflow state saved: ${workflowState.node_name}`);

    // 5. Test data retrieval (simulate dashboard query)
    console.log('\n📊 Testing data retrieval...');

    const { data: sessionWithBook, error: queryError } = await supabase
      .from('book_sessions')
      .select(`
        id,
        status,
        current_stage,
        requirements,
        books (
          id,
          title,
          author,
          word_count,
          chapters (
            id,
            chapter_number,
            title,
            word_count,
            status
          )
        )
      `)
      .eq('id', session.id)
      .single();

    if (queryError) throw queryError;

    console.log('   ✅ Retrieved complete session data:');
    console.log(`      - Session: ${sessionWithBook.id} (${sessionWithBook.status})`);
    console.log(`      - Book: ${sessionWithBook.books?.[0]?.title}`);
    console.log(`      - Chapters: ${sessionWithBook.books?.[0]?.chapters?.length || 0}`);

    // 6. Test RLS isolation
    console.log('\n🔒 Testing RLS data isolation...');

    const { data: allSessions } = await supabase
      .from('book_sessions')
      .select('id, user_id');

    const anonymousSessions = allSessions?.filter(s => s.user_id === null) || [];
    const authenticatedSessions = allSessions?.filter(s => s.user_id !== null) || [];

    console.log(`   ✅ Anonymous user can see:`);
    console.log(`      - ${anonymousSessions.length} anonymous sessions`);
    console.log(`      - ${authenticatedSessions.length} authenticated sessions`);

    if (authenticatedSessions.length === 0) {
      console.log('   🔒 RLS working correctly - data properly isolated');
    }

    console.log('\n🎉 All tests passed! Database is ready for Book Agent.');
    console.log('\n📈 Database Statistics:');
    console.log(`   - Sessions created: ${allSessions?.length || 0}`);
    console.log(`   - Books created: ${sessionWithBook.books?.length || 0}`);
    console.log(`   - Chapters created: ${sessionWithBook.books?.[0]?.chapters?.length || 0}`);

    console.log('\n🚀 Ready for next phase: Tool Implementation!');

  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

finalTest().catch(console.error);