#!/usr/bin/env npx tsx
// Chapter Spawning Node Testing Script
// Interactive testing for Task 15 implementation

import { createChapterSpawningNode, validateChapterSpawningPrerequisites } from '../lib/agents/nodes/chapterSpawning';
import { createMockWorkflowState, createMockBookOutline } from '../__tests__/fixtures/workflow-fixtures';
import { WorkflowState, BookOutline } from '../types';

// Test scenarios
const testScenarios = {
  simple: {
    name: 'Simple 3-Chapter Book',
    outline: createSimpleOutline(),
  },
  complex: {
    name: 'Complex 12-Chapter Book with Dependencies',
    outline: createComplexOutline(),
  },
  minimal: {
    name: 'Minimal 8-Chapter Book (Minimum Requirements)',
    outline: createMinimalOutline(),
  },
  large: {
    name: 'Large 20-Chapter Academic Book',
    outline: createLargeOutline(),
  },
};

async function main() {
  console.log('🚀 Chapter Spawning Node Testing Script');
  console.log('Testing Task 15: Dynamic Parallel Chapter Generation\n');

  // Get command line arguments
  const args = process.argv.slice(2);
  const scenarioName = args[0] || 'simple';
  const verbose = args.includes('--verbose') || args.includes('-v');

  if (!testScenarios[scenarioName as keyof typeof testScenarios]) {
    console.error(`❌ Unknown scenario: ${scenarioName}`);
    console.log('Available scenarios:');
    Object.keys(testScenarios).forEach(key => {
      const scenario = testScenarios[key as keyof typeof testScenarios];
      console.log(`  - ${key}: ${scenario.name}`);
    });
    process.exit(1);
  }

  const scenario = testScenarios[scenarioName as keyof typeof testScenarios];
  console.log(`📖 Testing scenario: ${scenario.name}\n`);

  try {
    // 1. Create test state
    console.log('📋 Step 1: Creating test workflow state...');
    const testState = createTestState(scenario.outline);

    if (verbose) {
      console.log(`   📊 State created:`, {
        sessionId: testState.sessionId,
        stage: testState.currentStage,
        chaptersInOutline: testState.outline?.chapters.length,
        totalWordCount: testState.outline?.totalWordCount,
      });
    }

    // 2. Validate prerequisites
    console.log('✅ Step 2: Validating prerequisites...');
    const validation = validateChapterSpawningPrerequisites(testState);

    if (!validation.valid) {
      console.error('❌ Prerequisites validation failed:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
      return;
    }
    console.log('   ✅ All prerequisites met');

    // 3. Create and test the node
    console.log('🏗️  Step 3: Creating chapter spawning node...');
    const spawningNode = createChapterSpawningNode();

    if (verbose) {
      console.log(`   📝 Node created:`, {
        name: spawningNode.name,
        description: spawningNode.description,
      });
    }

    // 4. Validate the node can process the state
    console.log('🔍 Step 4: Validating node input...');
    const canProcess = spawningNode.validate(testState);

    if (!canProcess) {
      console.error('❌ Node validation failed - state is not valid for processing');
      return;
    }
    console.log('   ✅ Node can process the state');

    // 5. Execute the spawning process
    console.log('⚙️  Step 5: Executing chapter spawning...');
    const startTime = Date.now();

    // Mock the dependencies for testing
    mockDependencies();

    const resultState = await spawningNode.execute(testState);
    const executionTime = Date.now() - startTime;

    console.log(`   ✅ Chapter spawning completed in ${executionTime}ms`);

    // 6. Analyze results
    console.log('📊 Step 6: Analyzing results...');
    analyzeResults(resultState, verbose);

    console.log('\n🎉 Chapter spawning test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error instanceof Error ? error.message : 'Unknown error');

    if (verbose && error instanceof Error) {
      console.error('\n🐛 Full error details:');
      console.error(error.stack);
    }
  }
}

function createTestState(outline: BookOutline): WorkflowState {
  const baseState = createMockWorkflowState();
  return {
    ...baseState,
    currentStage: 'chapter_spawning',
    outline,
    progress: {
      ...baseState.progress,
      totalChapters: outline.chapters.length,
    },
  };
}

function createSimpleOutline(): BookOutline {
  return {
    title: 'Simple AI Guide',
    subtitle: 'An Introduction to Artificial Intelligence',
    chapters: [
      {
        chapterNumber: 1,
        title: 'What is AI?',
        contentOverview: 'Basic introduction to artificial intelligence concepts and terminology',
        keyObjectives: ['Define AI', 'Explain key concepts', 'Provide historical context'],
        wordCount: 2000,
        dependencies: [],
        researchRequirements: ['AI history', 'Basic definitions'],
      },
      {
        chapterNumber: 2,
        title: 'Types of AI',
        contentOverview: 'Different categories and applications of artificial intelligence systems',
        keyObjectives: ['Classify AI types', 'Explain applications', 'Compare approaches'],
        wordCount: 2500,
        dependencies: [1],
        researchRequirements: ['AI categorization', 'Current applications'],
      },
      {
        chapterNumber: 3,
        title: 'Future of AI',
        contentOverview: 'Predictions and trends for the future development of AI technology',
        keyObjectives: ['Analyze trends', 'Predict developments', 'Discuss implications'],
        wordCount: 2200,
        dependencies: [1, 2],
        researchRequirements: ['Future predictions', 'Industry trends'],
      },
    ],
    totalWordCount: 30700,
    estimatedPages: 123,
  };
}

function createComplexOutline(): BookOutline {
  const chapters = [];

  // Create 12 chapters with complex dependencies
  for (let i = 1; i <= 12; i++) {
    const dependencies = [];

    if (i === 2 || i === 3) dependencies.push(1);
    if (i >= 4 && i <= 6) dependencies.push(2);
    if (i >= 7 && i <= 9) dependencies.push(3);
    if (i >= 10) dependencies.push(4, 5, 6);

    chapters.push({
      chapterNumber: i,
      title: `Advanced AI Topic ${i}`,
      contentOverview: `Detailed exploration of advanced artificial intelligence concept ${i} with practical applications and theoretical foundations`,
      keyObjectives: [
        `Master concept ${i}`,
        `Apply practical techniques`,
        `Understand theoretical foundations`,
        `Implement real-world solutions`,
      ],
      wordCount: 2500 + (i * 100), // Increasing word count
      dependencies,
      researchRequirements: [`Topic ${i} research`, `Industry applications`, `Academic literature`],
    });
  }

  return {
    title: 'Advanced AI: Theory and Practice',
    subtitle: 'A Comprehensive Guide to Modern Artificial Intelligence',
    chapters,
    totalWordCount: chapters.reduce((sum, ch) => sum + ch.wordCount, 0),
    estimatedPages: Math.ceil(chapters.reduce((sum, ch) => sum + ch.wordCount, 0) / 250),
  };
}

function createMinimalOutline(): BookOutline {
  const chapters = [];

  // Create exactly 8 chapters (minimum) with exactly 30,000 words
  for (let i = 1; i <= 8; i++) {
    chapters.push({
      chapterNumber: i,
      title: `Essential AI Chapter ${i}`,
      contentOverview: `This chapter covers essential artificial intelligence concepts and provides the foundation for understanding modern AI systems and applications`,
      keyObjectives: [
        'Understand core concepts',
        'Learn practical applications',
        'Master fundamental principles',
      ],
      wordCount: 3750, // 8 * 3750 = 30,000
      dependencies: i > 1 ? [i - 1] : [], // Simple sequential dependency
      researchRequirements: ['Core AI concepts', 'Practical examples'],
    });
  }

  return {
    title: 'AI Essentials: The Complete Guide',
    subtitle: 'Everything You Need to Know About Artificial Intelligence',
    chapters,
    totalWordCount: 30000,
    estimatedPages: 120,
  };
}

function createLargeOutline(): BookOutline {
  const chapters = [];

  // Create 20 chapters for a comprehensive academic book
  for (let i = 1; i <= 20; i++) {
    const dependencies = [];

    // Create realistic dependency chains
    if (i <= 5) {
      // Introduction chapters - minimal dependencies
      if (i > 1) dependencies.push(i - 1);
    } else if (i <= 10) {
      // Foundation chapters - depend on intro
      dependencies.push(1, 2);
      if (i > 6) dependencies.push(i - 1);
    } else if (i <= 15) {
      // Advanced chapters - depend on foundations
      dependencies.push(5, 6, 7);
      if (i > 11) dependencies.push(i - 2);
    } else {
      // Expert chapters - depend on advanced topics
      dependencies.push(10, 11, 12);
      if (i > 16) dependencies.push(i - 1);
    }

    chapters.push({
      chapterNumber: i,
      title: `Chapter ${i}: Advanced Topic ${String.fromCharCode(64 + i)}`,
      contentOverview: `This comprehensive chapter explores advanced artificial intelligence topic ${i} in depth, providing both theoretical foundations and practical applications for researchers and practitioners in the field`,
      keyObjectives: [
        `Master advanced concept ${i}`,
        'Apply theoretical knowledge',
        'Implement practical solutions',
        'Analyze real-world case studies',
        'Understand research implications',
      ],
      wordCount: 2800 + (i * 50), // Increasing complexity
      dependencies,
      researchRequirements: [
        `Advanced topic ${i} research`,
        'Academic publications',
        'Industry case studies',
        'Current research trends',
      ],
    });
  }

  return {
    title: 'Comprehensive AI Research Handbook',
    subtitle: 'Advanced Theory, Methods, and Applications in Artificial Intelligence',
    chapters,
    totalWordCount: chapters.reduce((sum, ch) => sum + ch.wordCount, 0),
    estimatedPages: Math.ceil(chapters.reduce((sum, ch) => sum + ch.wordCount, 0) / 250),
  };
}

function mockDependencies() {
  // Mock the workflow graph functions for testing
  const mockGraph = {
    addNode: (nodeId: string, nodeFn: any) => {
      console.log(`   📝 Created node: ${nodeId}`);
    },
  };

  // Mock the dependency resolution
  const mockResolveChapterDependencies = (configs: any[]) => {
    const layers: any[][] = [];
    const remaining = [...configs];
    const completed = new Set<number>();

    while (remaining.length > 0) {
      const currentLayer = remaining.filter((config) => {
        const dependencies = config.dependencies || [];
        return dependencies.every((dep: number) => completed.has(dep));
      });

      if (currentLayer.length === 0) {
        // Force break to avoid infinite loop in mocked environment
        layers.push(remaining);
        break;
      }

      layers.push(currentLayer);

      currentLayer.forEach((config) => {
        const index = remaining.indexOf(config);
        if (index > -1) {
          remaining.splice(index, 1);
          completed.add(config.chapterNumber);
        }
      });
    }

    return layers;
  };

  // Mock the createParallelChapterNodes function
  const mockCreateParallelChapterNodes = async (graph: any, configs: any[]) => {
    return configs.map(config => `chapter_${config.chapterNumber}`);
  };

  // Apply mocks globally for this test
  (global as any).__mockGraph = mockGraph;
  (global as any).__mockResolveChapterDependencies = mockResolveChapterDependencies;
  (global as any).__mockCreateParallelChapterNodes = mockCreateParallelChapterNodes;
}

function analyzeResults(state: WorkflowState, verbose: boolean) {
  const spawning = state.chapterSpawning;

  if (!spawning) {
    console.log('   ⚠️  No spawning metadata found in result state');
    return;
  }

  console.log(`   📊 Spawning Results:`);
  console.log(`      - Total nodes created: ${spawning.totalNodes}`);
  console.log(`      - Node IDs: ${spawning.nodeIds.join(', ')}`);
  console.log(`      - Dependency layers: ${spawning.dependencyLayers}`);
  console.log(`      - Execution plan layers: ${spawning.executionPlan.totalLayers}`);
  console.log(`      - Max parallelism: ${spawning.executionPlan.parallelismFactor}`);
  console.log(`      - Estimated duration: ${spawning.executionPlan.estimatedTotalDuration}s`);

  if (verbose) {
    console.log(`   🔍 Detailed Execution Plan:`);
    spawning.executionPlan.executionLayers.forEach((layer, index) => {
      console.log(`      Layer ${index + 1}:`);
      console.log(`        - Nodes: ${layer.nodeIds.join(', ')}`);
      console.log(`        - Dependencies: ${layer.dependencies.length ? layer.dependencies.join(', ') : 'None'}`);
      console.log(`        - Estimated time: ${layer.estimatedDuration}s`);
    });
  }

  console.log(`   🎯 Final State:`);
  console.log(`      - Stage: ${state.currentStage}`);
  console.log(`      - Overall progress: ${state.progress.overallProgress}%`);
  console.log(`      - Total chapters: ${state.progress.totalChapters}`);
  console.log(`      - Chapters completed: ${state.progress.chaptersCompleted}`);
}

// Help function
function showHelp() {
  console.log('Chapter Spawning Node Test Script\n');
  console.log('Usage: npx tsx scripts/test-chapter-spawning.ts [scenario] [options]\n');
  console.log('Scenarios:');
  Object.keys(testScenarios).forEach(key => {
    const scenario = testScenarios[key as keyof typeof testScenarios];
    console.log(`  ${key.padEnd(8)} - ${scenario.name}`);
  });
  console.log('\nOptions:');
  console.log('  --verbose, -v  Show detailed information');
  console.log('  --help, -h     Show this help message\n');
  console.log('Examples:');
  console.log('  npx tsx scripts/test-chapter-spawning.ts simple');
  console.log('  npx tsx scripts/test-chapter-spawning.ts complex --verbose');
}

// Handle help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});