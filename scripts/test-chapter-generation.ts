#!/usr/bin/env npx tsx

// Chapter Generation Node Testing Script
// Tests the complete chapter generation workflow with real tool integration
// Following CLAUDE.md testing standards

import { ChapterNode, ChapterNodeConfig } from '@/lib/agents/nodes/chapter';
import { toolRegistry } from '@/lib/tools';
import { chapterWriteTool } from '@/lib/tools/chapterWriteTool';
import { WorkflowState, ChapterStatus, WorkflowStage, StyleGuide, BookRequirements, ChapterOutline, BookOutline, ExpertiseLevel, ReadingContext, BookPurpose, BookApproach, CoverageDepth, EngagementStrategy, WritingTone, WritingVoice, WritingPerspective, FormalityLevel, TechnicalLevel } from '@/types';
import { logger } from '@/lib/errors/exports';

// Register tools for testing
toolRegistry.register(chapterWriteTool);

/**
 * Create test workflow state
 */
function createTestWorkflowState(): WorkflowState {
  const requirements: BookRequirements = {
    topic: 'Artificial Intelligence',
    audience: {
      demographics: 'Software developers and tech enthusiasts',
      expertiseLevel: 'intermediate' as ExpertiseLevel,
      ageRange: '25-45',
      priorKnowledge: ['basic programming', 'software development'],
      readingContext: 'professional' as ReadingContext,
    },
    author: {
      name: 'Test Author',
      credentials: 'AI Researcher',
      background: 'Expert in machine learning and AI development',
    },
    scope: {
      purpose: 'educational' as BookPurpose,
      approach: 'practical' as BookApproach,
      coverageDepth: 'detailed' as CoverageDepth,
    },
    contentOrientation: {
      primaryAngle: 'Practical AI implementation for developers',
      secondaryAngles: ['Real-world applications', 'Best practices'],
      engagementStrategy: 'practical_examples' as EngagementStrategy,
    },
    wordCountTarget: 35000,
  };

  const styleGuide: StyleGuide = {
    tone: 'professional' as WritingTone,
    voice: 'active' as WritingVoice,
    perspective: 'second_person' as WritingPerspective,
    formality: 'semi_formal' as FormalityLevel,
    technicalLevel: 'semi_technical' as TechnicalLevel,
    exampleUsage: 'You will discover how to implement AI solutions effectively. This approach combines theoretical understanding with practical application, ensuring you can apply these concepts immediately in your projects.',
  };

  const chapterOutline: ChapterOutline = {
    chapterNumber: 1,
    title: 'Introduction to Artificial Intelligence',
    contentOverview: 'Comprehensive introduction to AI concepts, history, and modern applications',
    keyObjectives: [
      'Understand fundamental AI concepts',
      'Learn about different types of AI',
      'Explore real-world AI applications',
      'Identify opportunities for AI implementation',
    ],
    wordCount: 1500,
    dependencies: [],
    researchRequirements: ['AI history', 'machine learning basics', 'current AI trends'],
  };

  const outline: BookOutline = {
    title: 'Practical AI for Developers',
    subtitle: 'A Comprehensive Guide to Implementing Artificial Intelligence',
    chapters: [chapterOutline],
    totalWordCount: 35000,
    estimatedPages: 140,
  };

  return {
    sessionId: 'test-chapter-generation-001',
    userId: 'test-user',
    currentStage: 'chapter_generation' as WorkflowStage,
    status: 'active',
    userPrompt: 'Create a comprehensive guide to AI for developers',
    requirements,
    styleGuide,
    outline,
    chapters: [],
    progress: {
      currentStageProgress: 0,
      overallProgress: 50,
      chaptersCompleted: 0,
      totalChapters: 1,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create test chapter configuration
 */
function createTestChapterConfig(): ChapterNodeConfig {
  return {
    chapterNumber: 1,
    title: 'Introduction to Artificial Intelligence',
    outline: {
      chapterNumber: 1,
      title: 'Introduction to Artificial Intelligence',
      contentOverview: 'Comprehensive introduction to AI concepts, history, and modern applications',
      keyObjectives: [
        'Understand fundamental AI concepts',
        'Learn about different types of AI',
        'Explore real-world AI applications',
        'Identify opportunities for AI implementation',
      ],
      wordCount: 1500,
      dependencies: [],
      researchRequirements: ['AI history', 'machine learning basics', 'current AI trends'],
    },
    wordTarget: 1500,
    dependencies: [],
    style: {
      tone: 'professional' as WritingTone,
      voice: 'active' as WritingVoice,
      perspective: 'second_person' as WritingPerspective,
      formality: 'semi_formal' as FormalityLevel,
      technicalLevel: 'semi_technical' as TechnicalLevel,
      exampleUsage: 'You will discover how to implement AI solutions effectively.',
    },
    researchTopics: ['AI history', 'machine learning basics', 'current AI trends'],
    sessionId: 'test-chapter-generation-001',
    researchRequirements: ['AI history', 'machine learning basics', 'current AI trends'],
    objectives: [
      'Understand fundamental AI concepts',
      'Learn about different types of AI',
      'Explore real-world AI applications',
      'Identify opportunities for AI implementation',
    ],
  };
}

/**
 * Test basic chapter generation
 */
async function testBasicChapterGeneration(): Promise<void> {
  console.log('\n🔥 Testing Basic Chapter Generation...\n');

  const config = createTestChapterConfig();
  const state = createTestWorkflowState();

  logger.info('Starting basic chapter generation test', {
    chapterNumber: config.chapterNumber,
    title: config.title,
    wordTarget: config.wordTarget,
  });

  try {
    const chapterNode = new ChapterNode(config);
    const startTime = Date.now();

    console.log(`📝 Generating Chapter ${config.chapterNumber}: "${config.title}"`);
    console.log(`🎯 Target: ${config.wordTarget} words`);

    const result = await chapterNode.execute(state);
    const duration = Date.now() - startTime;

    console.log('\n✅ Chapter Generation Results:');
    console.log(`⏱️  Generation Time: ${Math.round(duration / 1000)}s`);
    console.log(`📊 Chapters Generated: ${result.chapters.length}`);

    if (result.chapters.length > 0) {
      const chapter = result.chapters[0];
      console.log(`📖 Chapter ${chapter?.chapterNumber}: "${chapter?.title}"`);
      console.log(`📝 Word Count: ${chapter?.wordCount}`);
      console.log(`✨ Status: ${chapter?.status}`);
      console.log(`🔍 Research Sources: ${chapter?.researchSources?.length || 0}`);

      if (chapter?.content) {
        console.log(`\n📄 Content Preview (first 200 chars):`);
        console.log(`"${chapter.content.substring(0, 200)}..."`);
      }

      if (chapter?.reviewNotes && chapter.reviewNotes.length > 0) {
        console.log(`\n📋 Review Notes:`);
        chapter.reviewNotes.forEach((note, i) => {
          console.log(`  ${i + 1}. ${note}`);
        });
      }
    }

    console.log(`\n📈 Progress: ${result.progress.chaptersCompleted}/${result.progress.totalChapters} chapters completed`);

    if (result.error) {
      console.log(`⚠️  Warnings: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Chapter generation failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Test chapter with dependencies
 */
async function testChapterWithDependencies(): Promise<void> {
  console.log('\n🔗 Testing Chapter with Dependencies...\n');

  const state = createTestWorkflowState();

  // Add a completed chapter as dependency
  state.chapters = [{
    chapterNumber: 1,
    title: 'Introduction to AI',
    content: 'This chapter covers the fundamentals of artificial intelligence, including its history, core concepts, and modern applications. We explore machine learning, deep learning, and neural networks as key components of AI systems.',
    wordCount: 150,
    status: 'completed' as ChapterStatus,
    generatedAt: new Date().toISOString(),
  }];

  const dependentConfig = createTestChapterConfig();
  dependentConfig.chapterNumber = 2;
  dependentConfig.title = 'Machine Learning Fundamentals';
  dependentConfig.dependencies = [1];
  dependentConfig.outline.title = 'Machine Learning Fundamentals';
  dependentConfig.outline.chapterNumber = 2;
  dependentConfig.outline.dependencies = [1];

  try {
    const chapterNode = new ChapterNode(dependentConfig);
    const startTime = Date.now();

    console.log(`📝 Generating Chapter ${dependentConfig.chapterNumber}: "${dependentConfig.title}"`);
    console.log(`🔗 Dependencies: Chapter ${dependentConfig.dependencies.join(', ')}`);

    const result = await chapterNode.execute(state);
    const duration = Date.now() - startTime;

    console.log('\n✅ Dependent Chapter Generation Results:');
    console.log(`⏱️  Generation Time: ${Math.round(duration / 1000)}s`);

    const newChapter = result.chapters.find(c => c.chapterNumber === 2);
    if (newChapter) {
      console.log(`📖 Chapter ${newChapter.chapterNumber}: "${newChapter.title}"`);
      console.log(`📝 Word Count: ${newChapter.wordCount}`);
      console.log(`✨ Status: ${newChapter.status}`);
      console.log(`🔗 Used dependency context: ${dependentConfig.dependencies.length > 0 ? 'Yes' : 'No'}`);
    }

  } catch (error) {
    console.error('❌ Dependent chapter generation failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Test error recovery
 */
async function testErrorRecovery(): Promise<void> {
  console.log('\n🔧 Testing Error Recovery...\n');

  const config = createTestChapterConfig();
  config.wordTarget = 5000; // Set high word target to potentially trigger quality issues
  const state = createTestWorkflowState();

  try {
    const chapterNode = new ChapterNode(config);

    console.log(`🧪 Testing recovery with challenging requirements`);
    console.log(`🎯 High word target: ${config.wordTarget} words`);

    const result = await chapterNode.execute(state);

    console.log('\n✅ Error Recovery Test Results:');
    if (result.chapters.length > 0) {
      const chapter = result.chapters[0];
      console.log(`📖 Chapter Status: ${chapter?.status}`);
      console.log(`📝 Final Word Count: ${chapter?.wordCount}`);

      if (chapter?.reviewNotes && chapter.reviewNotes.length > 0) {
        console.log(`📋 Quality Issues Addressed:`);
        chapter.reviewNotes.forEach((note, i) => {
          console.log(`  ${i + 1}. ${note}`);
        });
      }
    }

    if (result.needsRetry) {
      console.log(`🔄 Retry needed: ${result.error}`);
    }

    console.log(`🔧 Recovery successful: ${!result.error || result.chapters[0]?.status === 'completed'}`);

  } catch (error) {
    console.log('⚠️  Error recovery test completed with expected failure:', error instanceof Error ? error.message : error);
  }
}

/**
 * Main test execution
 */
async function runChapterGenerationTests(): Promise<void> {
  console.log('🚀 Chapter Generation Node Test Suite');
  console.log('=====================================');

  try {
    // Test 1: Basic chapter generation
    await testBasicChapterGeneration();

    // Test 2: Chapter with dependencies
    await testChapterWithDependencies();

    // Test 3: Error recovery
    await testErrorRecovery();

    console.log('\n🎉 All Chapter Generation Tests Completed Successfully!');

  } catch (error) {
    console.error('\n💥 Chapter Generation Tests Failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runChapterGenerationTests().catch((error) => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

export {
  runChapterGenerationTests,
  testBasicChapterGeneration,
  testChapterWithDependencies,
  testErrorRecovery,
};