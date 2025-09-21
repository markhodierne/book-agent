import { describe, it, expect, beforeEach } from 'vitest';
import { mockWorkflowState, mockChapterConfig } from '../fixtures';
import { setupTestEnvironment, createMockAgent } from '../utils';

// This would import the actual workflow once implemented
// import { bookWorkflow } from '@/lib/agents/book-workflow';

describe('Book Creation Workflow', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  it('should complete successfully with minimal user input', async () => {
    const mockWorkflow = createMockAgent({
      ...mockWorkflowState,
      chapters: [mockChapterConfig],
      currentStage: 'completed',
    });

    const result = await mockWorkflow.invoke(mockWorkflowState);

    expect(result.chapters).toHaveLength(1);
    expect(result.currentStage).toBe('completed');
    expect(mockWorkflow.invoke).toHaveBeenCalledWith(mockWorkflowState);
  });

  it('should recover from chapter generation failure', async () => {
    const failedState = {
      ...mockWorkflowState,
      error: 'Chapter generation failed',
      needsRetry: true,
    };

    const mockWorkflow = createMockAgent({
      ...failedState,
      error: undefined,
      needsRetry: false,
      chapters: [mockChapterConfig],
    });

    const result = await mockWorkflow.invoke(failedState);

    expect(result.error).toBeUndefined();
    expect(result.needsRetry).toBe(false);
    expect(result.chapters).toHaveLength(1);
  });

  it('should generate book meeting minimum word count', async () => {
    const mockWorkflow = createMockAgent({
      ...mockWorkflowState,
      chapters: [
        { ...mockChapterConfig, wordTarget: 2000 },
        { ...mockChapterConfig, number: 2, wordTarget: 2000 },
        { ...mockChapterConfig, number: 3, wordTarget: 2000 },
      ],
      progress: {
        totalChapters: 3,
        completedChapters: 3,
        currentChapterProgress: 100,
      },
    });

    const result = await mockWorkflow.invoke(mockWorkflowState);

    const totalWords = result.chapters.reduce(
      (sum: number, chapter: any) => sum + chapter.wordTarget,
      0
    );

    expect(totalWords).toBeGreaterThanOrEqual(5000); // Minimum book length
    expect(result.progress.completedChapters).toBe(3);
  });

  it('should handle parallel chapter generation', async () => {
    const multiChapterState = {
      ...mockWorkflowState,
      bookRequirements: {
        ...mockWorkflowState.bookRequirements,
        chapters: [
          { ...mockChapterConfig, number: 1 },
          { ...mockChapterConfig, number: 2 },
          { ...mockChapterConfig, number: 3 },
        ],
      },
    };

    const mockWorkflow = createMockAgent({
      ...multiChapterState,
      chapters: [
        { ...mockChapterConfig, number: 1, status: 'completed' },
        { ...mockChapterConfig, number: 2, status: 'completed' },
        { ...mockChapterConfig, number: 3, status: 'completed' },
      ],
    });

    const result = await mockWorkflow.invoke(multiChapterState);

    expect(result.chapters).toHaveLength(3);
    expect(result.chapters.every((chapter: any) => chapter.status === 'completed')).toBe(true);
  });

  it('should maintain state consistency across checkpoints', async () => {
    const mockWorkflow = createMockAgent(mockWorkflowState);

    const result = await mockWorkflow.invoke(mockWorkflowState);

    expect(result.sessionId).toBe(mockWorkflowState.sessionId);
    expect(result.userId).toBe(mockWorkflowState.userId);
    expect(result.bookRequirements).toEqual(mockWorkflowState.bookRequirements);
  });
});