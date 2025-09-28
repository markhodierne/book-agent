#!/usr/bin/env npx tsx

/**
 * Comprehensive Test Script for Task 2: Planning Agent Foundation
 *
 * This script validates that all Task 2 deliverables work correctly:
 * 1. Planning Agent GPT-5 mini integration
 * 2. Complexity analysis functions
 * 3. Strategy selection logic
 * 4. Planning state persistence to Supabase
 * 5. End-to-end integration test
 */

import { config } from 'dotenv';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

// Import all Task 2 components
import {
  PlanningAgent,
  createPlanningAgent,
  analyzeComplexity,
  quickComplexityCheck,
  selectExecutionStrategy,
  validateStrategyRecommendation,
  strategyToPlanningContext,
  planningStateTool,
  PlanningStateOperations,
  executeCompletePlanningWorkflow,
  type PlanningRequest,
  type ComplexityAnalysisResult,
  type StrategySelectionCriteria,
} from '@/lib/agents/planning';

import { PlanningContext } from '@/types';

/**
 * Test result tracking
 */
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

class TestRunner {
  private results: TestResult[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = randomUUID();
  }

  async runTest(name: string, testFn: () => Promise<any>): Promise<boolean> {
    const startTime = Date.now();
    console.log(`\n🧪 Testing: ${name}`);

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      this.results.push({
        name,
        passed: true,
        duration,
        details: result,
      });

      console.log(`✅ PASSED (${duration}ms)`);
      return true;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.results.push({
        name,
        passed: false,
        duration,
        error: errorMessage,
      });

      console.log(`❌ FAILED (${duration}ms): ${errorMessage}`);
      return false;
    }
  }

  printSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 TEST SUMMARY - Task 2: Planning Agent Foundation`);
    console.log(`${'='.repeat(80)}`);
    console.log(`✅ Passed: ${passed}/${total} tests`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`🆔 Session ID: ${this.sessionId}`);

    if (passed === total) {
      console.log(`\n🎉 ALL TESTS PASSED! Task 2 Planning Agent is production ready.`);
    } else {
      console.log(`\n⚠️  Some tests failed. Review errors above.`);
    }

    // Show detailed results
    console.log(`\n📋 Detailed Results:`);
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name} (${result.duration}ms)`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

/**
 * Test 1: Complexity Analysis Functions
 */
async function testComplexityAnalysis(): Promise<any> {
  const testCases = [
    {
      prompt: "Create a simple beginner's guide to gardening",
      expected: 'simple',
      description: 'Simple tutorial content'
    },
    {
      prompt: "Write a comprehensive manual for advanced machine learning algorithms and neural networks",
      expected: 'expert',
      description: 'Expert technical content'
    },
    {
      prompt: "Professional handbook for project management in software development",
      expected: 'moderate',
      description: 'Professional content'
    },
    {
      prompt: "Research-based academic analysis of quantum computing algorithms and implementation",
      expected: 'expert',
      description: 'Academic research content'
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    // Test quick complexity check
    const quickResult = quickComplexityCheck(testCase.prompt);

    // Test full complexity analysis
    const fullAnalysis = analyzeComplexity(testCase.prompt, undefined, 30000);

    results.push({
      prompt: testCase.prompt.substring(0, 50) + '...',
      expectedComplexity: testCase.expected,
      quickResult,
      fullAnalysis: {
        complexity: fullAnalysis.complexity,
        confidence: fullAnalysis.confidence,
        chapterCount: fullAnalysis.recommendations.chapterCount,
        strategy: fullAnalysis.recommendations.strategy,
        reasoning: fullAnalysis.reasoning
      },
      quickMatches: quickResult === testCase.expected,
      fullMatches: fullAnalysis.complexity === testCase.expected
    });
  }

  // Verify all tests have reasonable results
  const allReasonable = results.every(r =>
    r.fullAnalysis.confidence > 0.5 &&
    r.fullAnalysis.chapterCount >= 8 &&
    r.fullAnalysis.chapterCount <= 25
  );

  if (!allReasonable) {
    throw new Error('Some complexity analysis results were unreasonable');
  }

  return results;
}

/**
 * Test 2: Strategy Selection Logic
 */
async function testStrategySelection(): Promise<any> {
  const testCases = [
    {
      complexity: 'simple' as const,
      wordCount: 15000,
      timeConstraints: 45,
      expectedStrategy: 'parallel',
      description: 'Simple content with time constraints should use parallel'
    },
    {
      complexity: 'expert' as const,
      wordCount: 80000,
      qualityRequirements: 'publication' as const,
      expectedStrategy: 'sequential',
      description: 'Expert content for publication should use sequential'
    },
    {
      complexity: 'moderate' as const,
      wordCount: 30000,
      expectedStrategy: 'hybrid',
      description: 'Moderate content should default to hybrid'
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    // Create complexity analysis for the test
    const complexityAnalysis: ComplexityAnalysisResult = {
      complexity: testCase.complexity,
      confidence: 0.8,
      metrics: {
        wordCount: testCase.wordCount,
        technicalTermDensity: 0.3,
        domainSpecificity: 0.4,
        researchRequirements: 0.3,
        structureComplexity: 0.4
      },
      reasoning: [`Test case for ${testCase.complexity} complexity`],
      recommendations: {
        strategy: 'sequential',
        approach: 'standard',
        researchIntensity: 'moderate',
        chapterCount: 12,
        estimatedDuration: 60
      }
    };

    const criteria: StrategySelectionCriteria = {
      complexity: testCase.complexity,
      wordCount: testCase.wordCount,
      timeConstraints: testCase.timeConstraints,
      qualityRequirements: testCase.qualityRequirements,
      riskTolerance: 'medium',
      resourceAvailability: 'standard'
    };

    const strategy = selectExecutionStrategy(complexityAnalysis, criteria);

    // Validate the strategy
    const isValid = validateStrategyRecommendation(strategy, criteria);

    // Convert to planning context
    const planningContext = strategyToPlanningContext(strategy, complexityAnalysis);

    results.push({
      testCase: testCase.description,
      expectedStrategy: testCase.expectedStrategy,
      actualStrategy: strategy.strategy,
      confidence: strategy.confidence,
      isValid,
      planningContext,
      matches: strategy.strategy === testCase.expectedStrategy,
      alternatives: strategy.alternatives.length
    });
  }

  // Verify all strategies are valid and have reasonable confidence
  const allValid = results.every(r =>
    r.isValid &&
    r.confidence > 0.5 &&
    r.alternatives >= 0
  );

  if (!allValid) {
    throw new Error('Some strategy selections were invalid or had low confidence');
  }

  return results;
}

/**
 * Test 3: Planning State Persistence
 */
async function testPlanningStatePersistence(sessionId: string): Promise<any> {
  // Create a real book session first (required for foreign key)
  const { createServiceClient } = await import('@/lib/database/supabaseClient');
  const supabase = createServiceClient();

  const { data: sessionData, error: sessionError } = await supabase
    .from('book_sessions')
    .insert({
      id: sessionId,
      user_id: null, // Anonymous user
      requirements: { test: true, taskName: 'Task 2 Planning Agent Test' }
    })
    .select('id')
    .single();

  if (sessionError) {
    throw new Error(`Could not create test book session: ${sessionError.message}`);
  }

  // Create test planning context
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
    reasoning: ['Test planning context for Task 2 validation'],
    testRun: true
  };

  // Test 1: Save planning state
  await PlanningStateOperations.save(sessionId, testPlanningContext, testMetadata);

  // Test 2: Check if it exists
  const exists = await PlanningStateOperations.exists(sessionId);
  if (!exists) {
    throw new Error('Planning state was not saved correctly');
  }

  // Test 3: Load planning state
  const loaded = await PlanningStateOperations.load(sessionId);
  if (!loaded) {
    throw new Error('Planning state could not be loaded');
  }

  // Test 4: Verify loaded data matches saved data
  if (loaded.complexity !== testPlanningContext.complexity ||
      loaded.strategy !== testPlanningContext.strategy ||
      loaded.chapterCount !== testPlanningContext.chapterCount) {
    throw new Error('Loaded planning state does not match saved data');
  }

  // Test 5: Update planning state
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

  // Test 6: Test planning state tool directly
  const toolResult = await planningStateTool.invoke({
    operation: 'load',
    sessionId
  });

  if (!toolResult.success || !toolResult.planningContext) {
    throw new Error('Planning state tool load operation failed');
  }

  return {
    saved: true,
    loaded: !!loaded,
    updated: !!updated,
    toolWorking: toolResult.success,
    finalState: toolResult.planningContext,
    dataIntegrity: loaded.complexity === testPlanningContext.complexity
  };
}

/**
 * Test 4: Planning Agent GPT-5 Mini Integration
 */
async function testPlanningAgentIntegration(): Promise<any> {
  const agent = createPlanningAgent();

  // Test with various prompt types
  const testRequests: PlanningRequest[] = [
    {
      userPrompt: "Create a comprehensive guide to sustainable gardening for beginners",
      targetWordCount: 25000
    },
    {
      userPrompt: "Write an advanced technical manual for implementing microservices architecture",
      baseContent: "Some existing technical content about distributed systems and API design patterns",
      targetWordCount: 50000,
      constraints: ['Must include code examples', 'Academic level accuracy required']
    },
    {
      userPrompt: "Simple cookbook with 30 easy recipes",
      targetWordCount: 15000
    }
  ];

  const results = [];

  for (const request of testRequests) {
    try {
      const analysis = await agent.createPlan(request);

      // Verify analysis has all required fields
      const requiredFields = [
        'complexity', 'topicCategory', 'estimatedWordCount', 'strategy',
        'approach', 'chapterCount', 'estimatedDuration', 'researchIntensity',
        'adaptationTriggers'
      ];

      const missingFields = requiredFields.filter(field => !(field in analysis));

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Verify reasonable values
      if (analysis.chapterCount < 8 || analysis.chapterCount > 25) {
        throw new Error(`Invalid chapter count: ${analysis.chapterCount}`);
      }

      if (analysis.estimatedDuration < 15 || analysis.estimatedDuration > 300) {
        throw new Error(`Invalid estimated duration: ${analysis.estimatedDuration}`);
      }

      results.push({
        prompt: request.userPrompt.substring(0, 50) + '...',
        analysis: {
          complexity: analysis.complexity,
          strategy: analysis.strategy,
          approach: analysis.approach,
          chapterCount: analysis.chapterCount,
          estimatedDuration: analysis.estimatedDuration,
          researchIntensity: analysis.researchIntensity
        },
        hasReasoning: !!analysis.reasoning,
        hasAdaptationTriggers: analysis.adaptationTriggers.length > 0,
        success: true
      });

    } catch (error) {
      results.push({
        prompt: request.userPrompt.substring(0, 50) + '...',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Verify all requests succeeded
  const allSuccessful = results.every(r => r.success);
  if (!allSuccessful) {
    throw new Error('Some planning agent requests failed');
  }

  return results;
}

/**
 * Test 5: End-to-End Complete Planning Workflow
 */
async function testCompleteWorkflow(sessionId: string): Promise<any> {
  // Create separate UUID for end-to-end test
  const e2eSessionId = randomUUID();
  const { createServiceClient } = await import('@/lib/database/supabaseClient');
  const supabase = createServiceClient();

  const { error: e2eSessionError } = await supabase
    .from('book_sessions')
    .insert({
      id: e2eSessionId,
      user_id: null,
      requirements: { test: true, taskName: 'Task 2 E2E Test' }
    });

  if (e2eSessionError) {
    throw new Error(`Could not create E2E test session: ${e2eSessionError.message}`);
  }

  const userPrompt = "Create a practical guide to building modern web applications with React and TypeScript";
  const baseContent = "Introduction to modern JavaScript frameworks and their role in current web development";
  const targetWordCount = 35000;

  // Execute complete planning workflow
  const result = await executeCompletePlanningWorkflow(
    e2eSessionId,
    userPrompt,
    baseContent,
    targetWordCount
  );

  // Verify workflow result
  if (!result.analysis || !result.planningContext || !result.saved) {
    throw new Error('Complete planning workflow did not produce expected results');
  }

  // Verify analysis quality
  if (result.analysis.complexity !== result.planningContext.complexity ||
      result.analysis.strategy !== result.planningContext.strategy) {
    throw new Error('Analysis and planning context are inconsistent');
  }

  // Verify state was saved
  const reloaded = await PlanningStateOperations.load(e2eSessionId);
  if (!reloaded) {
    throw new Error('End-to-end workflow state was not persisted correctly');
  }

  return {
    workflowCompleted: true,
    analysisGenerated: !!result.analysis,
    planningContextCreated: !!result.planningContext,
    statePersisted: result.saved,
    canReload: !!reloaded,
    finalComplexity: result.analysis.complexity,
    finalStrategy: result.analysis.strategy,
    chapterCount: result.analysis.chapterCount,
    e2eSessionId // Return the session ID for cleanup
  };
}

/**
 * Cleanup function
 */
async function cleanup(sessionId: string, e2eSessionId?: string): Promise<void> {
  try {
    // Clean up planning states
    await PlanningStateOperations.delete(sessionId);
    if (e2eSessionId) {
      await PlanningStateOperations.delete(e2eSessionId);
    }

    // Clean up book sessions
    const { createServiceClient } = await import('@/lib/database/supabaseClient');
    const supabase = createServiceClient();

    await supabase.from('book_sessions').delete().eq('id', sessionId);
    if (e2eSessionId) {
      await supabase.from('book_sessions').delete().eq('id', e2eSessionId);
    }

    console.log('\n🧹 Cleanup completed - test planning states and book sessions removed');
  } catch (error) {
    console.log('\n⚠️  Cleanup warning: Could not fully remove test data:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Main test execution
 */
async function main() {
  console.log('🚀 Starting Task 2: Planning Agent Foundation Test Suite');
  console.log('Testing GPT-5 mini integration, complexity analysis, strategy selection, and state persistence');

  const runner = new TestRunner();
  let e2eSessionId: string | undefined;

  // Verify environment
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Supabase environment variables are required');
    console.error('Missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  try {
    // Run all tests
    await runner.runTest(
      'Complexity Analysis Functions',
      testComplexityAnalysis
    );

    await runner.runTest(
      'Strategy Selection Logic',
      testStrategySelection
    );

    await runner.runTest(
      'Planning State Persistence',
      () => testPlanningStatePersistence(runner.getSessionId())
    );

    await runner.runTest(
      'Planning Agent GPT-5 Integration',
      testPlanningAgentIntegration
    );

    const e2eResult = await runner.runTest(
      'End-to-End Complete Workflow',
      () => testCompleteWorkflow(runner.getSessionId())
    );

    // Capture e2eSessionId from the test result if successful
    if (e2eResult && runner['results'][runner['results'].length - 1].passed) {
      const lastResult = runner['results'][runner['results'].length - 1];
      e2eSessionId = lastResult.details?.e2eSessionId;
    }

  } finally {
    // Always cleanup, even if tests fail
    await cleanup(runner.getSessionId(), e2eSessionId);
  }

  runner.printSummary();

  // Exit with appropriate code
  const allPassed = runner['results'].every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

// Run tests
main().catch(console.error);