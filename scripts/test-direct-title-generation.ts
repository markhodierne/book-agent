#!/usr/bin/env npx tsx

/**
 * Test Title Generation Directly
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { BookGenerationAgents } from '../lib/agents/gpt5-wrapper';
import { WorkflowErrorContext } from '../lib/errors/exports';

async function testDirectTitleGeneration(): Promise<void> {
  console.log('🧪 Testing Direct Title Generation');
  console.log('==================================\n');

  try {
    console.log('1. Creating title generator...');
    const titleAgent = BookGenerationAgents.titleGenerator();
    console.log('✅ Title generator created');

    console.log('2. Creating error context...');
    const errorContext = new WorkflowErrorContext('test-session', 'test-user');
    console.log('✅ Error context created');

    console.log('3. Preparing prompt...');
    const prompt = `Generate 5 book titles for a comprehensive guide about Python programming for absolute beginners who want to learn automation and web scraping.

Requirements:
- Topic: Python programming for beginners with focus on automation and web scraping
- Target audience: Absolute beginners
- Word count target: 35,000 words
- Expertise level: Beginner to intermediate
- Practical, hands-on approach

Generate titles that are:
1. Specific and descriptive of the actual content
2. Appealing to beginners
3. Professional yet accessible
4. Clearly differentiated from each other
5. Include automation and web scraping themes

Format as:
1. [Title]: [Optional Subtitle]
2. [Title]: [Optional Subtitle]
...`;

    console.log('✅ Prompt prepared');

    console.log('4. Executing title generation...');
    const response = await titleAgent.execute(prompt, errorContext);

    console.log('✅ Title generation completed!');
    console.log('Response content:');
    console.log(response.content);

  } catch (error) {
    console.error('❌ Direct title generation failed:');
    console.error('Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testDirectTitleGeneration().catch(console.error);
}