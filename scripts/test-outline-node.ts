#!/usr/bin/env tsx
/**
 * Testing script for Outline Generation Node
 * Tests real OpenAI integration and outline generation functionality
 *
 * Usage:
 * npx tsx scripts/test-outline-node.ts [--topic "Custom Topic"] [--words 35000]
 *
 * Examples:
 * npx tsx scripts/test-outline-node.ts
 * npx tsx scripts/test-outline-node.ts --topic "Machine Learning for Beginners" --words 40000
 * npx tsx scripts/test-outline-node.ts --topic "Web Development with React" --words 50000
 */

import { OutlineNode } from '../lib/agents/nodes/outline';
import { WorkflowState, BookRequirements } from '../types';
import { validateEnvironment } from '../lib/config/environment';

// Validate environment before running
try {
  validateEnvironment();
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  process.exit(1);
}

/**
 * Sample requirements for testing different scenarios
 */
const sampleRequirements: Record<string, BookRequirements> = {
  'ai-beginner': {
    topic: 'Artificial Intelligence for Beginners',
    audience: {
      demographics: 'Software developers and tech enthusiasts',
      expertiseLevel: 'beginner',
      ageGroup: '25-40',
      context: 'professional',
    },
    author: {
      name: 'Dr. AI Expert',
      credentials: 'PhD in Computer Science, 10 years in AI research',
    },
    scope: {
      purpose: 'educational',
      approach: 'practical',
      coverageDepth: 'comprehensive',
    },
    contentOrientation: {
      primaryAngle: 'Practical AI implementation for everyday developers',
      secondaryAngles: ['Theoretical foundations', 'Real-world case studies', 'Ethics considerations'],
      engagementStrategy: 'practical_examples',
    },
    wordCountTarget: 35000,
  },
  'web-dev': {
    topic: 'Modern Web Development with React',
    audience: {
      demographics: 'Frontend developers and web designers',
      expertiseLevel: 'intermediate',
      ageGroup: '22-35',
      context: 'professional',
    },
    author: {
      name: 'Sarah Frontend',
      credentials: 'Senior React Developer at Tech Corp',
    },
    scope: {
      purpose: 'educational',
      approach: 'practical',
      coverageDepth: 'detailed',
    },
    contentOrientation: {
      primaryAngle: 'Building production-ready React applications',
      secondaryAngles: ['Performance optimization', 'Testing strategies', 'Deployment best practices'],
      engagementStrategy: 'step_by_step',
    },
    wordCountTarget: 42000,
  },
  'data-science': {
    topic: 'Data Science with Python',
    audience: {
      demographics: 'Analysts, researchers, and Python developers',
      expertiseLevel: 'intermediate',
      ageGroup: '25-45',
      context: 'professional',
    },
    author: {
      name: 'Dr. Data Scientist',
      credentials: 'PhD in Statistics, Lead Data Scientist',
    },
    scope: {
      purpose: 'educational',
      approach: 'comprehensive',
      coverageDepth: 'detailed',
    },
    contentOrientation: {
      primaryAngle: 'End-to-end data science workflows',
      secondaryAngles: ['Statistical analysis', 'Machine learning', 'Data visualization'],
      engagementStrategy: 'case_studies',
    },
    wordCountTarget: 48000,
  },
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let topic = 'ai-beginner'; // default
  let customTopic: string | undefined;
  let wordCount: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic' && args[i + 1]) {
      customTopic = args[i + 1];
      i++;
    } else if (args[i] === '--words' && args[i + 1]) {
      wordCount = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--preset' && args[i + 1]) {
      topic = args[i + 1];
      i++;
    }
  }

  return { topic, customTopic, wordCount };
}

/**
 * Create test requirements based on arguments
 */
function createTestRequirements(topic: string, customTopic?: string, wordCount?: number): BookRequirements {
  const base = sampleRequirements[topic] || sampleRequirements['ai-beginner'];

  if (customTopic) {
    base.topic = customTopic;
  }

  if (wordCount && wordCount >= 30000) {
    base.wordCountTarget = wordCount;
  }

  return base;
}

/**
 * Create test workflow state
 */
function createTestState(requirements: BookRequirements): WorkflowState {
  return {
    sessionId: `test-outline-${Date.now()}`,
    userId: 'test-user',
    currentStage: 'outline',
    status: 'active',
    userPrompt: `I want to create a comprehensive book about ${requirements.topic}`,
    requirements,
    chapters: [],
    progress: {
      currentStageProgress: 0,
      overallProgress: 25,
      chaptersCompleted: 0,
      totalChapters: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Main testing function
 */
async function testOutlineGeneration() {
  console.log('🧪 Testing Outline Generation Node\n');

  const { topic, customTopic, wordCount } = parseArgs();
  const requirements = createTestRequirements(topic, customTopic, wordCount);
  const testState = createTestState(requirements);

  console.log('📋 Test Configuration:');
  console.log(`   Topic: ${requirements.topic}`);
  console.log(`   Target Words: ${requirements.wordCountTarget.toLocaleString()}`);
  console.log(`   Audience: ${requirements.audience.demographics}`);
  console.log(`   Expertise: ${requirements.audience.expertiseLevel}`);
  console.log(`   Approach: ${requirements.scope.approach}\n`);

  try {
    console.log('🚀 Starting outline generation...\n');
    const startTime = Date.now();

    // Create and execute outline node
    const outlineNode = new OutlineNode();
    const result = await outlineNode.execute(testState);

    const duration = Date.now() - startTime;

    if (result.error) {
      console.error('❌ Outline generation failed:');
      console.error(`   Error: ${result.error}`);
      console.error(`   Retry needed: ${result.needsRetry ? 'Yes' : 'No'}`);
      return;
    }

    // Display results
    console.log('✅ Outline generation completed successfully!\n');
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)} seconds\n`);

    if (result.outline) {
      console.log('📖 Generated Book Outline:');
      console.log('━'.repeat(60));
      console.log(`📚 Title: ${result.outline.title}`);
      if (result.outline.subtitle) {
        console.log(`📝 Subtitle: ${result.outline.subtitle}`);
      }
      console.log(`📊 Total Word Count: ${result.outline.totalWordCount.toLocaleString()}`);
      console.log(`📄 Estimated Pages: ${result.outline.estimatedPages}`);
      console.log(`📑 Total Chapters: ${result.outline.chapters.length}\n`);

      console.log('📋 Chapter Breakdown:');
      console.log('━'.repeat(60));

      result.outline.chapters.forEach((chapter, index) => {
        console.log(`\n${index + 1}. ${chapter.title}`);
        console.log(`   📝 ${chapter.wordCount.toLocaleString()} words`);
        console.log(`   📋 Overview: ${chapter.contentOverview.substring(0, 100)}${chapter.contentOverview.length > 100 ? '...' : ''}`);

        if (chapter.keyObjectives.length > 0) {
          console.log(`   🎯 Key Objectives:`);
          chapter.keyObjectives.slice(0, 3).forEach(obj => {
            console.log(`      • ${obj}`);
          });
        }

        if (chapter.dependencies.length > 0) {
          console.log(`   🔗 Dependencies: Chapters ${chapter.dependencies.join(', ')}`);
        }

        if (chapter.researchRequirements.length > 0) {
          console.log(`   🔍 Research: ${chapter.researchRequirements.slice(0, 2).join(', ')}`);
        }
      });

      console.log('\n━'.repeat(60));
      console.log('📊 Analysis:');
      console.log(`   • Average chapter length: ${Math.round(result.outline.totalWordCount / result.outline.chapters.length).toLocaleString()} words`);
      console.log(`   • Shortest chapter: ${Math.min(...result.outline.chapters.map(c => c.wordCount)).toLocaleString()} words`);
      console.log(`   • Longest chapter: ${Math.max(...result.outline.chapters.map(c => c.wordCount)).toLocaleString()} words`);

      const chaptersWithDeps = result.outline.chapters.filter(c => c.dependencies.length > 0);
      console.log(`   • Chapters with dependencies: ${chaptersWithDeps.length}/${result.outline.chapters.length}`);

      const avgObjectives = result.outline.chapters.reduce((sum, c) => sum + c.keyObjectives.length, 0) / result.outline.chapters.length;
      console.log(`   • Average objectives per chapter: ${avgObjectives.toFixed(1)}`);

      // Title options if available
      if ((result as any).titleOptions) {
        console.log('\n🏷️  Alternative Titles Generated:');
        (result as any).titleOptions.forEach((title: string, index: number) => {
          console.log(`   ${index + 1}. ${title}`);
        });
      }
    }

    console.log('\n✨ Test completed successfully!');

  } catch (error) {
    console.error('💥 Test failed with error:');
    console.error(error);

    if (error instanceof Error) {
      console.error('\n🔍 Error details:');
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack?.split('\n')[1]?.trim()}`);
    }
  }
}

/**
 * Display usage information
 */
function showUsage() {
  console.log(`
🧪 Outline Generation Node Test Tool

Usage:
  npx tsx scripts/test-outline-node.ts [options]

Options:
  --preset <name>     Use preset requirements (ai-beginner, web-dev, data-science)
  --topic <string>    Custom topic for the book
  --words <number>    Target word count (minimum 30,000)
  --help             Show this help message

Examples:
  npx tsx scripts/test-outline-node.ts
  npx tsx scripts/test-outline-node.ts --preset web-dev
  npx tsx scripts/test-outline-node.ts --topic "iOS Development with Swift" --words 45000
  npx tsx scripts/test-outline-node.ts --preset data-science --words 50000

Available Presets:
  • ai-beginner     - Artificial Intelligence for Beginners (35K words)
  • web-dev         - Modern Web Development with React (42K words)
  • data-science    - Data Science with Python (48K words)
`);
}

// Run the test
if (process.argv.includes('--help')) {
  showUsage();
} else {
  testOutlineGeneration().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}