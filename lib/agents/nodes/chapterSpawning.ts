// Chapter Spawning Node - Dynamic Parallel Chapter Generation
// Implements Task 15: Creates N parallel chapter nodes based on outline
// Following CLAUDE.md standards and ARCHITECTURE.md parallel design

import { WorkflowState, BookOutline, ChapterConfig } from '@/types';
import { BaseWorkflowNode } from './base';
import { ChapterNodeConfig, resolveChapterDependencies } from './chapter';
import { bookWorkflowGraph, createParallelChapterNodes } from '../workflow';
import {
  WorkflowError,
  logger,
} from '@/lib/errors/exports';

/**
 * Chapter Spawning Node
 * Dynamically creates parallel chapter nodes based on the book outline
 * Manages dependencies and coordinates parallel execution
 */
export class ChapterSpawningNode extends BaseWorkflowNode {
  constructor() {
    super(
      'chapter_spawning',
      'Create dynamic parallel chapter nodes for concurrent generation'
    );
  }

  /**
   * Execute chapter spawning with dynamic node creation and parallel coordination
   */
  protected async executeNode(state: WorkflowState): Promise<WorkflowState> {
    if (!state.outline) {
      throw new WorkflowError(
        'missing_outline',
        'Chapter spawning requires a complete book outline',
        {
          nodeName: this.name,
          sessionId: state.sessionId,
          recoverable: false,
        }
      );
    }

    logger.info('Starting chapter spawning process', {
      sessionId: state.sessionId,
      totalChapters: state.outline.chapters.length,
      bookTitle: state.outline.title,
    });

    // Update progress - starting spawning process
    let updatedState = this.updateProgress(state, 10, 'Analyzing chapter structure');

    try {
      // Phase 1: Create chapter configurations from outline
      updatedState = this.updateProgress(
        updatedState,
        20,
        'Creating chapter configurations'
      );

      const chapterConfigs = this.createChapterConfigs(state.outline, state.sessionId);

      logger.info('Chapter configurations created', {
        sessionId: state.sessionId,
        configurations: chapterConfigs.map(c => ({
          number: c.chapterNumber,
          title: c.title,
          wordTarget: c.wordTarget,
          dependencies: c.dependencies || [],
        })),
      });

      // Phase 2: Resolve chapter dependencies
      updatedState = this.updateProgress(
        updatedState,
        40,
        'Resolving chapter dependencies'
      );

      const dependencyLayers = resolveChapterDependencies(chapterConfigs);

      logger.info('Chapter dependencies resolved', {
        sessionId: state.sessionId,
        totalLayers: dependencyLayers.length,
        layerSizes: dependencyLayers.map(layer => layer.length),
      });

      // Phase 3: Create parallel chapter nodes in workflow graph
      updatedState = this.updateProgress(
        updatedState,
        60,
        'Creating parallel chapter nodes'
      );

      const chapterNodeIds = await this.createChapterNodes(chapterConfigs);

      logger.info('Parallel chapter nodes created', {
        sessionId: state.sessionId,
        nodeIds: chapterNodeIds,
        totalNodes: chapterNodeIds.length,
      });

      // Phase 4: Configure parallel execution coordination
      updatedState = this.updateProgress(
        updatedState,
        80,
        'Configuring parallel execution'
      );

      const executionPlan = this.createExecutionPlan(dependencyLayers, chapterNodeIds);

      // Phase 5: Update workflow state with spawning results
      updatedState = this.updateProgress(
        updatedState,
        100,
        'Chapter spawning completed'
      );

      // Update state with chapter spawning results
      const finalState = {
        ...updatedState,
        progress: {
          ...updatedState.progress,
          totalChapters: chapterConfigs.length,
          chaptersCompleted: 0, // Reset since we're starting fresh
        },
        // Store spawning metadata for later use
        chapterSpawning: {
          nodeIds: chapterNodeIds,
          executionPlan,
          dependencyLayers: dependencyLayers.length,
          totalNodes: chapterNodeIds.length,
          spawnedAt: new Date().toISOString(),
        },
      };

      // Transition to chapter generation stage
      const transitionedState = this.transitionToStage(finalState, 'chapter_generation');

      logger.info('Chapter spawning completed successfully', {
        sessionId: state.sessionId,
        totalNodesCreated: chapterNodeIds.length,
        dependencyLayers: dependencyLayers.length,
        nextStage: 'chapter_generation',
      });

      return transitionedState;
    } catch (error) {
      logger.error('Chapter spawning failed', {
        sessionId: state.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new WorkflowError(
        'spawning_failed',
        `Chapter spawning failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          nodeName: this.name,
          sessionId: state.sessionId,
          recoverable: true,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Validate that we have everything needed for chapter spawning
   */
  validate(state: WorkflowState): boolean {
    return !!(
      state.outline &&
      state.outline.chapters &&
      state.outline.chapters.length > 0 &&
      state.requirements &&
      state.styleGuide &&
      state.sessionId
    );
  }

  /**
   * Attempt recovery for chapter spawning failures
   */
  async recover(
    state: WorkflowState,
    error: WorkflowError
  ): Promise<WorkflowState> {
    logger.info('Attempting chapter spawning recovery', {
      sessionId: state.sessionId,
      error: error.message,
    });

    // Increment retry count
    const retryState = {
      ...state,
      retryCount: (state.retryCount || 0) + 1,
      needsRetry: false,
      error: undefined,
    };

    // Limit retry attempts
    if (retryState.retryCount > 2) {
      throw new WorkflowError(
        'max_retries_exceeded',
        'Maximum retries exceeded for chapter spawning',
        {
          nodeName: this.name,
          sessionId: state.sessionId,
          recoverable: false,
        }
      );
    }

    // For recovery, we might simplify the outline or reduce chapter count
    const simplifiedOutline = this.simplifyOutlineForRecovery(state.outline!);
    const recoveryState = {
      ...retryState,
      outline: simplifiedOutline,
    };

    return this.executeNode(recoveryState);
  }

  /**
   * Create chapter configurations from book outline
   */
  private createChapterConfigs(
    outline: BookOutline,
    sessionId: string
  ): ChapterNodeConfig[] {
    return outline.chapters.map((chapter, index) => {
      const config: ChapterNodeConfig = {
        chapterNumber: chapter.chapterNumber || index + 1,
        title: chapter.title,
        outline: chapter.outline,
        objectives: chapter.objectives || [],
        wordTarget: chapter.wordCount,
        dependencies: chapter.dependencies || [],
        sessionId,
        // Additional configuration
        researchRequirements: chapter.researchRequirements || [],
      };

      return config;
    });
  }

  /**
   * Create parallel chapter nodes in the workflow graph
   */
  private async createChapterNodes(
    chapterConfigs: ChapterNodeConfig[]
  ): Promise<string[]> {
    try {
      // Use the existing createParallelChapterNodes function from workflow.ts
      const nodeIds = await createParallelChapterNodes(bookWorkflowGraph, chapterConfigs);

      logger.info('Chapter nodes added to workflow graph', {
        nodeIds,
        totalNodes: nodeIds.length,
      });

      return nodeIds;
    } catch (error) {
      logger.error('Failed to create chapter nodes in workflow graph', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configCount: chapterConfigs.length,
      });

      throw new WorkflowError(
        'node_creation_failed',
        `Failed to create chapter nodes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          recoverable: true,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Create execution plan for parallel chapter coordination
   */
  private createExecutionPlan(
    dependencyLayers: ChapterNodeConfig[][],
    nodeIds: string[]
  ): ExecutionPlan {
    const executionLayers = dependencyLayers.map((layer, layerIndex) => ({
      layerIndex,
      nodeIds: layer.map(config => `chapter_${config.chapterNumber}`),
      dependencies: layerIndex === 0 ? [] : dependencyLayers[layerIndex - 1].map(config => `chapter_${config.chapterNumber}`),
      estimatedDuration: this.estimateLayerDuration(layer),
    }));

    return {
      totalLayers: dependencyLayers.length,
      executionLayers,
      estimatedTotalDuration: executionLayers.reduce((sum, layer) => sum + layer.estimatedDuration, 0),
      parallelismFactor: Math.max(...executionLayers.map(layer => layer.nodeIds.length)),
    };
  }

  /**
   * Estimate duration for a dependency layer
   */
  private estimateLayerDuration(layer: ChapterNodeConfig[]): number {
    // Base time per chapter: 5 minutes (300 seconds)
    const baseTimePerChapter = 300;

    // Calculate based on word targets
    const avgWordTarget = layer.reduce((sum, config) => sum + config.wordTarget, 0) / layer.length;

    // Adjust based on word count (more words = more time)
    const wordMultiplier = Math.max(0.5, Math.min(2.0, avgWordTarget / 1500)); // Scale around 1500 words baseline

    // Parallel execution reduces total time
    const parallelEfficiency = 0.8; // 80% parallel efficiency

    return Math.ceil(baseTimePerChapter * wordMultiplier * parallelEfficiency);
  }

  /**
   * Simplify outline for recovery attempts
   */
  private simplifyOutlineForRecovery(outline: BookOutline): BookOutline {
    // Reduce chapter count and word targets for easier processing
    const simplifiedChapters = outline.chapters
      .slice(0, Math.min(outline.chapters.length, 10)) // Max 10 chapters for recovery
      .map(chapter => ({
        ...chapter,
        wordCount: Math.max(800, Math.min(chapter.wordCount, 1500)), // Limit word count range
        dependencies: [], // Remove dependencies to avoid complexity
      }));

    return {
      ...outline,
      chapters: simplifiedChapters,
      totalWordCount: simplifiedChapters.reduce((sum, ch) => sum + ch.wordCount, 0),
    };
  }

  /**
   * Chapter spawning specific error recovery logic
   */
  protected isRecoverableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('node_creation_failed') ||
        message.includes('dependency') ||
        message.includes('graph') ||
        super.isRecoverableError(error)
      );
    }
    return false;
  }
}

/**
 * Execution plan for parallel chapter coordination
 */
export interface ExecutionPlan {
  totalLayers: number;
  executionLayers: ExecutionLayer[];
  estimatedTotalDuration: number; // in seconds
  parallelismFactor: number; // max parallel nodes in any layer
}

/**
 * Individual execution layer in the plan
 */
export interface ExecutionLayer {
  layerIndex: number;
  nodeIds: string[];
  dependencies: string[]; // Node IDs that must complete before this layer
  estimatedDuration: number; // in seconds
}

/**
 * Factory function to create chapter spawning node
 */
export function createChapterSpawningNode(): ChapterSpawningNode {
  return new ChapterSpawningNode();
}

/**
 * Utility function to validate chapter spawning prerequisites
 */
export function validateChapterSpawningPrerequisites(state: WorkflowState): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!state.outline) {
    errors.push('Missing book outline');
  } else {
    if (!state.outline.chapters || state.outline.chapters.length === 0) {
      errors.push('Outline contains no chapters');
    }

    if (state.outline.totalWordCount < 30000) {
      errors.push('Book does not meet minimum word count requirement (30,000 words)');
    }
  }

  if (!state.requirements) {
    errors.push('Missing book requirements');
  }

  if (!state.styleGuide) {
    errors.push('Missing style guide');
  }

  if (!state.sessionId) {
    errors.push('Missing session ID');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}