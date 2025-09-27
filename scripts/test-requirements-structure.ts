#!/usr/bin/env npx tsx

/**
 * Test the actual requirements structure from conversation node
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { ConversationNode } from '../lib/agents/nodes/conversation';
import { createInitialState } from '../lib/agents/workflow';

async function testRequirementsStructure(): Promise<void> {
  console.log('🔍 Testing Requirements Structure');
  console.log('===============================\n');

  try {
    // Create initial state exactly like the failing test
    const initialState = createInitialState(
      'test-requirements-structure',
      'Create a practical guide to Python automation and web scraping for beginners'
    );

    console.log('1. 🏗️ Initial state created');

    // Run conversation node to get actual requirements
    const conversationNode = new ConversationNode();
    const result = await conversationNode.execute(initialState);

    console.log('2. ✅ Conversation completed');

    // Examine the requirements structure
    const requirements = result.requirements;
    console.log('\n📋 Requirements Structure:');
    console.log(JSON.stringify(requirements, null, 2));

    // Test the specific properties used in generateTitleUserPrompt
    console.log('\n🔍 Properties Used in Title Prompt:');
    console.log(`- topic: ${requirements?.topic}`);
    console.log(`- wordCountTarget: ${requirements?.wordCountTarget}`);
    console.log(`- audience.demographics: ${requirements?.audience?.demographics}`);
    console.log(`- audience.expertiseLevel: ${requirements?.audience?.expertiseLevel || requirements?.audience?.level}`);
    console.log(`- audience.readingContext: ${requirements?.audience?.readingContext}`);
    console.log(`- author.name: ${requirements?.author?.name}`);
    console.log(`- scope.approach: ${requirements?.scope?.approach}`);

    // Check for undefined properties
    const missingProps = [];
    if (!requirements?.audience?.demographics) missingProps.push('audience.demographics');
    if (!requirements?.audience?.expertiseLevel && !requirements?.audience?.level) missingProps.push('audience.expertiseLevel/level');
    if (!requirements?.audience?.readingContext) missingProps.push('audience.readingContext');
    if (!requirements?.scope?.approach) missingProps.push('scope.approach');

    if (missingProps.length > 0) {
      console.log(`\n❌ Missing properties: ${missingProps.join(', ')}`);
    } else {
      console.log('\n✅ All required properties present');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

// Run the test
if (require.main === module) {
  testRequirementsStructure().catch(console.error);
}