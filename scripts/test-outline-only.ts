#!/usr/bin/env npx tsx

/**
 * Test Outline Node in Isolation
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { OutlineNode } from '../lib/agents/nodes/outline';
import { createInitialState } from '../lib/agents/workflow';

async function testOutlineNode(): Promise<void> {
  console.log('🧪 Testing Outline Node in Isolation');
  console.log('====================================\n');

  try {
    // Create initial state with requirements
    const initialState = createInitialState(
      'outline-test-123',
      'Create a comprehensive guide about Python programming for absolute beginners who want to learn automation and web scraping'
    );

    // Add mock requirements
    const stateWithRequirements = {
      ...initialState,
      currentStage: 'outline' as const,
      requirements: {
        topic: 'Create a comprehensive guide about Python programming for absolute beginners who want to learn automation and web scraping',
        wordCountTarget: 35000,
        audience: {
          demographics: 'Software developers',
          expertiseLevel: 'intermediate' as const,
          priorKnowledge: ['Basic programming concepts', 'Command line usage'],
          readingContext: 'professional' as const
        },
        author: {
          name: 'Test Author',
          credentials: 'Software Engineer'
        },
        styleGuide: {
          tone: 'conversational',
          formality: 'professional' as const,
          targetLength: 'comprehensive' as const
        },
        scope: {
          approach: 'practical' as const,
          coverageDepth: 'comprehensive' as const,
          exampleDensity: 'extensive' as const
        },
        contentOrientation: {
          primaryAngle: 'Learn automation and web scraping',
          secondaryAspects: ['Beginner-friendly approach', 'Practical examples'],
          avoidanceList: ['Complex theory', 'Advanced algorithms']
        }
      }
    };

    console.log('1. 🏗️  State prepared');
    console.log('2. 🎯 Testing outline generation...');

    const outlineNode = new OutlineNode();
    const result = await outlineNode.execute(stateWithRequirements);

    console.log('✅ Outline generation successful!');
    console.log(`📚 Title: ${result.outline?.title}`);
    console.log(`📄 Chapters: ${result.outline?.chapters.length}`);
    console.log(`📊 Words: ${result.outline?.totalWordCount}`);

  } catch (error) {
    console.error('❌ Outline test failed:');
    console.error('Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testOutlineNode().catch(console.error);
}