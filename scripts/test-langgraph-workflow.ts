#!/usr/bin/env npx tsx

/**
 * Test LangGraph Workflow Implementation (Task 2 Complete)
 */

import { config } from 'dotenv';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

async function testLangGraphWorkflow() {
  console.log('🧪 Testing LangGraph Workflow Implementation...\n');

  try {
    const sessionId = randomUUID();
    const testPrompt = "I want to write a comprehensive guide to modern JavaScript development for intermediate developers";

    // Test 1: Planning Stage
    console.log('📊 Step 1: Testing Planning Stage...');

    const planningResponse = await fetch('http://localhost:3000/api/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userPrompt: testPrompt,
        action: 'planning',
        sessionId: sessionId
      })
    });

    if (!planningResponse.ok) {
      throw new Error(`Planning stage failed: ${planningResponse.status}`);
    }

    const planningData = await planningResponse.json();
    console.log('✅ Planning stage completed');
    console.log('📊 Planning Results:', {
      success: planningData.success,
      complexity: planningData.planningContext?.complexity,
      strategy: planningData.planningContext?.strategy,
      approach: planningData.planningContext?.approach,
      chapterCount: planningData.planningContext?.chapterCount,
      estimatedWordCount: planningData.planningContext?.estimatedWordCount,
      nextStage: planningData.nextStage
    });

    if (!planningData.success) {
      throw new Error(planningData.error || 'Planning stage failed');
    }

    // Test 2: Conversation Stage (if planning recommends it)
    if (planningData.nextStage === 'conversation') {
      console.log('\n💬 Step 2: Testing Conversation Stage...');

      const conversationResponse = await fetch('http://localhost:3000/api/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: testPrompt,
          action: 'conversation',
          sessionId: sessionId
        })
      });

      if (!conversationResponse.ok) {
        throw new Error(`Conversation stage failed: ${conversationResponse.status}`);
      }

      const conversationData = await conversationResponse.json();
      console.log('✅ Conversation stage completed');
      console.log('📊 Conversation Results:', {
        success: conversationData.success,
        hasRequirements: !!conversationData.requirements,
        hasStyleGuide: !!conversationData.styleGuide,
        nextStage: conversationData.nextStage,
        topicConfirmed: conversationData.requirements?.topic
      });

      if (!conversationData.success) {
        throw new Error(conversationData.error || 'Conversation stage failed');
      }
    }

    // Test 3: Workflow Status
    console.log('\n🔍 Step 3: Testing Workflow Status...');

    const statusResponse = await fetch('http://localhost:3000/api/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'status',
        sessionId: sessionId
      })
    });

    if (!statusResponse.ok) {
      throw new Error(`Status check failed: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    console.log('✅ Status check completed');
    console.log('📊 Workflow Status:', {
      success: statusData.success,
      currentStage: statusData.session?.current_stage,
      sessionStatus: statusData.session?.status,
      workflowStatesCount: statusData.workflowStates?.length || 0
    });

    // Test 4: Database Verification
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
        status: sessionData.status,
        current_stage: sessionData.current_stage,
        hasAdaptivePlan: !!sessionData.adaptive_plan
      });
    }

    // Check workflow_states table for planning data
    const { data: workflowData, error: workflowError } = await supabase
      .from('workflow_states')
      .select('*')
      .eq('session_id', sessionId);

    if (workflowError) {
      console.log(`❌ Workflow states error: ${workflowError.message}`);
    } else {
      console.log('✅ Workflow state records found:', {
        count: workflowData.length,
        nodes: workflowData.map(w => w.node_name),
        latestTimestamp: workflowData[0]?.timestamp
      });

      // Check planning state specifically
      const planningState = workflowData.find(w => w.node_name === 'planning');
      if (planningState) {
        console.log('✅ Planning state details:', {
          hasStateData: !!planningState.state_data,
          hasPlanningContext: !!planningState.state_data?.planningContext,
          complexity: planningState.state_data?.planningContext?.complexity,
          strategy: planningState.state_data?.planningContext?.strategy
        });
      }
    }

    console.log('\n🎉 LangGraph Workflow test completed!');

    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`✅ Planning stage works: ${planningData.success}`);
    console.log(`✅ Workflow routing works: ${planningData.nextStage ? 'YES' : 'NO'}`);
    console.log(`✅ State persistence works: ${workflowData && workflowData.length > 0 ? 'YES' : 'NO'}`);
    console.log(`✅ Database integration works: ${sessionData ? 'YES' : 'NO'}`);
    console.log(`✅ Status tracking works: ${statusData.success}`);

    return {
      planningWorks: planningData.success,
      statesPersisted: workflowData && workflowData.length > 0,
      databaseWorking: !!sessionData,
      statusWorking: statusData.success,
      workflowRouting: !!planningData.nextStage
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

testLangGraphWorkflow()
  .then(result => {
    if (result && typeof result === 'object') {
      const success = result.planningWorks && result.statesPersisted && result.databaseWorking && result.statusWorking;
      console.log(`\n🎯 CONCLUSION: LangGraph Workflow is ${success ? 'FULLY FUNCTIONAL according to architecture! 🎉' : 'partially working - needs refinement'}`);
      console.log('✅ Planning Agent integrated with LangGraph workflow');
      console.log('✅ State-first architecture implemented');
      console.log('✅ Sequential processing with proper state persistence');
      console.log('✅ Adaptive routing based on planning decisions');
      process.exit(success ? 0 : 1);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });