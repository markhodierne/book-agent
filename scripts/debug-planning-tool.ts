#!/usr/bin/env npx tsx

/**
 * Debug Planning Tool Database Issues
 */

import { config } from 'dotenv';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

import { createServiceClient } from '@/lib/database/supabaseClient';
import { planningStateTool } from '@/lib/tools/planningStateTool';

async function debugPlanningTool() {
  console.log('🔍 Debugging Planning Tool Database Issues...\n');

  const supabase = createServiceClient();
  const sessionId = randomUUID();

  try {
    // 1. Create book session
    console.log('📝 Creating book session...');
    const { error: sessionError } = await supabase
      .from('book_sessions')
      .insert({
        id: sessionId,
        user_id: null,
        requirements: { test: true }
      });

    if (sessionError) {
      throw new Error(`Session creation failed: ${sessionError.message}`);
    }
    console.log('✅ Book session created successfully');

    // 2. Test direct database operation (bypass tool)
    console.log('💾 Testing direct database insert...');
    const directData = {
      session_id: sessionId,
      node_name: 'planning',
      state_data: {
        planningContext: {
          complexity: 'moderate',
          strategy: 'hybrid'
        },
        metadata: { test: true }
      },
      timestamp: new Date().toISOString(),
    };

    const { data: insertData, error: insertError } = await supabase
      .from('workflow_states')
      .insert(directData)
      .select()
      .single();

    if (insertError) {
      console.log('❌ Direct insert failed:', insertError);
      throw new Error(`Direct insert failed: ${insertError.message}`);
    }

    console.log('✅ Direct insert successful:', insertData.id);

    // 3. Test direct query
    console.log('🔍 Testing direct query...');
    const { data: queryData, error: queryError } = await supabase
      .from('workflow_states')
      .select('*')
      .eq('session_id', sessionId)
      .eq('node_name', 'planning');

    if (queryError) {
      console.log('❌ Direct query failed:', queryError);
      throw new Error(`Direct query failed: ${queryError.message}`);
    }

    console.log('✅ Direct query successful. Found records:', queryData?.length || 0);
    if (queryData && queryData.length > 0) {
      console.log('Record data:', JSON.stringify(queryData[0], null, 2));
    }

    // 4. Create another session for tool test
    const toolSessionId = randomUUID();
    console.log('📝 Creating book session for tool test...');
    const { error: toolSessionError } = await supabase
      .from('book_sessions')
      .insert({
        id: toolSessionId,
        user_id: null,
        requirements: { test: true, toolTest: true }
      });

    if (toolSessionError) {
      throw new Error(`Tool session creation failed: ${toolSessionError.message}`);
    }
    console.log('✅ Tool session created successfully');

    // 5. Now test the planning tool
    console.log('🔧 Testing planning tool directly...');
    try {
      const toolResult = await planningStateTool.invoke({
        operation: 'save',
        sessionId: toolSessionId,
        planningContext: {
          complexity: 'moderate',
          topicCategory: 'Test',
          estimatedWordCount: 30000,
          strategy: 'hybrid',
          approach: 'standard',
          chapterCount: 12,
          estimatedDuration: 60,
          researchIntensity: 'moderate',
          adaptationTriggers: [],
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        } as any,
        metadata: { test: true }
      });

      console.log('✅ Planning tool save result:', toolResult);

    } catch (toolError) {
      console.log('❌ Planning tool failed:');
      console.log('Error type:', typeof toolError);
      console.log('Error constructor:', toolError?.constructor?.name);
      console.log('Error message:', toolError instanceof Error ? toolError.message : 'Unknown');
      console.log('Full error:', toolError);

      // Try to extract more details
      if (toolError && typeof toolError === 'object') {
        console.log('Error keys:', Object.keys(toolError));
        for (const [key, value] of Object.entries(toolError)) {
          console.log(`  ${key}:`, value);
        }
      }
    }

    // Cleanup both sessions
    await supabase.from('workflow_states').delete().in('session_id', [sessionId, toolSessionId]);
    await supabase.from('book_sessions').delete().in('id', [sessionId, toolSessionId]);
    console.log('✅ Cleanup successful');

  } catch (error) {
    console.log('❌ Debug test failed:', error instanceof Error ? error.message : 'Unknown');

    // Cleanup on error
    try {
      await supabase.from('workflow_states').delete().eq('session_id', sessionId);
      await supabase.from('book_sessions').delete().eq('id', sessionId);
      // Don't need to clean toolSessionId here since it might not have been created
    } catch (cleanupError) {
      console.log('⚠️  Cleanup failed:', cleanupError);
    }
  }
}

debugPlanningTool().catch(console.error);