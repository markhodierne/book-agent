// Comprehensive Unit Tests for ConsistencyReviewNode
// Tests consistency analysis, GPT-5 integration, error handling, and recovery
// Following CLAUDE.md testing standards and project architecture

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConsistencyReviewNode } from '@/lib/agents/nodes/consistencyReview';
import { WorkflowState, ChapterResult, BookRequirements, StyleGuide } from '@/types';
import { WorkflowError } from '@/lib/errors/exports';
import { BookGenerationAgents } from '@/lib/agents/gpt5-wrapper';

// Mock the GPT-5 wrapper
vi.mock('@/lib/agents/gpt5-wrapper', () => ({
  BookGenerationAgents: {
    consistencyReviewer: vi.fn(),
  },
}));

// Mock the error handling exports
vi.mock('@/lib/errors/exports', () => ({
  WorkflowError: class extends Error {
    constructor(
      public sessionId: string,
      public stage: string,
      message: string,
      public options: any = {}
    ) {
      super(message);
      this.name = 'WorkflowError';
      this.code = options.code;
      this.recoverable = options.recoverable;
    }
  },
  WorkflowErrorContext: class {
    constructor(public sessionId: string, public userId?: string) {}
    updateStage() {}
    cleanup() {}
    createError(ErrorClass: any, message: string, options: any) {
      return new ErrorClass(this.sessionId, 'test_stage', message, options);
    }
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  retryAPI: vi.fn(),
}));

// Mock state persistence
vi.mock('@/lib/agents/state/persistence', () => ({
  updateSessionStatus: vi.fn(),
}));

describe('ConsistencyReviewNode', () => {
  let consistencyReviewNode: ConsistencyReviewNode;
  let mockConsistencyAgent: any;
  let mockWorkflowState: WorkflowState;
  let mockChapters: ChapterResult[];
  let mockRequirements: BookRequirements;
  let mockStyleGuide: StyleGuide;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock consistency agent
    mockConsistencyAgent = {
      execute: vi.fn(),
    };

    (BookGenerationAgents.consistencyReviewer as any).mockReturnValue(mockConsistencyAgent);

    // Create test data
    mockChapters = [
      {
        chapterNumber: 1,
        title: 'Introduction to AI',
        content: 'This chapter introduces artificial intelligence concepts and machine learning fundamentals. We explore the history of AI, current applications, and future prospects.',
        wordCount: 1500,
        status: 'completed',
        dependencies: [],
        researchSources: [],
        completedAt: '2025-09-22T10:00:00Z',
      },
      {
        chapterNumber: 2,
        title: 'Machine Learning Basics',
        content: 'Machine learning is a subset of AI that enables computers to learn patterns from data. This chapter covers supervised learning, unsupervised learning, and reinforcement learning.',
        wordCount: 1800,
        status: 'completed',
        dependencies: [1],
        researchSources: [],
        completedAt: '2025-09-22T11:00:00Z',
      },
      {
        chapterNumber: 3,
        title: 'Neural Networks',
        content: 'Neural networks are the foundation of deep learning. We examine how artificial neurons work, network architectures, and training algorithms.',
        wordCount: 2200,
        status: 'completed',
        dependencies: [1, 2],
        researchSources: [],
        completedAt: '2025-09-22T12:00:00Z',
      },
    ];

    mockRequirements = {
      topic: 'Artificial Intelligence for Beginners',
      audience: {
        demographic: 'technology enthusiasts',
        expertiseLevel: 'beginner',
        ageRange: '25-45',
        readingContext: 'professional development',
      },
      author: {
        name: 'Dr. AI Expert',
        credentials: 'PhD in Computer Science',
        background: 'AI researcher and educator',
      },
      scope: {
        primaryFocus: 'practical AI applications',
        coverage: 'comprehensive introduction',
        approach: 'hands-on with examples',
      },
      contentOrientation: {
        angle: 'practical and accessible',
        engagementStrategy: 'examples and exercises',
      },
      wordCountTarget: 35000,
    };

    mockStyleGuide = {
      tone: 'professional',
      voice: 'authoritative',
      perspective: 'second person',
      formality: 'moderate',
      technicalLevel: 'intermediate',
      exampleUsage: 'frequent',
      structurePreference: 'logical progression',
    };

    mockWorkflowState = {
      sessionId: 'test-session-123',
      userId: 'test-user-456',
      currentStage: 'consistency_review',
      status: 'active',
      userPrompt: 'Create a beginner-friendly AI guide',
      chapters: mockChapters,
      requirements: mockRequirements,
      styleGuide: mockStyleGuide,
      progress: {
        currentStageProgress: 0,
        overallProgress: 60,
        chaptersCompleted: 3,
        totalChapters: 3,
      },
      createdAt: '2025-09-22T09:00:00Z',
      updatedAt: '2025-09-22T12:00:00Z',
    };

    // Create node instance
    consistencyReviewNode = new ConsistencyReviewNode();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Node Creation and Basic Properties', () => {
    it('should create consistency review node with correct properties', () => {
      expect(consistencyReviewNode.name).toBe('consistency_review');
      expect(consistencyReviewNode.description).toBe('Analyze chapters for consistency, style, and quality');
    });

    it('should initialize GPT-5 consistency reviewer agent', () => {
      expect(BookGenerationAgents.consistencyReviewer).toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    it('should validate state has required chapters', () => {
      const result = consistencyReviewNode.validate(mockWorkflowState);
      expect(result).toBe(true);
    });

    it('should fail validation when chapters are missing', () => {
      const invalidState = { ...mockWorkflowState, chapters: [] };
      const result = consistencyReviewNode.validate(invalidState);
      expect(result).toBe(false);
    });

    it('should fail validation when requirements are missing', () => {
      const invalidState = { ...mockWorkflowState, requirements: undefined };
      const result = consistencyReviewNode.validate(invalidState);
      expect(result).toBe(false);
    });

    it('should fail validation when style guide is missing', () => {
      const invalidState = { ...mockWorkflowState, styleGuide: undefined };
      const result = consistencyReviewNode.validate(invalidState);
      expect(result).toBe(false);
    });
  });

  describe('Chapter Analysis Functionality', () => {
    it('should analyze all chapters individually', async () => {
      // Mock successful GPT-5 responses for chapter analysis
      const mockChapterAnalysisResponse = {
        content: JSON.stringify({
          consistencyScore: 85,
          issues: [
            {
              type: 'terminology',
              severity: 'medium',
              description: 'Use "machine learning" consistently instead of "ML"',
              suggestion: 'Replace all instances of "ML" with "machine learning"'
            }
          ],
          suggestions: ['Improve technical term consistency'],
          terminologyFindings: {
            'ML': 'machine learning'
          }
        })
      };

      mockConsistencyAgent.execute.mockResolvedValue(mockChapterAnalysisResponse);

      const result = await consistencyReviewNode.execute(mockWorkflowState);

      // Should analyze each chapter
      expect(mockConsistencyAgent.execute).toHaveBeenCalledTimes(4); // 3 chapters + 1 global analysis
      expect(result.consistencyReview).toBeDefined();
      expect(result.consistencyReview!.chapterResults).toHaveLength(3);
    });

    it('should perform global consistency analysis', async () => {
      // Mock successful responses
      const mockChapterResponse = {
        content: JSON.stringify({
          consistencyScore: 85,
          issues: [],
          suggestions: [],
          terminologyFindings: {}
        })
      };

      const mockGlobalResponse = {
        content: JSON.stringify({
          overallConsistencyScore: 88,
          globalIssues: [
            {
              type: 'style',
              severity: 'low',
              description: 'Minor style variations across chapters',
              relatedChapters: [1, 2, 3],
              suggestion: 'Standardize introduction and conclusion formats'
            }
          ],
          recommendedActions: ['Review style consistency', 'Standardize chapter structure'],
          terminologyMap: {
            'AI': 'artificial intelligence',
            'ML': 'machine learning'
          }
        })
      };

      mockConsistencyAgent.execute
        .mockResolvedValueOnce(mockChapterResponse) // Chapter 1
        .mockResolvedValueOnce(mockChapterResponse) // Chapter 2
        .mockResolvedValueOnce(mockChapterResponse) // Chapter 3
        .mockResolvedValueOnce(mockGlobalResponse); // Global analysis

      const result = await consistencyReviewNode.execute(mockWorkflowState);

      expect(result.consistencyReview!.overallConsistencyScore).toBe(88);
      expect(result.consistencyReview!.globalIssues).toHaveLength(1);
      expect(result.consistencyReview!.recommendedActions).toHaveLength(2);
    });

    it('should compile final consistency report correctly', async () => {
      const mockChapterResponse = {
        content: JSON.stringify({
          consistencyScore: 90,
          issues: [
            {
              type: 'terminology',
              severity: 'low',
              description: 'Minor terminology issue',
              suggestion: 'Use consistent terms'
            }
          ],
          suggestions: ['Review terminology'],
          terminologyFindings: {}
        })
      };

      const mockGlobalResponse = {
        content: JSON.stringify({
          overallConsistencyScore: 87,
          globalIssues: [],
          recommendedActions: ['Final review'],
          terminologyMap: {}
        })
      };

      // Mock chapter analysis calls (3 chapters)
      mockConsistencyAgent.execute
        .mockResolvedValueOnce(mockChapterResponse) // Chapter 1
        .mockResolvedValueOnce(mockChapterResponse) // Chapter 2
        .mockResolvedValueOnce(mockChapterResponse) // Chapter 3
        .mockResolvedValueOnce(mockGlobalResponse); // Global analysis

      const result = await consistencyReviewNode.execute(mockWorkflowState);

      expect(result.consistencyReview!.totalIssuesFound).toBe(3); // 1 issue per chapter
      expect(result.consistencyReview!.chapterResults).toHaveLength(3);
      expect(result.currentStage).toBe('quality_review');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle GPT-5 parsing errors gracefully', async () => {
      // Mock malformed GPT-5 response
      mockConsistencyAgent.execute.mockResolvedValue({
        content: 'This is not valid JSON response'
      });

      const result = await consistencyReviewNode.execute(mockWorkflowState);

      // Should still complete with fallback analysis
      expect(result.consistencyReview).toBeDefined();
      expect(result.consistencyReview!.chapterResults).toHaveLength(3);
      expect(result.currentStage).toBe('quality_review');
    });

    it('should handle GPT-5 API failures with fallback analysis', async () => {
      // Mock API failure
      mockConsistencyAgent.execute.mockRejectedValue(new Error('GPT-5 API timeout'));

      const result = await consistencyReviewNode.execute(mockWorkflowState);

      // Should use fallback analysis
      expect(result.consistencyReview).toBeDefined();
      expect(result.consistencyReview!.overallConsistencyScore).toBeGreaterThan(0);
      expect(result.consistencyReview!.chapterResults).toHaveLength(3);
    });

    it('should throw WorkflowError for missing chapters', async () => {
      const invalidState = { ...mockWorkflowState, chapters: [] };

      await expect(consistencyReviewNode.execute(invalidState))
        .rejects
        .toThrow(WorkflowError);
    });

    it('should throw WorkflowError for missing requirements', async () => {
      const invalidState = { ...mockWorkflowState, requirements: undefined };

      await expect(consistencyReviewNode.execute(invalidState))
        .rejects
        .toThrow(WorkflowError);
    });

    it('should provide recovery mechanism for consistency review failures', async () => {
      const error = new WorkflowError(
        'test-session',
        'consistency_review',
        'Consistency analysis failed',
        { code: 'analysis_failure', recoverable: true }
      );

      const recoveredState = await consistencyReviewNode.recover(mockWorkflowState, error);

      expect(recoveredState.consistencyReview).toBeDefined();
      expect(recoveredState.currentStage).toBe('quality_review');
      expect(recoveredState.retryCount).toBe(1);
    });

    it('should fail after maximum retry attempts', async () => {
      const stateWithMaxRetries = { ...mockWorkflowState, retryCount: 3 };
      const error = new WorkflowError(
        'test-session',
        'consistency_review',
        'Max retries exceeded',
        { code: 'max_retries', recoverable: false }
      );

      await expect(consistencyReviewNode.recover(stateWithMaxRetries, error))
        .rejects
        .toThrow('Maximum retries exceeded for consistency review');
    });
  });

  describe('Progress Tracking', () => {
    it('should update progress during execution phases', async () => {
      // Mock successful analysis
      mockConsistencyAgent.execute.mockResolvedValue({
        content: JSON.stringify({
          consistencyScore: 85,
          issues: [],
          suggestions: [],
          terminologyFindings: {}
        })
      });

      const result = await consistencyReviewNode.execute(mockWorkflowState);

      // Should advance to quality review with proper progress
      expect(result.currentStage).toBe('quality_review');
      expect(result.progress.overallProgress).toBe(85); // quality_review stage weight
      expect(result.updatedAt).toBeDefined();
    });

    it('should maintain chapter progress information', async () => {
      mockConsistencyAgent.execute.mockResolvedValue({
        content: JSON.stringify({
          consistencyScore: 90,
          issues: [],
          suggestions: [],
          terminologyFindings: {}
        })
      });

      const result = await consistencyReviewNode.execute(mockWorkflowState);

      expect(result.progress.chaptersCompleted).toBe(3);
      expect(result.progress.totalChapters).toBe(3);
    });
  });

  describe('State Transition', () => {
    it('should transition to quality_review stage after successful analysis', async () => {
      mockConsistencyAgent.execute.mockResolvedValue({
        content: JSON.stringify({
          consistencyScore: 85,
          issues: [],
          suggestions: [],
          terminologyFindings: {}
        })
      });

      const result = await consistencyReviewNode.execute(mockWorkflowState);

      expect(result.currentStage).toBe('quality_review');
      expect(result.progress.currentStageProgress).toBe(100);
    });

    it('should preserve all original state data during transition', async () => {
      mockConsistencyAgent.execute.mockResolvedValue({
        content: JSON.stringify({
          consistencyScore: 85,
          issues: [],
          suggestions: [],
          terminologyFindings: {}
        })
      });

      const result = await consistencyReviewNode.execute(mockWorkflowState);

      expect(result.sessionId).toBe(mockWorkflowState.sessionId);
      expect(result.userId).toBe(mockWorkflowState.userId);
      expect(result.chapters).toEqual(mockWorkflowState.chapters);
      expect(result.requirements).toEqual(mockWorkflowState.requirements);
      expect(result.styleGuide).toEqual(mockWorkflowState.styleGuide);
    });
  });

  describe('Consistency Analysis Quality', () => {
    it('should identify terminology consistency issues', async () => {
      const mockResponse = {
        content: JSON.stringify({
          consistencyScore: 75,
          issues: [
            {
              type: 'terminology',
              severity: 'high',
              description: 'Inconsistent use of "AI" vs "artificial intelligence"',
              suggestion: 'Use "artificial intelligence" consistently throughout'
            },
            {
              type: 'terminology',
              severity: 'medium',
              description: 'Mix of "ML" and "machine learning"',
              suggestion: 'Use full term "machine learning" for clarity'
            }
          ],
          suggestions: ['Create terminology glossary', 'Review all technical terms'],
          terminologyFindings: {
            'AI': 'artificial intelligence',
            'ML': 'machine learning'
          }
        })
      };

      mockConsistencyAgent.execute.mockResolvedValue(mockResponse);

      const result = await consistencyReviewNode.execute(mockWorkflowState);

      const chapterResult = result.consistencyReview!.chapterResults[0];
      expect(chapterResult.issues).toHaveLength(2);
      expect(chapterResult.issues[0].type).toBe('terminology');
      expect(chapterResult.issues[0].severity).toBe('high');
    });

    it('should provide actionable suggestions for improvements', async () => {
      const mockResponse = {
        content: JSON.stringify({
          consistencyScore: 80,
          issues: [
            {
              type: 'style',
              severity: 'medium',
              description: 'Tone varies between formal and conversational',
              suggestion: 'Maintain consistent professional tone throughout chapter'
            }
          ],
          suggestions: [
            'Review tone consistency',
            'Standardize introduction formats',
            'Ensure conclusion summaries are uniform'
          ],
          terminologyFindings: {}
        })
      };

      mockConsistencyAgent.execute.mockResolvedValue(mockResponse);

      const result = await consistencyReviewNode.execute(mockWorkflowState);

      const chapterResult = result.consistencyReview!.chapterResults[0];
      expect(chapterResult.suggestions).toHaveLength(3);
      expect(chapterResult.suggestions[0]).toContain('tone');
    });

    it('should calculate overall consistency scores correctly', async () => {
      const mockChapterResponse = {
        content: JSON.stringify({
          consistencyScore: 85,
          issues: [],
          suggestions: [],
          terminologyFindings: {}
        })
      };

      const mockGlobalResponse = {
        content: JSON.stringify({
          overallConsistencyScore: 87,
          globalIssues: [],
          recommendedActions: [],
          terminologyMap: {}
        })
      };

      mockConsistencyAgent.execute
        .mockResolvedValueOnce(mockChapterResponse) // Chapter 1
        .mockResolvedValueOnce(mockChapterResponse) // Chapter 2
        .mockResolvedValueOnce(mockChapterResponse) // Chapter 3
        .mockResolvedValueOnce(mockGlobalResponse); // Global analysis

      const result = await consistencyReviewNode.execute(mockWorkflowState);

      expect(result.consistencyReview!.overallConsistencyScore).toBe(87);
      expect(result.consistencyReview!.chapterResults.every(ch => ch.consistencyScore === 85)).toBe(true);
    });
  });
});