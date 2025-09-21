import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OutlineNode } from '@/lib/agents/nodes/outline';
import { WorkflowState, BookRequirements } from '@/types';
import { openai } from '@/lib/config/openai';
import * as errorExports from '@/lib/errors/exports';

// Mock OpenAI
vi.mock('@/lib/config/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

// Mock error handling
vi.mock('@/lib/errors/exports', () => ({
  WorkflowError: class WorkflowError extends Error {
    public recoverable: boolean = true;
    constructor(public code: string, message: string, public context?: any) {
      super(message);
      this.name = 'WorkflowError';
      if (context?.recoverable !== undefined) {
        this.recoverable = context.recoverable;
      }
    }
  },
  WorkflowErrorContext: class {
    constructor(public sessionId?: string, public userId?: string) {}
    updateStage(stage: string) {}
    createError(ErrorClass: any, message: string, context?: any) {
      const error = new ErrorClass('test_error', message, context);
      if (context?.recoverable !== undefined) {
        error.recoverable = context.recoverable;
      }
      return error;
    }
    cleanup() {}
  },
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  executeWithToolContext: vi.fn((toolName, params, fn) => fn()),
}));

describe('OutlineNode', () => {
  let outlineNode: OutlineNode;
  let mockState: WorkflowState;
  let mockRequirements: BookRequirements;

  beforeEach(() => {
    vi.clearAllMocks();

    outlineNode = new OutlineNode();

    mockRequirements = {
      topic: 'Artificial Intelligence for Beginners',
      audience: {
        demographics: 'Software developers and tech enthusiasts',
        expertiseLevel: 'intermediate',
        ageGroup: '25-45',
        context: 'professional',
      },
      author: {
        name: 'Dr. Tech Writer',
        credentials: 'PhD in Computer Science',
        background: '15 years in AI research',
      },
      scope: {
        purpose: 'educational',
        approach: 'practical',
        coverageDepth: 'comprehensive',
      },
      contentOrientation: {
        primaryAngle: 'Practical implementation of AI concepts',
        secondaryAngles: ['Theory basics', 'Real-world applications'],
        engagementStrategy: 'practical_examples',
      },
      wordCountTarget: 35000,
    };

    mockState = {
      sessionId: 'test-session-123',
      userId: 'user-456',
      currentStage: 'conversation',
      status: 'active',
      userPrompt: 'I want to learn about AI',
      requirements: mockRequirements,
      chapters: [],
      progress: {
        currentStageProgress: 0,
        overallProgress: 10,
        chaptersCompleted: 0,
        totalChapters: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Node Creation', () => {
    it('creates outline node with correct configuration', () => {
      expect(outlineNode).toBeDefined();
      expect(outlineNode.name).toBe('outline');
      expect(outlineNode.description).toBe('Generate comprehensive book outline with chapter structure');
    });
  });

  describe('Input Validation', () => {
    it('validates state has requirements', () => {
      expect(outlineNode.validate(mockState)).toBe(true);
    });

    it('rejects state without requirements', () => {
      const invalidState = { ...mockState, requirements: undefined };
      expect(outlineNode.validate(invalidState)).toBe(false);
    });

    it('rejects state with empty topic', () => {
      const invalidState = {
        ...mockState,
        requirements: { ...mockRequirements, topic: '' }
      };
      expect(outlineNode.validate(invalidState)).toBe(false);
    });

    it('rejects state with insufficient word count target', () => {
      const invalidState = {
        ...mockState,
        requirements: { ...mockRequirements, wordCountTarget: 20000 }
      };
      expect(outlineNode.validate(invalidState)).toBe(false);
    });
  });

  describe('Title Generation', () => {
    it('generates multiple title options from OpenAI response', async () => {
      const mockTitleResponse = {
        choices: [{
          message: {
            content: `1. Artificial Intelligence for Beginners: A Practical Guide
2. Mastering AI: From Basics to Implementation
3. The Complete Guide to Artificial Intelligence
4. AI Fundamentals: Building Your First Applications
5. Practical Artificial Intelligence: A Developer's Handbook`
          }
        }]
      };

      vi.mocked(openai.chat.completions.create).mockResolvedValueOnce(mockTitleResponse);

      const result = await outlineNode['generateTitleOptions'](mockRequirements, new errorExports.WorkflowErrorContext());

      expect(result).toHaveLength(5);
      expect(result[0]).toBe('Artificial Intelligence for Beginners: A Practical Guide');
      expect(result[1]).toBe('Mastering AI: From Basics to Implementation');
    });

    it('handles insufficient title options with fallbacks', async () => {
      const mockTitleResponse = {
        choices: [{
          message: {
            content: `1. AI Guide
2. Learning AI`
          }
        }]
      };

      vi.mocked(openai.chat.completions.create).mockResolvedValueOnce(mockTitleResponse);

      const result = await outlineNode['generateTitleOptions'](mockRequirements, new errorExports.WorkflowErrorContext());

      expect(result).toHaveLength(3);
      expect(result[2]).toBe('The Complete Guide to Artificial Intelligence for Beginners');
    });

    it('provides fallback titles on API failure', async () => {
      vi.mocked(openai.chat.completions.create).mockRejectedValueOnce(new Error('API Error'));

      const result = await outlineNode['generateTitleOptions'](mockRequirements, new errorExports.WorkflowErrorContext());

      expect(result).toHaveLength(3);
      expect(result[0]).toBe('The Complete Guide to Artificial Intelligence for Beginners');
      expect(result[1]).toBe('Mastering Artificial Intelligence for Beginners');
    });
  });

  describe('Chapter Structure Planning', () => {
    it('parses chapter structure from OpenAI response', async () => {
      const mockStructureResponse = {
        choices: [{
          message: {
            content: `TOTAL CHAPTERS: 12
WORD DISTRIBUTION: 2500, 2800, 3000, 2900, 3200, 2700, 3100, 2600, 3000, 2800, 2900, 2500
CHAPTER TITLES:
1. Introduction to Artificial Intelligence
2. History and Evolution of AI
3. Machine Learning Fundamentals
4. Deep Learning Basics
5. Neural Networks Architecture
6. Natural Language Processing
7. Computer Vision Applications
8. AI Ethics and Bias
9. Practical Implementation Tools
10. Building Your First AI Project
11. Advanced AI Techniques
12. Future of Artificial Intelligence`
          }
        }]
      };

      vi.mocked(openai.chat.completions.create).mockResolvedValueOnce(mockStructureResponse);

      const result = await outlineNode['planChapterStructure'](
        mockRequirements,
        'AI Guide',
        new errorExports.WorkflowErrorContext()
      );

      expect(result.totalChapters).toBe(12);
      expect(result.chapterTitles).toHaveLength(12);
      expect(result.wordDistribution).toHaveLength(12);
      expect(result.chapterTitles[0]).toBe('Introduction to Artificial Intelligence');
      expect(result.wordDistribution.reduce((sum, w) => sum + w, 0)).toBeGreaterThanOrEqual(35000);
    });

    it('generates fallback structure on parsing failure', async () => {
      vi.mocked(openai.chat.completions.create).mockResolvedValueOnce({
        choices: [{ message: { content: 'Invalid response format' } }]
      });

      const result = await outlineNode['planChapterStructure'](
        mockRequirements,
        'AI Guide',
        new errorExports.WorkflowErrorContext()
      );

      expect(result.totalChapters).toBeGreaterThanOrEqual(8);
      expect(result.chapterTitles).toHaveLength(result.totalChapters);
      expect(result.wordDistribution.reduce((sum, w) => sum + w, 0)).toBeGreaterThanOrEqual(35000);
    });
  });

  describe('Detailed Chapter Outlines', () => {
    it('creates detailed outlines for each chapter', async () => {
      const mockChapterResponse = {
        choices: [{
          message: {
            content: `CONTENT OVERVIEW: This chapter provides a comprehensive introduction to artificial intelligence concepts and terminology.
KEY OBJECTIVES:
- Understand the definition and scope of artificial intelligence
- Learn about different types of AI systems
- Explore real-world AI applications
- Establish foundational knowledge for subsequent chapters
RESEARCH REQUIREMENTS:
- Current AI market statistics
- Recent breakthrough applications
- Industry adoption trends
DEPENDENCIES: None`
          }
        }]
      };

      vi.mocked(openai.chat.completions.create).mockResolvedValue(mockChapterResponse);

      const structure = {
        totalChapters: 3,
        wordDistribution: [2500, 2800, 3000],
        chapterTitles: ['Introduction to AI', 'Machine Learning Basics', 'Deep Learning Fundamentals']
      };

      const result = await outlineNode['createDetailedOutlines'](
        mockRequirements,
        structure,
        new errorExports.WorkflowErrorContext()
      );

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        chapterNumber: 1,
        title: 'Introduction to AI',
        wordCount: 2500,
        keyObjectives: expect.arrayContaining([
          expect.stringContaining('artificial intelligence')
        ]),
        researchRequirements: expect.arrayContaining([
          expect.stringContaining('AI market')
        ]),
        dependencies: []
      });
    });

    it('adds chapter dependencies based on logical flow', async () => {
      const mockChapterResponse = {
        choices: [{
          message: {
            content: `CONTENT OVERVIEW: Advanced chapter content.
KEY OBJECTIVES:
- Advanced objective 1
- Advanced objective 2
RESEARCH REQUIREMENTS:
- Research requirement 1
DEPENDENCIES: 1, 2`
          }
        }]
      };

      vi.mocked(openai.chat.completions.create).mockResolvedValue(mockChapterResponse);

      const structure = {
        totalChapters: 5,
        wordDistribution: [2000, 2200, 2400, 2600, 2800],
        chapterTitles: ['Intro', 'Basics', 'Intermediate', 'Advanced', 'Expert']
      };

      const result = await outlineNode['createDetailedOutlines'](
        mockRequirements,
        structure,
        new errorExports.WorkflowErrorContext()
      );

      // Check that later chapters have dependencies
      expect(result[3].dependencies.length).toBeGreaterThan(0);
      expect(result[4].dependencies.length).toBeGreaterThan(0);
    });
  });

  describe('Outline Validation', () => {
    it('validates complete outline structure', async () => {
      const mockOutline = {
        title: 'Test AI Book',
        chapters: Array.from({ length: 8 }, (_, i) => ({
          chapterNumber: i + 1,
          title: `Chapter ${i + 1}: Topic ${i + 1}`,
          contentOverview: 'This chapter introduces fundamental AI concepts and provides comprehensive context for understanding the field.',
          keyObjectives: ['Understand AI basics', 'Learn terminology', 'Set expectations'],
          wordCount: 2500,
          dependencies: [],
          researchRequirements: ['AI history', 'Current trends'],
        })),
        totalWordCount: 35000,
        estimatedPages: 140,
      };

      const result = await outlineNode['validateAndFinalizeOutline'](
        mockOutline,
        new errorExports.WorkflowErrorContext()
      );

      expect(result.title).toBe('Test AI Book');
      expect(result.chapters).toHaveLength(8);
      expect(result.totalWordCount).toBeGreaterThanOrEqual(30000);
    });

    it('adjusts word counts if below minimum', async () => {
      const chapters = Array.from({ length: 8 }, (_, i) => ({
        chapterNumber: i + 1,
        title: `Chapter ${i + 1}: Brief Introduction`,
        contentOverview: 'This chapter provides a short but comprehensive introduction to the fundamental concepts being discussed.',
        keyObjectives: ['Basic objective', 'Secondary goal', 'Learning outcome'],
        wordCount: 1000,
        dependencies: [],
        researchRequirements: [],
      }));

      const mockOutline = {
        title: 'Short AI Book',
        chapters,
        totalWordCount: chapters.reduce((sum, c) => sum + c.wordCount, 0), // 8000
        estimatedPages: 32,
      };

      const result = await outlineNode['validateAndFinalizeOutline'](
        mockOutline,
        new errorExports.WorkflowErrorContext()
      );

      expect(result.totalWordCount).toBeGreaterThanOrEqual(30000);
      expect(result.chapters[0].wordCount).toBeGreaterThan(1000);
    });

    it('detects circular dependencies', () => {
      const chapters = [
        {
          chapterNumber: 1,
          title: 'Chapter 1',
          contentOverview: 'First chapter provides comprehensive introduction to core concepts.',
          keyObjectives: ['Objective 1', 'Objective 2', 'Objective 3'],
          wordCount: 15000,
          dependencies: [2], // Circular: depends on chapter 2
          researchRequirements: [],
        },
        {
          chapterNumber: 2,
          title: 'Chapter 2',
          contentOverview: 'Second chapter builds on fundamental principles established previously.',
          keyObjectives: ['Objective 1', 'Objective 2', 'Objective 3'],
          wordCount: 15000,
          dependencies: [1], // Circular: depends on chapter 1
          researchRequirements: [],
        }
      ];

      expect(() => {
        outlineNode['validateDependencies'](chapters);
      }).toThrow('Circular dependency detected');
    });
  });

  describe('Error Handling', () => {
    it('handles missing requirements gracefully', async () => {
      const stateWithoutRequirements = { ...mockState, requirements: undefined };

      const result = await outlineNode['executeNode'](stateWithoutRequirements);

      expect(result.error).toContain('Requirements not found');
      expect(result.needsRetry).toBe(false);
      expect(result.currentStage).toBe('conversation'); // Should remain at current stage on error
    });

    it('implements recovery logic for retryable errors', async () => {
      const errorState = {
        ...mockState,
        retryCount: 1,
      };

      const mockError = new errorExports.WorkflowError('api_error', 'API temporarily unavailable', {
        recoverable: true,
      });

      const result = await outlineNode.recover(errorState, mockError);

      expect(result.retryCount).toBe(2);
      // 80% of 35000 is 28000
      expect(result.requirements?.wordCountTarget).toBe(Math.max(30000, Math.floor(35000 * 0.8)));
    });

    it('fails after maximum retries', async () => {
      const errorState = {
        ...mockState,
        retryCount: 3,
      };

      const mockError = new errorExports.WorkflowError('persistent_error', 'Persistent failure', {
        recoverable: true,
      });

      await expect(
        outlineNode.recover(errorState, mockError)
      ).rejects.toThrow('Maximum retries exceeded');
    });
  });

  describe('Full Workflow Execution', () => {
    it('completes full outline generation workflow', async () => {
      // Mock all OpenAI responses
      const mockTitleResponse = {
        choices: [{ message: { content: '1. AI for Beginners: Complete Guide' } }]
      };

      const mockStructureResponse = {
        choices: [{
          message: {
            content: `TOTAL CHAPTERS: 10
WORD DISTRIBUTION: 3500, 3500, 3500, 3500, 3500, 3500, 3500, 3500, 3500, 3500
CHAPTER TITLES:
1. Introduction to AI
2. Machine Learning Basics
3. Deep Learning
4. Neural Networks
5. NLP Applications
6. Computer Vision
7. AI Ethics
8. Implementation Tools
9. Building AI Projects
10. Future of AI`
          }
        }]
      };

      const mockChapterResponse = {
        choices: [{
          message: {
            content: `CONTENT OVERVIEW: This chapter provides comprehensive coverage of artificial intelligence fundamentals, including core concepts, practical applications, and modern approaches to AI development.
KEY OBJECTIVES:
- Understand core concepts and theoretical foundations
- Apply practical techniques in real-world scenarios
- Build foundational knowledge for advanced topics
RESEARCH REQUIREMENTS:
- Industry best practices and current standards
- Current market trends and technological developments
DEPENDENCIES: None`
          }
        }]
      };

      vi.mocked(openai.chat.completions.create)
        .mockResolvedValueOnce(mockTitleResponse)
        .mockResolvedValueOnce(mockStructureResponse)
        .mockResolvedValue(mockChapterResponse);

      const result = await outlineNode['executeNode'](mockState);

      expect(result.currentStage).toBe('chapter_spawning');
      expect(result.outline).toBeDefined();
      expect(result.outline?.title).toBe('AI for Beginners: Complete Guide');
      expect(result.outline?.chapters).toHaveLength(10);
      expect(result.outline?.totalWordCount).toBeGreaterThanOrEqual(30000);
    });
  });
});