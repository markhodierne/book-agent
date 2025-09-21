// Base Node Implementation Framework
// Provides common functionality and patterns for all workflow nodes
// Following CLAUDE.md standards and error handling requirements

import { WorkflowState, WorkflowStage } from '@/types';
import {
  WorkflowError,
  WorkflowErrorContext,
  logger,
  withRetry,
  retryChapterGeneration,
} from '@/lib/errors/exports';
import { updateSessionStatus } from '../state/persistence';

/**
 * Base interface for all workflow nodes
 */
export interface WorkflowNode<T = WorkflowState> {
  name: string;
  description: string;
  execute: (state: WorkflowState) => Promise<T>;
  validate?: (state: WorkflowState) => boolean;
  recover?: (state: WorkflowState, error: WorkflowError) => Promise<WorkflowState>;
}

/**
 * Node execution result with state updates
 */
export interface NodeExecutionResult {
  success: boolean;
  state: WorkflowState;
  error?: WorkflowError;
  nextStage?: WorkflowStage;
  retryable?: boolean;
}

/**
 * Base node class providing common functionality
 */
export abstract class BaseWorkflowNode implements WorkflowNode {
  public readonly name: string;
  public readonly description: string;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  /**
   * Execute the node with error handling and context management
   */
  async execute(state: WorkflowState): Promise<WorkflowState> {
    const errorContext = new WorkflowErrorContext(state.sessionId, state.userId);

    try {
      errorContext.updateStage(state.currentStage);

      // Validate input state
      if (this.validate && !this.validate(state)) {
        throw new WorkflowError(
          'validation',
          `Node validation failed: ${this.name}`,
          {
            nodeName: this.name,
            sessionId: state.sessionId,
            stage: state.currentStage,
            recoverable: false,
          }
        );
      }

      logger.info(`Executing workflow node: ${this.name}`, {
        sessionId: state.sessionId,
        stage: state.currentStage,
        nodeName: this.name,
      });

      // Execute node-specific logic
      const result = await this.executeNode(state);

      logger.info(`Node execution completed: ${this.name}`, {
        sessionId: state.sessionId,
        nodeName: this.name,
      });

      return result;
    } catch (error) {
      // Attempt recovery if available
      if (this.recover && error instanceof WorkflowError && error.recoverable) {
        logger.warn(`Attempting node recovery: ${this.name}`, {
          sessionId: state.sessionId,
          nodeName: this.name,
          error: error.message,
        });

        try {
          return await this.recover(state, error);
        } catch (recoveryError) {
          logger.error(`Node recovery failed: ${this.name}`, {
            sessionId: state.sessionId,
            nodeName: this.name,
            recoveryError:
              recoveryError instanceof Error ? recoveryError.message : 'Unknown',
          });
        }
      }

      // Create or wrap error
      const workflowError = error instanceof WorkflowError
        ? error
        : errorContext.createError(
            WorkflowError,
            error instanceof Error ? error.message : 'Unknown error',
            {
              nodeName: this.name,
              recoverable: this.isRecoverableError(error),
              cause: error instanceof Error ? error : undefined,
            }
          );

      logger.error(`Node execution failed: ${this.name}`, {
        sessionId: state.sessionId,
        nodeName: this.name,
        error: workflowError.message,
        recoverable: workflowError.recoverable,
      });

      // Update session status to failed if not recoverable
      if (!workflowError.recoverable) {
        await updateSessionStatus(state.sessionId, 'failed', state.currentStage);
      }

      throw workflowError;
    } finally {
      errorContext.cleanup();
    }
  }

  /**
   * Abstract method to be implemented by concrete nodes
   */
  protected abstract executeNode(state: WorkflowState): Promise<WorkflowState>;

  /**
   * Determine if an error is recoverable (can be overridden by subclasses)
   */
  protected isRecoverableError(error: unknown): boolean {
    // Default: network and temporary errors are recoverable
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('rate limit') ||
        message.includes('temporary')
      );
    }
    return false;
  }

  /**
   * Update workflow progress within a node
   */
  protected updateProgress(
    state: WorkflowState,
    stageProgress: number,
    message?: string
  ): WorkflowState {
    const updatedProgress = {
      ...state.progress,
      currentStageProgress: Math.min(100, Math.max(0, stageProgress)),
    };

    if (message) {
      logger.info(`Progress update: ${this.name} - ${message}`, {
        sessionId: state.sessionId,
        nodeName: this.name,
        progress: stageProgress,
      });
    }

    return {
      ...state,
      progress: updatedProgress,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Transition to next workflow stage
   */
  protected transitionToStage(
    state: WorkflowState,
    nextStage: WorkflowStage,
    progress = 100
  ): WorkflowState {
    logger.info(`Stage transition: ${state.currentStage} → ${nextStage}`, {
      sessionId: state.sessionId,
      nodeName: this.name,
      fromStage: state.currentStage,
      toStage: nextStage,
    });

    return {
      ...state,
      currentStage: nextStage,
      progress: {
        ...state.progress,
        currentStageProgress: progress,
        overallProgress: this.calculateOverallProgress(nextStage),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate overall progress based on stage
   */
  private calculateOverallProgress(stage: WorkflowStage): number {
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
}

/**
 * Factory function for creating workflow nodes with consistent patterns
 */
export function createWorkflowNode<T extends WorkflowState = WorkflowState>(
  config: {
    name: string;
    description: string;
    execute: (state: WorkflowState) => Promise<T>;
    validate?: (state: WorkflowState) => boolean;
    recover?: (state: WorkflowState, error: WorkflowError) => Promise<WorkflowState>;
    retryConfig?: any;
  }
): WorkflowNode<T> {
  return {
    name: config.name,
    description: config.description,
    execute: async (state: WorkflowState): Promise<T> => {
      const wrappedExecute = config.retryConfig
        ? () => withRetry(() => config.execute(state), config.retryConfig)
        : () => config.execute(state);

      return wrappedExecute();
    },
    validate: config.validate,
    recover: config.recover,
  };
}

/**
 * Utility for parallel node execution with dependency management
 */
export async function executeParallelNodes<T>(
  nodes: Array<{
    node: WorkflowNode<T>;
    state: WorkflowState;
    dependencies?: string[];
  }>,
  maxConcurrency = 5
): Promise<T[]> {
  const results: T[] = [];
  const executing = new Map<string, Promise<T>>();
  const completed = new Set<string>();

  // Execute nodes in dependency order with concurrency control
  while (completed.size < nodes.length) {
    const readyNodes = nodes.filter(
      ({ node, dependencies = [] }) =>
        !completed.has(node.name) &&
        !executing.has(node.name) &&
        dependencies.every((dep) => completed.has(dep))
    );

    // Start execution for ready nodes (respecting concurrency limit)
    const availableSlots = maxConcurrency - executing.size;
    const nodesToStart = readyNodes.slice(0, availableSlots);

    for (const { node, state } of nodesToStart) {
      const promise = node.execute(state);
      executing.set(node.name, promise);

      // Handle completion
      promise
        .then((result) => {
          results.push(result);
          completed.add(node.name);
          executing.delete(node.name);
        })
        .catch((error) => {
          executing.delete(node.name);
          logger.error(`Parallel node execution failed: ${node.name}`, {
            nodeName: node.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        });
    }

    // Wait for at least one node to complete before checking again
    if (executing.size > 0) {
      await Promise.race(Array.from(executing.values()));
    }
  }

  return results;
}

/**
 * Node execution metrics for monitoring
 */
export interface NodeMetrics {
  nodeName: string;
  executionTime: number;
  success: boolean;
  retryCount: number;
  errorType?: string;
}

/**
 * Wrapper for collecting node execution metrics
 */
export async function executeWithMetrics<T>(
  node: WorkflowNode<T>,
  state: WorkflowState
): Promise<{ result: T; metrics: NodeMetrics }> {
  const startTime = Date.now();
  let success = false;
  let error: Error | undefined;

  try {
    const result = await node.execute(state);
    success = true;
    return {
      result,
      metrics: {
        nodeName: node.name,
        executionTime: Date.now() - startTime,
        success,
        retryCount: state.retryCount || 0,
      },
    };
  } catch (err) {
    error = err instanceof Error ? err : new Error('Unknown error');
    throw error;
  } finally {
    if (!success && error) {
      const metrics: NodeMetrics = {
        nodeName: node.name,
        executionTime: Date.now() - startTime,
        success,
        retryCount: state.retryCount || 0,
        errorType: error.constructor.name,
      };

      logger.warn('Node execution metrics (failed)', metrics);
    }
  }
}