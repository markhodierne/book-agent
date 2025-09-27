#!/usr/bin/env npx tsx

/**
 * Isolate the exact outline generation error
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { BookGenerationAgents } from '../lib/agents/gpt5-wrapper';
import { WorkflowErrorContext, executeWithToolContext, logger } from '../lib/errors/exports';

async function testOutlineError(): Promise<void> {
  console.log('🔍 Testing Outline Generation Error');
  console.log('==================================\n');

  try {
    // Create error context like the outline node does
    const sessionId = 'test-error-session';
    const errorContext = new WorkflowErrorContext(sessionId, undefined);

    console.log('1. ✅ Error context created successfully');

    // Test the exact pattern from outline node
    const requirements = {
      topic: 'Python automation for beginners',
      wordCountTarget: 35000,
      audience: { level: 'beginner' },
      author: { name: 'Test Author' },
      styleGuide: { tone: 'conversational' },
      specializationArea: 'automation'
    };

    console.log('2. ✅ Requirements object created');

    // Test title generation exactly as outline node does it
    const userPrompt = `Generate 3-5 book title options for: ${requirements.topic}`;

    console.log('3. 🎯 Testing title generation with executeWithToolContext...');

    try {
      const titleAgent = BookGenerationAgents.titleGenerator();
      console.log('   ✅ Title agent created');

      const response = await executeWithToolContext(
        'title_generation',
        { requirements },
        async () => {
          console.log('   🔄 Inside executeWithToolContext callback');
          console.log('   📝 Calling titleAgent.execute with:', { promptLength: userPrompt.length, hasErrorContext: !!errorContext });

          const result = await titleAgent.execute(userPrompt, errorContext);
          console.log('   ✅ titleAgent.execute completed:', { contentLength: result.content?.length });
          return result;
        },
        errorContext.sessionId
      );

      console.log('   ✅ executeWithToolContext completed successfully!');
      console.log(`   📝 Response content length: ${response.content?.length || 0}`);
      console.log(`   📄 First 100 chars: ${response.content?.slice(0, 100) || 'No content'}`);

    } catch (toolError) {
      console.log('   ❌ executeWithToolContext failed:');
      console.log(`      Error type: ${toolError?.constructor?.name}`);
      console.log(`      Error message: ${toolError instanceof Error ? toolError.message : toolError}`);
      console.log(`      Error string: ${String(toolError)}`);

      if (toolError instanceof Error) {
        console.log(`      Stack trace: ${toolError.stack}`);
      }

      // Check if it's a serialization issue
      try {
        JSON.stringify(toolError);
        console.log('   ✅ Error is JSON serializable');
      } catch (serializationError) {
        console.log('   ❌ Error is NOT JSON serializable - this could be the issue!');
        console.log(`      Serialization error: ${serializationError}`);
      }

      throw toolError;
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);

    // Enhanced error analysis
    console.log('\n🔍 Error Analysis:');
    console.log(`Type: ${error?.constructor?.name}`);
    console.log(`Message: ${error instanceof Error ? error.message : 'No message'}`);
    console.log(`String representation: ${String(error)}`);
    console.log(`JSON.stringify: ${JSON.stringify(error, null, 2)}`);

    if (error instanceof Error && error.stack) {
      console.log(`Stack: ${error.stack}`);
    }
  }
}

// Run the test
if (require.main === module) {
  testOutlineError().catch(console.error);
}