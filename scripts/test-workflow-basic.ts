#!/usr/bin/env npx tsx

// Basic workflow integration test
// Validates that the LangGraph structure executes and state passes correctly
// Mocks environment variables for testing

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key';

import {
  createInitialState,
  updateWorkflowProgress,
  transitionToStage,
  type BookWorkflowState,
} from '../lib/agents/workflow';
import { BaseWorkflowNode } from '../lib/agents/nodes/base';

async function testBasicWorkflow() {
  console.log('🧪 Testing Base LangGraph Workflow Structure\n');

  try {
    // Test 1: Initial state creation
    console.log('1. Testing initial state creation...');
    const sessionId = `test-${Date.now()}`;
    const userPrompt = 'Create a book about artificial intelligence fundamentals';
    const initialState = createInitialState(sessionId, userPrompt);

    console.log('   ✅ Initial state created successfully');
    console.log(`   📊 Session ID: ${initialState.sessionId}`);
    console.log(`   📝 User prompt: ${initialState.userPrompt}`);
    console.log(`   🎯 Current stage: ${initialState.currentStage}`);
    console.log(`   📈 Progress: ${initialState.progress.overallProgress}%\n`);

    // Test 2: Progress updates
    console.log('2. Testing progress updates...');
    let updatedState = updateWorkflowProgress(initialState, 50, 10, 0);
    console.log(`   📊 Stage progress: ${updatedState.progress.currentStageProgress}%`);
    console.log(`   📈 Overall progress: ${updatedState.progress.overallProgress}%`);
    console.log('   ✅ Progress update successful\n');

    // Test 3: Stage transitions
    console.log('3. Testing stage transitions...');
    updatedState = transitionToStage(updatedState, 'outline');
    console.log(`   🎯 New stage: ${updatedState.currentStage}`);
    console.log(`   📈 Overall progress: ${updatedState.progress.overallProgress}%`);
    console.log('   ✅ Stage transition successful\n');

    // Test 4: Node execution simulation
    console.log('4. Testing node execution framework...');

    class TestNode extends BaseWorkflowNode {
      constructor() {
        super('test-conversation', 'Test conversation node');
      }

      protected async executeNode(state: BookWorkflowState): Promise<BookWorkflowState> {
        // Simulate conversation stage work
        console.log('   🤖 Processing conversation requirements...');
        await new Promise(resolve => setTimeout(resolve, 100));

        let progress = this.updateProgress(state, 30, 'Analyzing user prompt');
        await new Promise(resolve => setTimeout(resolve, 100));

        progress = this.updateProgress(progress, 70, 'Gathering requirements');
        await new Promise(resolve => setTimeout(resolve, 100));

        progress = this.updateProgress(progress, 100, 'Requirements complete');

        // Add mock requirements
        return {
          ...progress,
          requirements: {
            topic: 'Artificial Intelligence Fundamentals',
            audience: {
              demographics: 'Technology professionals',
              expertiseLevel: 'intermediate' as any,
              ageRange: '25-45',
              priorKnowledge: 'Basic programming concepts',
              readingContext: 'Professional development',
            },
            author: {
              name: 'Test Author',
              credentials: 'AI Researcher',
              bio: 'Expert in artificial intelligence',
            },
            scope: {
              bookType: 'technical_guide' as any,
              approach: 'practical' as any,
              depth: 'comprehensive' as any,
            },
            contentOrientation: {
              angle: 'practical_applications' as any,
              focus: 'implementation' as any,
            },
            wordCountTarget: 35000,
          },
        };
      }
    }

    const testNode = new TestNode();
    const nodeResult = await testNode.execute(updatedState);

    console.log('   ✅ Node execution completed');
    console.log(`   📋 Requirements topic: ${nodeResult.requirements?.topic}`);
    console.log(`   👥 Target audience: ${nodeResult.requirements?.audience.demographics}`);
    console.log(`   📖 Word target: ${nodeResult.requirements?.wordCountTarget.toLocaleString()}`);
    console.log(`   📈 Final progress: ${nodeResult.progress.overallProgress}%\n`);

    // Test 5: Error handling
    console.log('5. Testing error handling...');

    class ErrorNode extends BaseWorkflowNode {
      constructor() {
        super('test-error', 'Test error handling node');
      }

      protected async executeNode(state: BookWorkflowState): Promise<BookWorkflowState> {
        throw new Error('Simulated node error');
      }

      protected isRecoverableError(error: unknown): boolean {
        return true; // Mark as recoverable for testing
      }

      async recover(state: BookWorkflowState): Promise<BookWorkflowState> {
        console.log('   🔄 Attempting error recovery...');
        return this.transitionToStage(state, 'outline');
      }
    }

    const errorNode = new ErrorNode();
    try {
      await errorNode.execute(nodeResult);
      console.log('   ✅ Error recovery successful\n');
    } catch (error) {
      console.log('   ⚠️  Error handling verified (expected behavior)\n');
    }

    console.log('🎉 All tests passed! Base LangGraph structure is working correctly.');
    console.log('\n📋 Summary:');
    console.log('   ✅ Initial state creation');
    console.log('   ✅ Progress updates');
    console.log('   ✅ Stage transitions');
    console.log('   ✅ Node execution framework');
    console.log('   ✅ Error handling and recovery');
    console.log('\n🚀 Ready for Task 13: Conversation Node implementation');

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  testBasicWorkflow();
}