#!/usr/bin/env npx tsx

/**
 * Test Conversational Planning Agent (Task 2 Enhanced)
 */

import { config } from 'dotenv';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

async function testConversationalPlanningAgent() {
  console.log('🧪 Testing Conversational Planning Agent...\n');

  try {
    // 1. Test conversation API with initial message
    console.log('📝 Step 1: Testing conversation with initial message...');

    const sessionId = randomUUID();
    const testPrompt = "I want to write a beginner's guide to JavaScript programming";

    const conversationResponse = await fetch('http://localhost:3000/api/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: "What audience should I target and what topics should I cover?",
        conversationHistory: [],
        userPrompt: testPrompt,
        sessionId: sessionId
      })
    });

    if (!conversationResponse.ok) {
      throw new Error(`Conversation API failed: ${conversationResponse.status}`);
    }

    const conversationData = await conversationResponse.json();
    console.log('✅ Conversation response received');
    console.log('📊 Response data:', {
      success: conversationData.success,
      hasContent: !!conversationData.content,
      contentLength: conversationData.content?.length || 0,
      conversationComplete: conversationData.conversationComplete,
      requirementsGathered: conversationData.requirementsGathered,
      hasPlanningAnalysis: !!conversationData.planningAnalysis
    });

    // 2. Continue conversation to trigger planning analysis
    console.log('\n📝 Step 2: Continuing conversation to gather more requirements...');

    const followupResponse = await fetch('http://localhost:3000/api/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: "I want to target complete beginners who have never programmed before. The book should be practical with lots of examples and exercises. I want it to be about 200-300 pages covering variables, functions, objects, arrays, and DOM manipulation.",
        conversationHistory: [
          { role: 'user', content: "What audience should I target and what topics should I cover?" },
          { role: 'assistant', content: conversationData.content }
        ],
        userPrompt: testPrompt,
        sessionId: sessionId
      })
    });

    if (!followupResponse.ok) {
      throw new Error(`Follow-up conversation API failed: ${followupResponse.status}`);
    }

    const followupData = await followupResponse.json();
    console.log('✅ Follow-up conversation response received');
    console.log('📊 Follow-up response data:', {
      success: followupData.success,
      hasContent: !!followupData.content,
      contentLength: followupData.content?.length || 0,
      conversationComplete: followupData.conversationComplete,
      requirementsGathered: followupData.requirementsGathered,
      hasPlanningAnalysis: !!followupData.planningAnalysis
    });

    // 3. Check if planning analysis was generated
    if (followupData.planningAnalysis) {
      console.log('\n🎯 Step 3: Planning analysis generated!');
      console.log('📊 Planning Analysis:', {
        complexity: followupData.planningAnalysis.complexity,
        topicCategory: followupData.planningAnalysis.topicCategory,
        estimatedWordCount: followupData.planningAnalysis.estimatedWordCount,
        strategy: followupData.planningAnalysis.strategy,
        approach: followupData.planningAnalysis.approach,
        chapterCount: followupData.planningAnalysis.chapterCount,
        estimatedDuration: followupData.planningAnalysis.estimatedDuration,
        researchIntensity: followupData.planningAnalysis.researchIntensity
      });
    } else {
      console.log('\n⚠️  Step 3: No planning analysis generated yet - conversation may need to continue');
    }

    // 4. Verify database records were created
    console.log('\n🔍 Step 4: Verifying database records...');

    const supabase = await import('@/lib/database/supabaseClient').then(m => m.createServiceClient());

    // Check book_sessions table
    const { data: sessionData, error: sessionError } = await supabase
      .from('book_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.log(`❌ Book session error: ${sessionError.message}`);
    } else {
      console.log('✅ Book session record found:', {
        id: sessionData.id,
        requirements: sessionData.requirements
      });
    }

    // Check workflow_states table for planning data
    const { data: workflowData, error: workflowError } = await supabase
      .from('workflow_states')
      .select('*')
      .eq('session_id', sessionId)
      .eq('node_name', 'planning');

    if (workflowError) {
      console.log(`❌ Workflow states error: ${workflowError.message}`);
    } else if (workflowData && workflowData.length > 0) {
      console.log('✅ Planning state record found:', {
        node_name: workflowData[0].node_name,
        hasStateData: !!workflowData[0].state_data,
        hasPlanningContext: !!workflowData[0].state_data?.planningContext,
        timestamp: workflowData[0].timestamp
      });
    } else {
      console.log('⚠️  No planning state records found yet');
    }

    console.log('\n🎉 Conversational Planning Agent test completed!');

    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`✅ Conversation API works: ${conversationData.success}`);
    console.log(`✅ Follow-up conversation works: ${followupData.success}`);
    console.log(`${followupData.planningAnalysis ? '✅' : '⚠️ '} Planning analysis generated: ${!!followupData.planningAnalysis}`);
    console.log(`${sessionData ? '✅' : '❌'} Book session created: ${!!sessionData}`);
    console.log(`${workflowData && workflowData.length > 0 ? '✅' : '⚠️ '} Planning state persisted: ${workflowData && workflowData.length > 0}`);

    return {
      conversationWorks: conversationData.success,
      planningAnalysisGenerated: !!followupData.planningAnalysis,
      databaseRecordsCreated: !!sessionData && workflowData && workflowData.length > 0
    };

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');
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

testConversationalPlanningAgent()
  .then(result => {
    if (result && typeof result === 'object') {
      const success = result.conversationWorks && result.planningAnalysisGenerated && result.databaseRecordsCreated;
      console.log(`\n🎯 CONCLUSION: Conversational Planning Agent is ${success ? 'FULLY FUNCTIONAL! 🎉' : 'partially working - needs refinement'}`);
      process.exit(success ? 0 : 1);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });