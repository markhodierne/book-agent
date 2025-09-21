// Test suite for base LangGraph workflow structure
// Verifies workflow execution, state management, and node coordination
// Following CLAUDE.md testing standards

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  bookWorkflowGraph,
  createInitialState,
  updateWorkflowProgress,
  transitionToStage,
  executeNodeWithContext,
  createParallelChapterNodes,
  recoverWorkflowFromCheckpoint,
  type BookWorkflowState,
} from '@/lib/agents/workflow';
import { BaseWorkflowNode } from '@/lib/agents/nodes/base';
import { createChapterNode } from '@/lib/agents/nodes/chapter';
import { saveCheckpoint, recoverWorkflow } from '@/lib/agents/state/persistence';
import { WorkflowError } from '@/lib/errors/exports';
import type { ChapterConfig, WorkflowStage } from '@/types';

// Mock external dependencies
vi.mock('@/lib/database/supabaseClient');
vi.mock('@/lib/tools', () => ({
  toolRegistry: {
    getTool: vi.fn(() => null),
  },
}));

// Mock persistence functions
vi.mock('@/lib/agents/state/persistence', () => ({
  saveCheckpoint: vi.fn(),
  recoverWorkflow: vi.fn(),
  updateSessionStatus: vi.fn(),
}));

describe('Base LangGraph Workflow Structure', () => {
  let initialState: BookWorkflowState;
  const sessionId = 'test-session-123';

  beforeEach(() => {
    vi.clearAllMocks();
    initialState = createInitialState(sessionId, 'Test book about AI');
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('StateGraph Configuration', () => {
    it('should create StateGraph with proper channels configuration', () => {
      expect(bookWorkflowGraph).toBeDefined();
      expect(typeof bookWorkflowGraph.addNode).toBe('function');
      expect(typeof bookWorkflowGraph.addEdge).toBe('function');
    });

    it('should have proper channel default values', () => {
      const state = createInitialState(sessionId, 'Test prompt');

      expect(state.sessionId).toBe(sessionId);
      expect(state.userPrompt).toBe('Test prompt');
      expect(state.currentStage).toBe('conversation');
      expect(state.status).toBe('active');
      expect(state.chapters).toEqual([]);
      expect(state.progress.overallProgress).toBe(0);
      expect(state.createdAt).toBeTruthy();
      expect(state.updatedAt).toBeTruthy();
    });
  });

  describe('State Management', () => {
    it('should create initial state correctly', () => {
      const userPrompt = 'Create a book about artificial intelligence';
      const userId = 'user-123';
      const pdfFile = Buffer.from('test pdf content');

      const state = createInitialState(sessionId, userPrompt, userId, pdfFile);

      expect(state.sessionId).toBe(sessionId);
      expect(state.userId).toBe(userId);
      expect(state.userPrompt).toBe(userPrompt);
      expect(state.pdfFile).toBe(pdfFile);
      expect(state.currentStage).toBe('conversation');
      expect(state.status).toBe('active');
      expect(state.chapters).toEqual([]);
    });

    it('should update workflow progress correctly', () => {
      const result = updateWorkflowProgress(initialState, 50, 25, 3);

      expect(result.progress.currentStageProgress).toBe(50);
      expect(result.progress.overallProgress).toBe(25);
      expect(result.progress.chaptersCompleted).toBe(3);
      expect(result.updatedAt).toBeDefined();
      expect(typeof result.updatedAt).toBe('string');
    });

    it('should clamp progress values to 0-100 range', () => {
      const result = updateWorkflowProgress(initialState, 150, -10);

      expect(result.progress.currentStageProgress).toBe(100);
      expect(result.progress.overallProgress).toBe(0);
    });

    it('should transition workflow stages correctly', () => {
      const result = transitionToStage(initialState, 'outline');

      expect(result.currentStage).toBe('outline');
      expect(result.progress.currentStageProgress).toBe(100);
      expect(result.progress.overallProgress).toBe(20);
      expect(result.retryCount).toBe(0);
      expect(result.needsRetry).toBe(false);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Node Execution Framework', () => {
    it('should execute node with context and error handling', async () => {
      const mockNode = vi.fn().mockResolvedValue({ ...initialState, currentStage: 'outline' as WorkflowStage });
      const mockSaveCheckpoint = vi.mocked(saveCheckpoint);

      const result = await executeNodeWithContext('test-node', initialState, mockNode);

      expect(mockNode).toHaveBeenCalledWith(initialState);
      expect(mockSaveCheckpoint).toHaveBeenCalled();
      expect(result.currentStage).toBe('outline');
    });

    it('should handle node execution errors', async () => {
      const mockNode = vi.fn().mockRejectedValue(new Error('Node execution failed'));

      await expect(
        executeNodeWithContext('test-node', initialState, mockNode)
      ).rejects.toThrow(WorkflowError);
    });

    it('should preserve WorkflowError details', async () => {
      const originalError = new WorkflowError('test_error', 'Test error message', {
        recoverable: true,
        sessionId,
      });
      const mockNode = vi.fn().mockRejectedValue(originalError);

      try {
        await executeNodeWithContext('test-node', initialState, mockNode);
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(WorkflowError);
        // The error should be re-thrown as-is when it's already a WorkflowError
        expect(error).toBe(originalError);
      }
    });
  });

  describe('Chapter Node Creation', () => {
    it('should create chapter nodes correctly', async () => {
      const chapterConfigs: ChapterConfig[] = [
        {
          chapterNumber: 1,
          title: 'Introduction to AI',
          outline: 'Introduction chapter outline',
          wordTarget: 2000,
        },
        {
          chapterNumber: 2,
          title: 'Machine Learning Basics',
          outline: 'ML basics chapter outline',
          wordTarget: 2500,
        },
      ];

      const nodes = await createParallelChapterNodes(bookWorkflowGraph, chapterConfigs);

      expect(nodes).toHaveLength(2);
      expect(nodes[0]).toBe('chapter_1');
      expect(nodes[1]).toBe('chapter_2');
    });

    it('should create chapter node with proper configuration', () => {
      const chapterConfig: ChapterConfig = {
        chapterNumber: 1,
        title: 'Test Chapter',
        outline: 'Test outline',
        wordTarget: 1500,
      };

      const chapterNode = createChapterNode(chapterConfig);

      expect(chapterNode.name).toBe('chapter_1');
      expect(chapterNode.description).toContain('Test Chapter');
    });
  });

  describe('State Persistence and Recovery', () => {
    it('should recover workflow from checkpoint', async () => {
      const mockState = {
        ...initialState,
        currentStage: 'outline' as WorkflowStage,
        progress: { ...initialState.progress, overallProgress: 20 },
      };

      const mockRecoverWorkflow = vi.mocked(recoverWorkflow);
      mockRecoverWorkflow.mockResolvedValue(mockState);

      const result = await recoverWorkflowFromCheckpoint(sessionId);

      expect(mockRecoverWorkflow).toHaveBeenCalledWith(sessionId);
      expect(result.currentStage).toBe('outline');
      expect(result.progress.overallProgress).toBe(20);
    });

    it('should handle recovery failures', async () => {
      const mockRecoverWorkflow = vi.mocked(recoverWorkflow);
      mockRecoverWorkflow.mockRejectedValue(new Error('Recovery failed'));

      await expect(
        recoverWorkflowFromCheckpoint(sessionId)
      ).rejects.toThrow(WorkflowError);
    });
  });

  describe('BaseWorkflowNode', () => {
    class TestNode extends BaseWorkflowNode {
      constructor(shouldFail = false) {
        super('test-node', 'Test node for testing');
        this.shouldFail = shouldFail;
      }

      private shouldFail: boolean;

      protected async executeNode(state: BookWorkflowState): Promise<BookWorkflowState> {
        if (this.shouldFail) {
          throw new Error('Test node execution failed');
        }
        return this.transitionToStage(state, 'outline');
      }
    }

    it('should execute node successfully', async () => {
      const node = new TestNode(false);
      const result = await node.execute(initialState);

      expect(result.currentStage).toBe('outline');
    });

    it('should handle node execution failures', async () => {
      const node = new TestNode(true);

      await expect(node.execute(initialState)).rejects.toThrow(WorkflowError);
    });

    it('should update progress during execution', async () => {
      class ProgressTestNode extends BaseWorkflowNode {
        constructor() {
          super('progress-test', 'Progress test node');
        }

        protected async executeNode(state: BookWorkflowState): Promise<BookWorkflowState> {
          let updated = this.updateProgress(state, 50, 'Processing...');
          updated = this.updateProgress(updated, 100, 'Completed');
          return updated;
        }
      }

      const node = new ProgressTestNode();
      const result = await node.execute(initialState);

      expect(result.progress.currentStageProgress).toBe(100);
    });
  });

  describe('Error Recovery', () => {
    it('should retry recoverable errors', async () => {
      class RecoverableNode extends BaseWorkflowNode {
        constructor() {
          super('recoverable-test', 'Recoverable test node');
          this.attempts = 0;
        }

        private attempts: number;

        protected async executeNode(state: BookWorkflowState): Promise<BookWorkflowState> {
          this.attempts++;
          if (this.attempts === 1) {
            throw new WorkflowError('temporary_failure', 'Temporary failure', {
              recoverable: true,
            });
          }
          return this.transitionToStage(state, 'outline');
        }

        async recover(
          state: BookWorkflowState,
          error: WorkflowError
        ): Promise<BookWorkflowState> {
          return this.executeNode(state);
        }
      }

      const node = new RecoverableNode();
      const result = await node.execute(initialState);

      expect(result.currentStage).toBe('outline');
    });

    it('should fail on non-recoverable errors', async () => {
      class NonRecoverableNode extends BaseWorkflowNode {
        constructor() {
          super('non-recoverable-test', 'Non-recoverable test node');
        }

        protected async executeNode(state: BookWorkflowState): Promise<BookWorkflowState> {
          throw new WorkflowError('fatal_error', 'Fatal error', {
            recoverable: false,
          });
        }
      }

      const node = new NonRecoverableNode();

      await expect(node.execute(initialState)).rejects.toThrow(WorkflowError);
    });
  });

  describe('Workflow State Transitions', () => {
    it('should calculate overall progress correctly for all stages', () => {
      const stages: WorkflowStage[] = [
        'conversation',
        'outline',
        'chapter_spawning',
        'chapter_generation',
        'consistency_review',
        'quality_review',
        'formatting',
        'user_review',
        'completed',
        'failed',
      ];

      const expectedProgress = [10, 20, 25, 60, 75, 85, 95, 98, 100, 0];

      stages.forEach((stage, index) => {
        const result = transitionToStage(initialState, stage);
        expect(result.progress.overallProgress).toBe(expectedProgress[index]);
      });
    });

    it('should maintain retry count when not resetting', () => {
      const stateWithRetries = {
        ...initialState,
        retryCount: 3,
      };

      const result = transitionToStage(stateWithRetries, 'outline', false);

      expect(result.retryCount).toBe(3);
    });

    it('should reset retry count when transitioning normally', () => {
      const stateWithRetries = {
        ...initialState,
        retryCount: 3,
        needsRetry: true,
        error: 'Previous error',
      };

      const result = transitionToStage(stateWithRetries, 'outline');

      expect(result.retryCount).toBe(0);
      expect(result.needsRetry).toBe(false);
      expect(result.error).toBeUndefined();
    });
  });
});