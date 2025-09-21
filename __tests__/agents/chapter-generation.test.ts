// Chapter Generation Node Tests
// Tests the complete chapter generation node with tool integration
// Following CLAUDE.md testing standards and patterns

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ChapterNode, ChapterNodeConfig } from '@/lib/agents/nodes/chapter';
import { WorkflowState, ChapterResult, ChapterStatus, WorkflowStage } from '@/types';
import { toolRegistry } from '@/lib/tools';
import { WorkflowError } from '@/lib/errors/exports';
import { createMockWorkflowState, createMockChapterConfig, createMockChapterResult } from '../fixtures/workflow-fixtures';

// Mock the tool registry
vi.mock('@/lib/tools', () => ({
  toolRegistry: {
    getTool: vi.fn(),
  },
}));

// Mock error handling utilities
vi.mock('@/lib/errors/exports', async () => {
  const actual = await vi.importActual('@/lib/errors/exports');
  return {
    ...actual,
    withRetry: vi.fn().mockImplementation((fn) => fn()),
    retryChapterGeneration: {},
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

describe('ChapterNode', () => {
  let mockChapterWriteTool: Mock;
  let mockWebResearchTool: Mock;
  let mockSupabaseStateTool: Mock;
  let chapterConfig: ChapterNodeConfig;
  let workflowState: WorkflowState;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock tools
    mockChapterWriteTool = vi.fn();
    mockWebResearchTool = vi.fn();
    mockSupabaseStateTool = vi.fn();

    (toolRegistry.getTool as Mock).mockImplementation((toolName: string) => {
      switch (toolName) {
        case 'chapter_write':
          return { execute: mockChapterWriteTool };
        case 'web_research':
          return { execute: mockWebResearchTool };
        case 'supabase_state':
          return { execute: mockSupabaseStateTool };
        default:
          return null;
      }
    });

    // Setup test data
    chapterConfig = createMockChapterConfig({
      chapterNumber: 1,
      title: 'Introduction to AI',
      wordTarget: 1500,
      sessionId: 'test-session-123',
    });

    workflowState = createMockWorkflowState({
      sessionId: 'test-session-123',
      currentStage: 'chapter_generation' as WorkflowStage,
      chapters: [],
    });

    // Setup default mock returns
    mockChapterWriteTool.mockResolvedValue(createMockChapterResult({
      chapterNumber: 1,
      title: 'Introduction to AI',
      content: 'This is a comprehensive introduction to artificial intelligence...',
      wordCount: 1500,
      status: 'completed' as ChapterStatus,
    }));

    mockWebResearchTool.mockResolvedValue('Research data about AI introduction...');
    mockSupabaseStateTool.mockResolvedValue({ success: true });
  });

  describe('Chapter Node Creation', () => {
    it('should create chapter node with correct configuration', () => {
      const chapterNode = new ChapterNode(chapterConfig);

      expect(chapterNode.name).toBe('chapter_1');
      expect(chapterNode.description).toBe('Generate chapter 1: Introduction to AI');
    });

    it('should validate required dependencies', () => {
      const chapterNode = new ChapterNode(chapterConfig);

      // Valid state
      expect(chapterNode.validate(workflowState)).toBe(true);

      // Missing outline
      const invalidState = { ...workflowState, outline: undefined };
      expect(chapterNode.validate(invalidState)).toBe(false);

      // Missing style guide
      const invalidState2 = { ...workflowState, styleGuide: undefined };
      expect(chapterNode.validate(invalidState2)).toBe(false);

      // Missing requirements
      const invalidState3 = { ...workflowState, requirements: undefined };
      expect(chapterNode.validate(invalidState3)).toBe(false);
    });
  });

  describe('Chapter Content Generation', () => {
    it('should generate chapter content successfully', async () => {
      const chapterNode = new ChapterNode(chapterConfig);
      const result = await chapterNode.execute(workflowState);

      expect(mockChapterWriteTool).toHaveBeenCalledOnce();
      expect(result.chapters).toHaveLength(1);
      expect(result.chapters[0]?.chapterNumber).toBe(1);
      expect(result.chapters[0]?.title).toBe('Introduction to AI');
      expect(result.chapters[0]?.status).toBe('completed');
      expect(result.progress.chaptersCompleted).toBe(1);
    });

    it('should include research data when web research tool is available', async () => {
      const chapterNode = new ChapterNode(chapterConfig);
      await chapterNode.execute(workflowState);

      expect(mockWebResearchTool).toHaveBeenCalledWith({
        query: 'Introduction to AI Test Topic',
        maxPages: 3,
      });

      expect(mockChapterWriteTool).toHaveBeenCalledWith(
        expect.objectContaining({
          researchData: expect.arrayContaining(['Research data about AI introduction...']),
        })
      );
    });

    it('should handle research failure gracefully', async () => {
      mockWebResearchTool.mockRejectedValue(new Error('Research failed'));

      const chapterNode = new ChapterNode(chapterConfig);
      const result = await chapterNode.execute(workflowState);

      expect(result.chapters).toHaveLength(1);
      expect(result.chapters[0]?.status).toBe('completed');
      // Should continue without research data
      expect(mockChapterWriteTool).toHaveBeenCalledWith(
        expect.objectContaining({
          researchData: undefined,
        })
      );
    });

    it('should process chapter dependencies correctly', async () => {
      // Setup a chapter with dependencies
      const dependentChapterConfig = createMockChapterConfig({
        chapterNumber: 2,
        title: 'Advanced AI Concepts',
        dependencies: [1],
        sessionId: 'test-session-123',
      });

      // Add a completed chapter to the state
      const stateWithDependency = {
        ...workflowState,
        chapters: [createMockChapterResult({
          chapterNumber: 1,
          title: 'Introduction to AI',
          content: 'This is the introduction chapter content...',
          status: 'completed' as ChapterStatus,
        })],
      };

      const chapterNode = new ChapterNode(dependentChapterConfig);
      await chapterNode.execute(stateWithDependency);

      expect(mockChapterWriteTool).toHaveBeenCalledWith(
        expect.objectContaining({
          contextFromDependencies: expect.stringContaining('Chapter 1 - Introduction to AI'),
        })
      );
    });

    it('should persist chapter results to database', async () => {
      const chapterNode = new ChapterNode(chapterConfig);
      await chapterNode.execute(workflowState);

      expect(mockSupabaseStateTool).toHaveBeenCalledWith({
        operation: 'save_chapter',
        sessionId: 'test-session-123',
        data: expect.objectContaining({
          chapterNumber: 1,
          title: 'Introduction to AI',
          status: 'completed',
        }),
      });
    });

    it('should update chapter status throughout the process', async () => {
      const chapterNode = new ChapterNode(chapterConfig);
      await chapterNode.execute(workflowState);

      // Should update status at different phases
      expect(mockSupabaseStateTool).toHaveBeenCalledWith({
        operation: 'update_chapter_status',
        sessionId: 'test-session-123',
        data: expect.objectContaining({
          chapterNumber: 1,
          status: 'researching',
        }),
      });

      expect(mockSupabaseStateTool).toHaveBeenCalledWith({
        operation: 'update_chapter_status',
        sessionId: 'test-session-123',
        data: expect.objectContaining({
          chapterNumber: 1,
          status: 'writing',
        }),
      });

      expect(mockSupabaseStateTool).toHaveBeenCalledWith({
        operation: 'update_chapter_status',
        sessionId: 'test-session-123',
        data: expect.objectContaining({
          chapterNumber: 1,
          status: 'completed',
        }),
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle missing chapter write tool', async () => {
      (toolRegistry.getTool as Mock).mockImplementation((toolName: string) => {
        if (toolName === 'chapter_write') return null;
        return { execute: vi.fn() };
      });

      const chapterNode = new ChapterNode(chapterConfig);
      const result = await chapterNode.execute(workflowState);

      // Should handle gracefully and create a failed chapter
      expect(result.chapters).toHaveLength(1);
      expect(result.chapters[0]?.status).toBe('failed');
      expect(result.needsRetry).toBe(true);
      expect(result.error).toContain('Chapter 1 generation failed');
    });

    it('should handle chapter generation failure', async () => {
      mockChapterWriteTool.mockRejectedValue(new Error('GPT-5 generation failed'));

      const chapterNode = new ChapterNode(chapterConfig);
      const result = await chapterNode.execute(workflowState);

      expect(result.chapters).toHaveLength(1);
      expect(result.chapters[0]?.status).toBe('failed');
      expect(result.chapters[0]?.wordCount).toBe(0);
      expect(result.error).toContain('Chapter 1 generation failed');
      expect(result.needsRetry).toBe(true);
    });

    it('should handle database persistence failure gracefully', async () => {
      mockSupabaseStateTool.mockRejectedValue(new Error('Database connection failed'));

      const chapterNode = new ChapterNode(chapterConfig);
      const result = await chapterNode.execute(workflowState);

      // Should still complete chapter generation despite persistence failure
      expect(result.chapters).toHaveLength(1);
      expect(result.chapters[0]?.status).toBe('completed');
    });

    it('should identify recoverable errors correctly', async () => {
      const chapterNode = new ChapterNode(chapterConfig);

      // Test recoverable errors (from child class)
      expect(chapterNode['isRecoverableError'](new Error('API timeout occurred'))).toBe(true);
      expect(chapterNode['isRecoverableError'](new Error('Rate limit exceeded'))).toBe(true);
      expect(chapterNode['isRecoverableError'](new Error('Network connection failed'))).toBe(true);
      expect(chapterNode['isRecoverableError'](new Error('content_quality validation failed'))).toBe(true);
      expect(chapterNode['isRecoverableError'](new Error('Server error occurred'))).toBe(true);

      // Test recoverable errors (from base class)
      expect(chapterNode['isRecoverableError'](new Error('Timeout occurred'))).toBe(true);
      expect(chapterNode['isRecoverableError'](new Error('Temporary failure'))).toBe(true);

      // Test non-recoverable errors
      expect(chapterNode['isRecoverableError'](new Error('Invalid configuration'))).toBe(false);
      expect(chapterNode['isRecoverableError'](new Error('Authorization failed'))).toBe(false);
    });

    it('should create recovery configuration with reduced complexity', async () => {
      const complexConfig = createMockChapterConfig({
        chapterNumber: 1,
        title: 'Complex Chapter',
        wordTarget: 2000,
        dependencies: [1, 2, 3],
        researchRequirements: ['topic1', 'topic2', 'topic3'],
        sessionId: 'test-session-123',
      });

      const chapterNode = new ChapterNode(complexConfig);
      const recoveryConfig = chapterNode['createRecoveryConfig']();

      expect(recoveryConfig.wordTarget).toBeLessThan(complexConfig.wordTarget);
      expect(recoveryConfig.dependencies).toEqual([]);
      expect(recoveryConfig.researchRequirements).toHaveLength(1);
    });

    it('should implement recovery with reduced complexity', async () => {
      const chapterNode = new ChapterNode(chapterConfig);
      const mockError = new WorkflowError('content_quality', 'Content validation failed', {
        recoverable: true,
      });

      const retryState = { ...workflowState, retryCount: 1 };

      // Mock the recovery execution
      const recoveredNode = new ChapterNode(chapterNode['createRecoveryConfig']());
      vi.spyOn(recoveredNode, 'executeNode').mockResolvedValue(retryState);

      const result = await chapterNode.recover(retryState, mockError);

      expect(result.retryCount).toBe(2);
    });

    it('should fail after maximum retry attempts', async () => {
      const chapterNode = new ChapterNode(chapterConfig);
      const mockError = new WorkflowError('persistent_error', 'Persistent error', {
        recoverable: true,
      });

      const maxRetriesState = { ...workflowState, retryCount: 3 };

      try {
        await chapterNode.recover(maxRetriesState, mockError);
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Debug the error
        console.log('Caught error:', error);
        console.log('Error constructor:', error?.constructor?.name);
        console.log('Error message:', error instanceof Error ? error.message : 'Not an Error');
        console.log('Is WorkflowError:', error instanceof WorkflowError);

        expect(error).toBeInstanceOf(WorkflowError);
        if (error instanceof WorkflowError) {
          expect(error.message).toContain('Maximum retries exceeded');
        } else if (error instanceof Error) {
          expect(error.message).toContain('Maximum retries exceeded');
        } else {
          expect.fail('Error should be an Error instance');
        }
      }
    });
  });

  describe('Progress Tracking', () => {
    it('should update progress throughout chapter generation', async () => {
      const chapterNode = new ChapterNode(chapterConfig);
      const result = await chapterNode.execute(workflowState);

      expect(result.progress.currentStageProgress).toBe(100);
      expect(result.progress.chaptersCompleted).toBe(1);
    });

    it('should track word count accurately', async () => {
      const mockContent = 'This is a test chapter with exactly ten words total.';
      mockChapterWriteTool.mockResolvedValue(createMockChapterResult({
        chapterNumber: 1,
        title: 'Test Chapter',
        content: mockContent,
        wordCount: 10,
        status: 'completed' as ChapterStatus,
      }));

      const chapterNode = new ChapterNode(chapterConfig);
      const result = await chapterNode.execute(workflowState);

      expect(result.chapters[0]?.wordCount).toBe(10);
      expect(result.chapters[0]?.content).toBe(mockContent);
    });
  });

  describe('Tool Integration', () => {
    it('should work without optional tools', async () => {
      (toolRegistry.getTool as Mock).mockImplementation((toolName: string) => {
        if (toolName === 'chapter_write') {
          return { execute: mockChapterWriteTool };
        }
        return null; // No web research or supabase tools
      });

      const chapterNode = new ChapterNode(chapterConfig);
      const result = await chapterNode.execute(workflowState);

      expect(result.chapters).toHaveLength(1);
      expect(result.chapters[0]?.status).toBe('completed');
      expect(mockWebResearchTool).not.toHaveBeenCalled();
    });

    it('should pass correct parameters to chapter write tool', async () => {
      const chapterNode = new ChapterNode(chapterConfig);
      await chapterNode.execute(workflowState);

      expect(mockChapterWriteTool).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            chapterNumber: 1,
            title: 'Introduction to AI',
            wordTarget: 1500,
            style: workflowState.styleGuide,
          }),
          baseContent: workflowState.baseContent,
          researchData: expect.any(Array),
          contextFromDependencies: undefined,
        })
      );
    });
  });

  describe('Multiple Research Topics', () => {
    it('should research additional topics when specified', async () => {
      const configWithResearch = createMockChapterConfig({
        chapterNumber: 1,
        title: 'Introduction to AI',
        wordTarget: 1500,
        researchRequirements: ['machine learning', 'neural networks', 'deep learning'],
        sessionId: 'test-session-123',
      });

      mockWebResearchTool
        .mockResolvedValueOnce('Primary research data...')
        .mockResolvedValueOnce('Machine learning research...')
        .mockResolvedValueOnce('Neural networks research...');

      const chapterNode = new ChapterNode(configWithResearch);
      await chapterNode.execute(workflowState);

      expect(mockWebResearchTool).toHaveBeenCalledTimes(3);
      expect(mockWebResearchTool).toHaveBeenCalledWith({
        query: 'Introduction to AI Test Topic',
        maxPages: 3,
      });
      expect(mockWebResearchTool).toHaveBeenCalledWith({
        query: 'machine learning Test Topic',
        maxPages: 2,
      });
      expect(mockWebResearchTool).toHaveBeenCalledWith({
        query: 'neural networks Test Topic',
        maxPages: 2,
      });
    });
  });
});