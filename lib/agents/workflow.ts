// Base LangGraph Workflow Configuration
// Implements the core StateGraph structure for book generation orchestration
// Following CLAUDE.md standards and ARCHITECTURE.md workflow design

import { StateGraph, StateGraphArgs } from '@langchain/langgraph';
// import { BaseMessage } from '@langchain/core/messages'; // TODO: Add when LangChain integration is complete
import { WorkflowState, WorkflowStage, ChapterConfig } from '@/types';
import { validateEnvironment } from '@/lib/config/environment';
import {
  WorkflowError,
  WorkflowErrorContext,
  logger,
} from '@/lib/errors/exports';
import { saveCheckpoint, recoverWorkflow } from './state/persistence';
import { createChapterNode } from './nodes/chapter';

// Validate environment on import
validateEnvironment();

/**
 * Core StateGraph configuration for book generation workflow
 * Implements the 6-stage workflow: conversation → outline → chapters → review → formatting → user review
 */
export interface BookWorkflowState extends WorkflowState {
  messages?: any[]; // TODO: Replace with BaseMessage[] when LangChain integration is complete
  lastError?: WorkflowError;
}

/**
 * StateGraph configuration arguments
 */
const stateGraphArgs: StateGraphArgs<BookWorkflowState> = {
  channels: {
    sessionId: {
      value: (prev?: string, next?: string) => next ?? prev ?? '',
      default: () => '',
    },
    userId: {
      value: (prev?: string, next?: string) => next ?? prev,
      default: () => undefined,
    },
    currentStage: {
      value: (prev?: WorkflowStage, next?: WorkflowStage) => next ?? prev ?? 'conversation',
      default: () => 'conversation' as WorkflowStage,
    },
    status: {
      value: (prev?: any, next?: any) => next ?? prev ?? 'active',
      default: () => 'active' as any,
    },
    userPrompt: {
      value: (prev?: string, next?: string) => next ?? prev ?? '',
      default: () => '',
    },
    pdfFile: {
      value: (prev?: Buffer, next?: Buffer) => next ?? prev,
      default: () => undefined,
    },
    baseContent: {
      value: (prev?: string, next?: string) => next ?? prev,
      default: () => undefined,
    },
    requirements: {
      value: (prev: any, next: any) => next ?? prev,
      default: () => undefined,
    },
    styleGuide: {
      value: (prev: any, next: any) => next ?? prev,
      default: () => undefined,
    },
    outline: {
      value: (prev: any, next: any) => next ?? prev,
      default: () => undefined,
    },
    chapters: {
      value: (prev: any[], next: any[]) => next ?? prev ?? [],
      default: () => [],
    },
    currentChapter: {
      value: (prev: any, next: any) => next ?? prev,
      default: () => undefined,
    },
    progress: {
      value: (prev: any, next: any) => ({ ...prev, ...next }),
      default: () => ({
        currentStageProgress: 0,
        overallProgress: 0,
        chaptersCompleted: 0,
        totalChapters: 0,
      }),
    },
    error: {
      value: (prev?: string, next?: string) => next ?? prev,
      default: () => undefined,
    },
    needsRetry: {
      value: (prev?: boolean, next?: boolean) => next ?? prev ?? false,
      default: () => false,
    },
    retryCount: {
      value: (prev?: number, next?: number) => next ?? prev ?? 0,
      default: () => 0,
    },
    createdAt: {
      value: (prev?: string, next?: string) => next ?? prev ?? new Date().toISOString(),
      default: () => new Date().toISOString(),
    },
    updatedAt: {
      value: (prev?: string, next?: string) => new Date().toISOString(),
      default: () => new Date().toISOString(),
    },
    messages: {
      value: (prev?: any[], next?: any[]) => next ?? prev ?? [],
      default: () => [],
    },
    lastError: {
      value: (prev?: WorkflowError, next?: WorkflowError) => next ?? prev,
      default: () => undefined,
    },
  },
};

/**
 * Core StateGraph instance for book workflow orchestration
 */
export const bookWorkflowGraph = new StateGraph<BookWorkflowState>(stateGraphArgs);

/**
 * Node execution wrapper with error handling and context management
 */
export async function executeNodeWithContext<T>(
  nodeName: string,
  state: BookWorkflowState,
  nodeFunction: (state: BookWorkflowState) => Promise<T>
): Promise<T> {
  const errorContext = new WorkflowErrorContext(state.sessionId, state.userId);

  try {
    errorContext.updateStage(state.currentStage);
    logger.info(`Executing node: ${nodeName}`, {
      sessionId: state.sessionId,
      stage: state.currentStage,
      nodeName,
    });

    const result = await nodeFunction(state);

    // Save checkpoint after successful node execution
    await saveCheckpoint(state.sessionId, {
      ...state,
      updatedAt: new Date().toISOString(),
    });

    logger.info(`Node completed successfully: ${nodeName}`, {
      sessionId: state.sessionId,
      nodeName,
    });

    return result;
  } catch (error) {
    const workflowError = error instanceof WorkflowError
      ? error
      : errorContext.createError(WorkflowError, error instanceof Error ? error.message : 'Unknown error', {
          recoverable: true,
          cause: error instanceof Error ? error : undefined,
        });

    logger.error(`Node execution failed: ${nodeName}`, {
      sessionId: state.sessionId,
      nodeName,
      error: workflowError.message,
      recoverable: workflowError.recoverable,
    });

    throw workflowError;
  } finally {
    errorContext.cleanup();
  }
}

/**
 * Utility function to create initial workflow state
 */
export function createInitialState(
  sessionId: string,
  userPrompt: string,
  userId?: string,
  pdfFile?: Buffer
): BookWorkflowState {
  const now = new Date().toISOString();

  return {
    sessionId,
    userId,
    userPrompt,
    pdfFile,
    currentStage: 'conversation',
    status: 'active',
    chapters: [],
    progress: {
      currentStageProgress: 0,
      overallProgress: 0,
      chaptersCompleted: 0,
      totalChapters: 0,
    },
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

/**
 * Utility function to update workflow progress
 */
export function updateWorkflowProgress(
  state: BookWorkflowState,
  stageProgress: number,
  overallProgress: number,
  chaptersCompleted?: number
): Partial<BookWorkflowState> {
  return {
    progress: {
      ...state.progress,
      currentStageProgress: Math.min(100, Math.max(0, stageProgress)),
      overallProgress: Math.min(100, Math.max(0, overallProgress)),
      chaptersCompleted: chaptersCompleted ?? state.progress.chaptersCompleted,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Utility function to transition workflow stage
 */
export function transitionToStage(
  state: BookWorkflowState,
  newStage: WorkflowStage,
  resetRetry = true
): Partial<BookWorkflowState> {
  const stageProgress = newStage === 'failed' ? 0 : 100; // Complete current stage unless failing
  const overallProgress = calculateOverallProgress(newStage);

  return {
    currentStage: newStage,
    progress: {
      ...state.progress,
      currentStageProgress: stageProgress,
      overallProgress,
    },
    retryCount: resetRetry ? 0 : state.retryCount,
    needsRetry: false,
    error: undefined,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate overall progress based on current stage
 */
function calculateOverallProgress(stage: WorkflowStage): number {
  const stageWeights = {
    conversation: 10,
    outline: 20,
    chapter_spawning: 25,
    chapter_generation: 60,
    consistency_review: 75,
    quality_review: 85,
    formatting: 95,
    user_review: 98,
    completed: 100,
    failed: 0,
  };

  return stageWeights[stage] || 0;
}

/**
 * Dynamic parallel chapter node creation
 * Creates N parallel chapter nodes based on outline configuration
 */
export async function createParallelChapterNodes(
  graph: StateGraph<BookWorkflowState>,
  chapterConfigs: ChapterConfig[]
): Promise<string[]> {
  const chapterNodeIds: string[] = [];

  for (const config of chapterConfigs) {
    const nodeId = `chapter_${config.chapterNumber}`;
    chapterNodeIds.push(nodeId);

    // Create chapter node with configuration
    const chapterNode = createChapterNode(config);

    // Add node to graph
    graph.addNode(nodeId, async (state: BookWorkflowState) => {
      return await executeNodeWithContext(nodeId, state,
        async (s: BookWorkflowState) => await chapterNode.execute(s)
      ) as Partial<BookWorkflowState>;
    });

    logger.info(`Created parallel chapter node: ${nodeId}`, {
      sessionId: config.sessionId || 'unknown',
      chapterNumber: config.chapterNumber,
      title: config.title,
      wordTarget: config.wordTarget,
    });
  }

  return chapterNodeIds;
}

/**
 * Workflow recovery utility
 */
export async function recoverWorkflowFromCheckpoint(sessionId: string): Promise<BookWorkflowState> {
  try {
    const recoveredState = await recoverWorkflow(sessionId);

    logger.info(`Recovered workflow state for session: ${sessionId}`, {
      sessionId,
      currentStage: recoveredState.currentStage,
      progress: recoveredState.progress,
    });

    return recoveredState as BookWorkflowState;
  } catch (error) {
    logger.error(`Failed to recover workflow state: ${sessionId}`, {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw new WorkflowError(
      'state_recovery',
      `Failed to recover workflow state for session ${sessionId}`,
      { recoverable: false }
    );
  }
}

/**
 * Export the configured StateGraph for use in workflow execution
 */
export { bookWorkflowGraph as workflow };
export type { BookWorkflowState };