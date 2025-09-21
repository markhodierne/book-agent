// Workflow Test Fixtures
// Mock data for workflow and chapter spawning tests

import { WorkflowState, BookOutline, ChapterOutline, ChapterConfig, BookRequirements, StyleGuide, AudienceProfile } from '@/types';

/**
 * Create mock workflow state for testing
 */
export function createMockWorkflowState(): WorkflowState {
  return {
    sessionId: 'test-session-123',
    userId: 'test-user-456',
    currentStage: 'outline',
    status: 'active',
    userPrompt: 'Create a book about artificial intelligence',
    chapters: [],
    progress: {
      currentStageProgress: 50,
      overallProgress: 25,
      chaptersCompleted: 0,
      totalChapters: 0,
    },
    createdAt: '2025-01-20T10:00:00.000Z',
    updatedAt: '2025-01-20T10:30:00.000Z',
    requirements: createMockBookRequirements(),
    styleGuide: createMockStyleGuide(),
  };
}

/**
 * Create mock book requirements
 */
export function createMockBookRequirements(): BookRequirements {
  return {
    topic: 'Artificial Intelligence for Beginners',
    audience: createMockAudienceProfile(),
    author: {
      name: 'John Doe',
      bio: 'AI researcher and educator',
      credentials: 'PhD in Computer Science',
    },
    scope: {
      breadth: 'comprehensive',
      depth: 'intermediate',
      approach: 'practical',
    },
    contentOrientation: {
      focus: 'educational',
      perspective: 'balanced',
      examples: 'real-world',
    },
    wordCountTarget: 35000,
  };
}

/**
 * Create mock audience profile
 */
export function createMockAudienceProfile(): AudienceProfile {
  return {
    demographics: 'Students and professionals aged 22-45',
    expertiseLevel: 'beginner',
    priorKnowledge: 'Basic understanding of programming concepts',
    readingContext: 'Self-paced learning and reference',
    goals: [
      'Understand AI fundamentals',
      'Learn practical AI applications',
      'Prepare for AI career transition',
    ],
  };
}

/**
 * Create mock style guide
 */
export function createMockStyleGuide(): StyleGuide {
  return {
    tone: 'professional',
    voice: 'authoritative',
    perspective: 'second-person',
    formality: 'semi-formal',
    technicalLevel: 'intermediate',
    exampleStyle: 'practical',
    sampleText: 'Artificial intelligence represents one of the most transformative technologies of our time. In this comprehensive guide, you will discover how AI systems work and learn to apply these powerful tools in real-world scenarios.',
  };
}

/**
 * Create mock book outline
 */
export function createMockBookOutline(): BookOutline {
  return {
    title: 'Artificial Intelligence: A Comprehensive Guide for Beginners',
    subtitle: 'From Theory to Practice in the Modern World',
    chapters: [
      createMockChapterOutline(1, 'Introduction to Artificial Intelligence', 1500),
      createMockChapterOutline(2, 'Machine Learning Fundamentals', 2000),
      createMockChapterOutline(3, 'Deep Learning and Neural Networks', 2500),
      createMockChapterOutline(4, 'Natural Language Processing', 2200),
      createMockChapterOutline(5, 'Computer Vision Applications', 2300),
      createMockChapterOutline(6, 'AI Ethics and Future Implications', 1800),
    ],
    totalWordCount: 32300,
    estimatedPages: 129,
    targetDuration: 8, // weeks
  };
}

/**
 * Create mock chapter outline
 */
export function createMockChapterOutline(
  number: number,
  title: string,
  wordCount: number,
  dependencies: number[] = []
): ChapterOutline {
  const baseOverview = `This chapter explores ${title.toLowerCase()} and provides practical insights for understanding and applying these concepts.`;

  return {
    chapterNumber: number,
    title,
    contentOverview: baseOverview.length >= 50 ? baseOverview : baseOverview + ' We will cover key principles, practical examples, and real-world applications in detail.',
    keyObjectives: [
      `Understand the fundamentals of ${title.toLowerCase()}`,
      `Learn practical applications and use cases`,
      `Explore real-world examples and case studies`,
      `Apply concepts through hands-on exercises`,
    ],
    wordCount,
    dependencies,
    researchRequirements: [
      'Recent academic papers and publications',
      'Industry case studies and examples',
      'Current trends and developments',
    ],
  };
}

/**
 * Create mock chapter configurations for testing
 */
export function createMockChapterConfigs(): ChapterConfig[] {
  return [
    {
      chapterNumber: 1,
      title: 'Introduction to AI',
      outline: createMockChapterOutline(1, 'Introduction to AI', 1500),
      wordTarget: 1500,
      dependencies: [],
      style: createMockStyleGuide(),
      researchTopics: ['AI history', 'Current applications', 'Future trends'],
    },
    {
      chapterNumber: 2,
      title: 'Machine Learning Basics',
      outline: createMockChapterOutline(2, 'Machine Learning Basics', 2000, [1]),
      wordTarget: 2000,
      dependencies: [1],
      style: createMockStyleGuide(),
      researchTopics: ['ML algorithms', 'Training data', 'Model evaluation'],
    },
    {
      chapterNumber: 3,
      title: 'Deep Learning',
      outline: createMockChapterOutline(3, 'Deep Learning', 2500, [1, 2]),
      wordTarget: 2500,
      dependencies: [1, 2],
      style: createMockStyleGuide(),
      researchTopics: ['Neural networks', 'Backpropagation', 'CNN and RNN'],
    },
  ];
}

/**
 * Create mock workflow state with chapter spawning metadata
 */
export function createMockWorkflowStateWithSpawning(): WorkflowState {
  const baseState = createMockWorkflowState();
  return {
    ...baseState,
    currentStage: 'chapter_generation',
    chapterSpawning: {
      nodeIds: ['chapter_1', 'chapter_2', 'chapter_3'],
      executionPlan: {
        totalLayers: 2,
        executionLayers: [
          {
            layerIndex: 0,
            nodeIds: ['chapter_1'],
            dependencies: [],
            estimatedDuration: 300,
          },
          {
            layerIndex: 1,
            nodeIds: ['chapter_2', 'chapter_3'],
            dependencies: ['chapter_1'],
            estimatedDuration: 600,
          },
        ],
        estimatedTotalDuration: 900,
        parallelismFactor: 2,
      },
      dependencyLayers: 2,
      totalNodes: 3,
      spawnedAt: '2025-01-20T10:45:00.000Z',
    },
  };
}

/**
 * Create minimal valid workflow state for specific test scenarios
 */
export function createMinimalValidWorkflowState(): WorkflowState {
  return {
    sessionId: 'minimal-session',
    currentStage: 'chapter_spawning',
    status: 'active',
    userPrompt: 'Test prompt',
    chapters: [],
    progress: {
      currentStageProgress: 0,
      overallProgress: 20,
      chaptersCompleted: 0,
      totalChapters: 1,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    outline: {
      title: 'Test Book',
      chapters: [
        {
          chapterNumber: 1,
          title: 'Test Chapter',
          contentOverview: 'A test chapter for minimal validation scenarios',
          keyObjectives: ['Test objective 1', 'Test objective 2', 'Test objective 3'],
          wordCount: 1500,
          dependencies: [],
          researchRequirements: [],
        },
      ],
      totalWordCount: 30000, // Meets minimum requirement
      estimatedPages: 120,
    },
    requirements: {
      topic: 'Test Topic',
      audience: {
        demographics: 'Test audience',
        expertiseLevel: 'beginner',
        priorKnowledge: 'None required',
        readingContext: 'Test context',
        goals: ['Learn testing'],
      },
      author: {
        name: 'Test Author',
      },
      scope: {
        breadth: 'focused',
        depth: 'surface',
        approach: 'theoretical',
      },
      contentOrientation: {
        focus: 'educational',
        perspective: 'neutral',
        examples: 'hypothetical',
      },
      wordCountTarget: 30000,
    },
    styleGuide: {
      tone: 'neutral',
      voice: 'third-person',
      perspective: 'objective',
      formality: 'formal',
      technicalLevel: 'basic',
      exampleStyle: 'simple',
      sampleText: 'This is a test style guide example.',
    },
  };
}