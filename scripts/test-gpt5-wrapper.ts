#!/usr/bin/env tsx
/**
 * GPT-5 Mini Wrapper Testing Script
 * Tests the hybrid LangGraph + OpenAI Agents SDK integration with real API calls
 *
 * Usage:
 * npx tsx scripts/test-gpt5-wrapper.ts
 */

import { BookGenerationAgents, createGPT5Agent } from '../lib/agents/gpt5-wrapper';
import { validateEnvironment } from '../lib/config/environment';

// Validate environment before running
try {
  validateEnvironment();
  console.log('✅ Environment validation passed');
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  process.exit(1);
}

/**
 * Test basic GPT-5 agent functionality
 */
async function testBasicAgent() {
  console.log('\n🔬 Testing Basic GPT-5 Agent...');

  try {
    const basicAgent = createGPT5Agent({
      name: 'Test Agent',
      instructions: 'You are a helpful assistant for testing purposes. Respond with exactly "Hello from GPT-5!" and nothing else.',
      reasoning_effort: 'minimal',
      verbosity: 'low',
    });

    const startTime = Date.now();
    const response = await basicAgent.execute('Say hello');
    const duration = Date.now() - startTime;

    console.log('✅ Basic agent test successful!');
    console.log(`   Response: "${response.content}"`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Tokens: ${response.usage?.total_tokens || 'N/A'}`);

    if (response.reasoning) {
      console.log(`   Reasoning available: ${response.reasoning.length} chars`);
    }

    return true;
  } catch (error) {
    console.error('❌ Basic agent test failed:', error);
    return false;
  }
}

/**
 * Test title generation agent
 */
async function testTitleGenerator() {
  console.log('\n📝 Testing Title Generation Agent...');

  try {
    const titleAgent = BookGenerationAgents.titleGenerator();

    const prompt = `Create 5 compelling book titles for a book about "Machine Learning for Web Developers".

Book Details:
- Topic: Machine Learning for Web Developers
- Target Word Count: 35,000 words
- Audience: Frontend and backend web developers
- Expertise Level: intermediate
- Context: professional
- Author: Sarah Tech
- Content Approach: practical
- Coverage Depth: comprehensive
- Primary Angle: Integrating ML models into web applications

Generate titles that are:
1. Specific and descriptive of the actual content
2. Appealing to intermediate readers
3. Professional yet engaging
4. Clearly differentiated from each other
5. Appropriate for the professional context`;

    const startTime = Date.now();
    const response = await titleAgent.execute(prompt);
    const duration = Date.now() - startTime;

    console.log('✅ Title generation test successful!');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Tokens: ${response.usage?.total_tokens || 'N/A'}`);
    console.log(`   Content length: ${response.content.length} chars`);

    // Parse and display titles
    const lines = response.content.split('\n');
    const titles: string[] = [];

    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match && match[1]) {
        titles.push(match[1].trim());
      }
    }

    console.log(`   Titles generated: ${titles.length}`);
    titles.forEach((title, i) => {
      console.log(`      ${i + 1}. ${title}`);
    });

    if (response.reasoning) {
      console.log(`   Reasoning trace: ${response.reasoning.substring(0, 200)}...`);
    }

    return titles.length >= 3; // Should generate at least 3 titles
  } catch (error) {
    console.error('❌ Title generation test failed:', error);
    return false;
  }
}

/**
 * Test structure planner agent
 */
async function testStructurePlanner() {
  console.log('\n🏗️ Testing Structure Planner Agent...');

  try {
    const structureAgent = BookGenerationAgents.structurePlanner();

    const prompt = `Plan the chapter structure for "Machine Learning for Web Developers: A Practical Guide".

Requirements:
- Topic: Machine Learning for Web Developers
- Minimum Words: 35,000
- Audience: Frontend and backend web developers (intermediate level)
- Approach: practical
- Coverage: comprehensive
- Primary Focus: Integrating ML models into web applications
- Secondary Aspects: Model selection, Performance optimization, Production deployment

Create a logical chapter progression that:
1. Starts with foundational concepts appropriate for intermediate readers
2. Builds complexity gradually
3. Covers all aspects of Machine Learning for Web Developers
4. Matches the practical approach
5. Provides comprehensive coverage depth
6. Totals at least 35,000 words

Consider chapter dependencies and logical flow between topics.`;

    const startTime = Date.now();
    const response = await structureAgent.execute(prompt);
    const duration = Date.now() - startTime;

    console.log('✅ Structure planning test successful!');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Tokens: ${response.usage?.total_tokens || 'N/A'}`);
    console.log(`   Content length: ${response.content.length} chars`);

    // Parse structure info
    const content = response.content;
    const chaptersMatch = content.match(/TOTAL CHAPTERS:\s*(\d+)/i);
    const wordDistMatch = content.match(/WORD DISTRIBUTION:\s*(.+)/i);

    if (chaptersMatch) {
      console.log(`   Total chapters planned: ${chaptersMatch[1]}`);
    }

    if (wordDistMatch) {
      const words = wordDistMatch[1].split(',').map(w => parseInt(w.trim())).filter(w => !isNaN(w));
      const totalWords = words.reduce((sum, w) => sum + w, 0);
      console.log(`   Word distribution: ${words.length} values, total: ${totalWords.toLocaleString()}`);
    }

    // Find chapter titles
    const titleLines = content.split('\n').filter(line => line.match(/^\d+\./));
    console.log(`   Chapter titles found: ${titleLines.length}`);
    titleLines.slice(0, 3).forEach(line => {
      console.log(`      ${line.trim()}`);
    });
    if (titleLines.length > 3) {
      console.log(`      ... and ${titleLines.length - 3} more`);
    }

    if (response.reasoning) {
      console.log(`   Reasoning trace: ${response.reasoning.substring(0, 200)}...`);
    }

    return chaptersMatch !== null && titleLines.length >= 8; // Should plan at least 8 chapters
  } catch (error) {
    console.error('❌ Structure planning test failed:', error);
    return false;
  }
}

/**
 * Test outline creator agent
 */
async function testOutlineCreator() {
  console.log('\n📋 Testing Outline Creator Agent...');

  try {
    const outlineAgent = BookGenerationAgents.outlineCreator();

    const prompt = `Create a detailed outline for Chapter 1: "Introduction to Machine Learning for Web Developers" (2,500 words).

Book Context:
- Overall Topic: Machine Learning for Web Developers
- Target Audience: Frontend and backend web developers (intermediate level)
- Book Approach: practical
- Engagement Strategy: practical_examples

Chapter Context:
- This is chapter 1 of 12
- Previous chapters: None
- Following chapters: ML Fundamentals, Model Selection, etc.

Create an outline that:
1. Fits logically in the overall book structure
2. Provides 2,500 words of valuable content
3. Matches the intermediate expertise level
4. Uses the practical_examples engagement approach
5. Sets up concepts for later chapters`;

    const startTime = Date.now();
    const response = await outlineAgent.execute(prompt);
    const duration = Date.now() - startTime;

    console.log('✅ Outline creation test successful!');
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Tokens: ${response.usage?.total_tokens || 'N/A'}`);
    console.log(`   Content length: ${response.content.length} chars`);

    // Parse outline components
    const content = response.content;
    const overviewMatch = content.match(/CONTENT OVERVIEW:\s*(.+?)(?=\n[A-Z]|\n\n|$)/s);
    const objectivesMatch = content.match(/KEY OBJECTIVES:\s*(.*?)(?=\n[A-Z]|\n\n|$)/s);
    const researchMatch = content.match(/RESEARCH REQUIREMENTS:\s*(.*?)(?=\n[A-Z]|\n\n|$)/s);
    const depsMatch = content.match(/DEPENDENCIES:\s*(.+?)(?=\n[A-Z]|\n\n|$)/s);

    if (overviewMatch) {
      console.log(`   Content overview: ${overviewMatch[1].trim().substring(0, 100)}...`);
    }

    if (objectivesMatch) {
      const objectives = objectivesMatch[1].trim().split('\n').filter(line => line.trim().startsWith('-'));
      console.log(`   Key objectives: ${objectives.length} found`);
      objectives.slice(0, 2).forEach(obj => {
        console.log(`      ${obj.trim()}`);
      });
    }

    if (researchMatch) {
      const research = researchMatch[1].trim().split('\n').filter(line => line.trim().startsWith('-'));
      console.log(`   Research requirements: ${research.length} found`);
    }

    if (depsMatch) {
      console.log(`   Dependencies: ${depsMatch[1].trim()}`);
    }

    if (response.reasoning) {
      console.log(`   Reasoning trace: ${response.reasoning.substring(0, 200)}...`);
    }

    return overviewMatch !== null && objectivesMatch !== null;
  } catch (error) {
    console.error('❌ Outline creation test failed:', error);
    return false;
  }
}

/**
 * Test GPT-5 specific features
 */
async function testGPT5Features() {
  console.log('\n🧠 Testing GPT-5 Specific Features...');

  try {
    // Test different reasoning efforts
    const agents = [
      {
        name: 'Minimal Reasoning',
        agent: createGPT5Agent({
          name: 'Minimal Test',
          instructions: 'Give a brief answer about machine learning.',
          reasoning_effort: 'minimal',
          verbosity: 'low',
        })
      },
      {
        name: 'High Reasoning',
        agent: createGPT5Agent({
          name: 'High Reasoning Test',
          instructions: 'Give a thoughtful analysis about machine learning.',
          reasoning_effort: 'high',
          verbosity: 'high',
        })
      }
    ];

    const question = 'What is the most important concept in machine learning?';

    for (const { name, agent } of agents) {
      console.log(`\n   Testing ${name}:`);

      const startTime = Date.now();
      const response = await agent.execute(question);
      const duration = Date.now() - startTime;

      console.log(`      Duration: ${duration}ms`);
      console.log(`      Response length: ${response.content.length} chars`);
      console.log(`      Tokens: ${response.usage?.total_tokens || 'N/A'}`);
      console.log(`      Has reasoning: ${response.reasoning ? 'Yes' : 'No'}`);

      if (response.reasoning) {
        console.log(`      Reasoning length: ${response.reasoning.length} chars`);
      }
    }

    console.log('✅ GPT-5 features test completed!');
    return true;
  } catch (error) {
    console.error('❌ GPT-5 features test failed:', error);
    return false;
  }
}

/**
 * Main test function
 */
async function runAllTests() {
  console.log('🧪 GPT-5 Mini Wrapper Integration Test Suite');
  console.log('='.repeat(50));

  const tests = [
    { name: 'Basic Agent', test: testBasicAgent },
    { name: 'Title Generator', test: testTitleGenerator },
    { name: 'Structure Planner', test: testStructurePlanner },
    { name: 'Outline Creator', test: testOutlineCreator },
    { name: 'GPT-5 Features', test: testGPT5Features },
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
        console.log(`\n✅ ${name} test: PASSED`);
      } else {
        failed++;
        console.log(`\n❌ ${name} test: FAILED`);
      }
    } catch (error) {
      failed++;
      console.log(`\n💥 ${name} test: ERROR - ${error}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Test Suite Complete');
  console.log(`   ✅ Passed: ${passed}/${tests.length}`);
  console.log(`   ❌ Failed: ${failed}/${tests.length}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! GPT-5 wrapper is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the implementation or API configuration.');
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('💥 Test suite failed with error:', error);
  process.exit(1);
});