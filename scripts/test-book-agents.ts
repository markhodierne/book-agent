#!/usr/bin/env npx tsx

/**
 * Test BookGenerationAgents
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { BookGenerationAgents } from '../lib/agents/gpt5-wrapper';

async function testBookAgents(): Promise<void> {
  console.log('🧪 Testing BookGenerationAgents');
  console.log('===============================\n');

  try {
    console.log('1. Creating title generator...');
    const titleAgent = BookGenerationAgents.titleGenerator();
    console.log('✅ Title generator created successfully!');

    console.log('2. Creating structure planner...');
    const structureAgent = BookGenerationAgents.structurePlanner();
    console.log('✅ Structure planner created successfully!');

    console.log('3. Creating outline creator...');
    const outlineAgent = BookGenerationAgents.outlineCreator();
    console.log('✅ Outline creator created successfully!');

    console.log('4. Creating chapter writer...');
    const chapterAgent = BookGenerationAgents.chapterWriter();
    console.log('✅ Chapter writer created successfully!');

  } catch (error) {
    console.error('❌ BookGenerationAgents test failed:');
    console.error('Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testBookAgents().catch(console.error);
}