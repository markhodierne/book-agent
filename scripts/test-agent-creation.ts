#!/usr/bin/env npx tsx

/**
 * Test OpenAI Agent Creation
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Agent } from '@openai/agents';

async function testAgentCreation(): Promise<void> {
  console.log('🧪 Testing OpenAI Agent Creation');
  console.log('=================================\n');

  try {
    console.log('1. Creating basic agent...');

    const agent = new Agent({
      name: 'Test Agent',
      instructions: 'You are a test agent.',
      model: 'gpt-5-2025-08-07',
      reasoning_effort: 'medium',
      verbosity: 'medium',
    });

    console.log('✅ Agent created successfully!');
    console.log('Agent name:', agent.name);

  } catch (error) {
    console.error('❌ Agent creation failed:');
    console.error('Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testAgentCreation().catch(console.error);
}