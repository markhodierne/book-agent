#!/usr/bin/env npx tsx

/**
 * Focused Test for Planning State Persistence
 * Tests only the database persistence functionality
 */

import { config } from 'dotenv';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

import {
  PlanningStateOperations,
  type PlanningContext,
} from '@/lib/agents/planning';

import { createServiceClient } from '@/lib/database/supabaseClient';

async function testPlanningStatePersistence() {
  console.log('🧪 Testing Planning State Persistence Only...\n');

  const supabase = createServiceClient();
  const sessionId = randomUUID();

  try {
    // 1. Create book session first
    console.log('📝 Creating book session...');
    const { error: sessionError } = await supabase
      .from('book_sessions')
      .insert({
        id: sessionId,
        user_id: null,
        requirements: { test: true, taskName: 'Planning Persistence Test' }
      });

    if (sessionError) {
      throw new Error(`Could not create book session: ${sessionError.message}`);
    }
    console.log('✅ Book session created');

    // 2. Create test planning context
    const testPlanningContext: PlanningContext = {
      complexity: 'moderate',
      topicCategory: 'Test Book Creation',
      estimatedWordCount: 30000,
      strategy: 'hybrid',
      approach: 'standard',
      chapterCount: 12,
      estimatedDuration: 60,
      researchIntensity: 'moderate',
      adaptationTriggers: ['quality_score_below_80', 'execution_time_exceeds_budget'],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    const testMetadata = {
      agentName: 'PlanningAgent',
      confidence: 0.85,
      reasoning: ['Test planning context for persistence validation'],
      testRun: true
    };

    // 3. Test save operation
    console.log('💾 Testing save operation...');
    await PlanningStateOperations.save(sessionId, testPlanningContext, testMetadata);
    console.log('✅ Save operation successful');

    // 4. Test exists check
    console.log('🔍 Testing exists check...');
    const exists = await PlanningStateOperations.exists(sessionId);
    if (!exists) {
      throw new Error('Planning state should exist after save');
    }
    console.log('✅ Exists check successful');

    // 5. Test load operation
    console.log('📄 Testing load operation...');
    const loaded = await PlanningStateOperations.load(sessionId);
    if (!loaded) {
      throw new Error('Planning state could not be loaded');
    }
    console.log('✅ Load operation successful');

    // 6. Verify loaded data matches saved data
    console.log('🔍 Verifying data integrity...');
    if (loaded.complexity !== testPlanningContext.complexity ||
        loaded.strategy !== testPlanningContext.strategy ||
        loaded.chapterCount !== testPlanningContext.chapterCount ||
        loaded.approach !== testPlanningContext.approach) {
      throw new Error('Loaded data does not match saved data');
    }
    console.log('✅ Data integrity verified');

    // 7. Test update operation
    console.log('🔄 Testing update operation...');
    const updates: Partial<PlanningContext> = {
      chapterCount: 15,
      estimatedDuration: 75,
      adaptationTriggers: [...testPlanningContext.adaptationTriggers, 'test_update_trigger']
    };

    const updated = await PlanningStateOperations.update(sessionId, updates, {
      updateReason: 'Test update operation'
    });

    if (!updated || updated.chapterCount !== 15) {
      throw new Error('Planning state update failed');
    }
    console.log('✅ Update operation successful');

    // 8. Test delete operation
    console.log('🗑️  Testing delete operation...');
    await PlanningStateOperations.delete(sessionId);

    // Verify it's gone
    const deletedExists = await PlanningStateOperations.exists(sessionId);
    if (deletedExists) {
      throw new Error('Planning state should not exist after delete');
    }
    console.log('✅ Delete operation successful');

    // Cleanup book session
    await supabase.from('book_sessions').delete().eq('id', sessionId);
    console.log('✅ Book session cleanup successful');

    console.log('\n🎉 All planning state persistence tests passed!');
    return true;

  } catch (error) {
    console.log('❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');

    // Attempt cleanup even on failure
    try {
      await PlanningStateOperations.delete(sessionId);
      await supabase.from('book_sessions').delete().eq('id', sessionId);
      console.log('🧹 Cleanup completed after failure');
    } catch (cleanupError) {
      console.log('⚠️  Cleanup failed:', cleanupError instanceof Error ? cleanupError.message : 'Unknown error');
    }

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

testPlanningStatePersistence()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });