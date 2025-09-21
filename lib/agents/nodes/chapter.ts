// Chapter Node Factory for Parallel Chapter Generation
// Creates individual chapter generation nodes for LangGraph parallel execution
// Following CLAUDE.md standards and ARCHITECTURE.md parallel design

import { ChapterConfig, ChapterResult, WorkflowState } from '@/types';
import { BaseWorkflowNode } from './base';
import { toolRegistry } from '@/lib/tools';
import { ChapterWriteParams } from '@/lib/tools/chapterWriteTool';
import {
  WorkflowError,
  logger,
  withRetry,
  retryChapterGeneration,
} from '@/lib/errors/exports';

/**
 * Chapter node configuration for parallel execution
 */
export interface ChapterNodeConfig extends ChapterConfig {
  sessionId?: string;
  dependencies?: number[]; // Chapter numbers this chapter depends on
  researchRequirements?: string[]; // Research topics for this chapter
  objectives?: string[]; // Key learning objectives for this chapter
}

/**
 * Chapter generation node for parallel execution
 * Each chapter is generated independently with shared state coordination
 */
export class ChapterNode extends BaseWorkflowNode {
  private config: ChapterNodeConfig;

  constructor(config: ChapterNodeConfig) {
    super(
      `chapter_${config.chapterNumber}`,
      `Generate chapter ${config.chapterNumber}: ${config.title}`
    );
    this.config = config;
  }

  /**
   * Execute chapter generation with research and content creation
   */
  protected async executeNode(state: WorkflowState): Promise<WorkflowState> {
    if (!state.outline || !state.styleGuide || !state.requirements) {
      throw new WorkflowError(
        state.sessionId,
        state.currentStage,
        'Chapter generation requires outline, style guide, and requirements',
        {
          code: 'missing_dependencies',
          recoverable: false,
          context: {
            nodeName: this.name,
          },
        }
      );
    }

    logger.info(`Starting chapter ${this.config.chapterNumber} generation`, {
      sessionId: state.sessionId,
      chapterNumber: this.config.chapterNumber,
      title: this.config.title,
      wordTarget: this.config.wordTarget,
    });

    // Update progress - starting chapter generation
    let updatedState = this.updateProgress(state, 10, 'Starting chapter generation');

    try {
      // Update status to researching
      await this.updateChapterStatus(state.sessionId, this.config.chapterNumber, 'researching');

      // Phase 1: Research (if web research tool is available)
      updatedState = this.updateProgress(
        updatedState,
        20,
        'Conducting research for chapter content'
      );

      const researchData = await this.conductChapterResearch(state);

      // Phase 2: Get dependent chapter content
      updatedState = this.updateProgress(
        updatedState,
        40,
        'Processing chapter dependencies'
      );

      const dependentContent = this.getDependentChapterContent(state);

      // Update status to writing
      await this.updateChapterStatus(state.sessionId, this.config.chapterNumber, 'writing', 'Generating chapter content');

      // Phase 3: Generate chapter content using the chapter write tool
      updatedState = this.updateProgress(
        updatedState,
        60,
        'Generating chapter content'
      );

      const chapterResult = await this.generateChapterContent(state, researchData, dependentContent);

      // Phase 4: Persist chapter data
      updatedState = this.updateProgress(
        updatedState,
        80,
        'Saving chapter data'
      );

      await this.persistChapterResult(state.sessionId, chapterResult);

      // Update status to completed
      await this.updateChapterStatus(state.sessionId, this.config.chapterNumber, 'completed', 'Chapter generation completed successfully');

      // Complete chapter generation
      updatedState = this.updateProgress(
        updatedState,
        100,
        'Chapter generation completed'
      );

      // Add chapter to results
      const updatedChapters = [...updatedState.chapters, chapterResult];

      logger.info(`Chapter ${this.config.chapterNumber} generation completed successfully`, {
        sessionId: state.sessionId,
        chapterNumber: this.config.chapterNumber,
        wordCount: chapterResult.wordCount,
        title: chapterResult.title,
        researchSources: chapterResult.researchSources?.length || 0,
      });

      return {
        ...updatedState,
        chapters: updatedChapters,
        progress: {
          ...updatedState.progress,
          chaptersCompleted: updatedChapters.filter(c => c.status === 'completed').length,
        },
      };
    } catch (error) {
      logger.error(`Chapter ${this.config.chapterNumber} generation failed`, {
        sessionId: state.sessionId,
        chapterNumber: this.config.chapterNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Create failed chapter result
      const failedChapter: ChapterResult = {
        chapterNumber: this.config.chapterNumber,
        title: this.config.title,
        content: '',
        wordCount: 0,
        status: 'failed',
        generatedAt: new Date().toISOString(),
        reviewNotes: [`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };

      return {
        ...updatedState,
        chapters: [...updatedState.chapters, failedChapter],
        error: `Chapter ${this.config.chapterNumber} generation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        needsRetry: true,
      };
    }
  }

  /**
   * Validate chapter generation dependencies
   */
  validate(state: WorkflowState): boolean {
    return !!(
      state.outline &&
      state.styleGuide &&
      state.requirements &&
      state.sessionId
    );
  }

  /**
   * Attempt recovery for chapter generation failures
   */
  async recover(
    state: WorkflowState,
    error: WorkflowError
  ): Promise<WorkflowState> {
    logger.info(`Attempting recovery for chapter ${this.config.chapterNumber}`, {
      sessionId: state.sessionId,
      chapterNumber: this.config.chapterNumber,
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
        state.sessionId,
        state.currentStage,
        `Maximum retries exceeded for chapter ${this.config.chapterNumber}`,
        {
          code: 'max_retries_exceeded',
          recoverable: false,
          context: {
            nodeName: this.name,
          },
        }
      );
    }

    // Retry with modified configuration (reduced complexity)
    const recoveryConfig = {
      ...this.config,
      wordTarget: Math.max(1000, this.config.wordTarget * 0.8), // Reduce word target by 20%
    };

    const recoveredNode = new ChapterNode(recoveryConfig);
    return recoveredNode.executeNode(retryState);
  }

  /**
   * Conduct research for the chapter using available research tools
   */
  private async conductChapterResearch(state: WorkflowState): Promise<string[]> {
    const researchData: string[] = [];

    // Check if web research tool is available
    const webResearchTool = toolRegistry.getTool('web_research');
    if (webResearchTool) {
      try {
        // Research the chapter topic and title
        const primaryQuery = `${this.config.title} ${state.requirements!.topic}`;

        const researchResult = await withRetry(
          () =>
            webResearchTool.execute({
              query: primaryQuery,
              maxPages: 3, // Conservative limit for parallel execution
            }),
          retryChapterGeneration
        );

        if (researchResult && typeof researchResult === 'string' && researchResult.trim().length > 0) {
          researchData.push(researchResult);
        }

        logger.info(`Research completed for chapter ${this.config.chapterNumber}`, {
          sessionId: state.sessionId,
          chapterNumber: this.config.chapterNumber,
          query: primaryQuery,
          researchLength: researchResult?.length || 0,
        });

        // Research additional topics if specified
        if (this.config.researchRequirements && this.config.researchRequirements.length > 0) {
          for (const topic of this.config.researchRequirements.slice(0, 2)) { // Limit to 2 additional topics
            try {
              const topicResult = await withRetry(
                () =>
                  webResearchTool.execute({
                    query: `${topic} ${state.requirements!.topic}`,
                    maxPages: 2,
                  }),
                retryChapterGeneration
              );

              if (topicResult && typeof topicResult === 'string' && topicResult.trim().length > 0) {
                researchData.push(topicResult);
              }
            } catch (error) {
              logger.warn(`Additional research failed for topic: ${topic}`, {
                sessionId: state.sessionId,
                chapterNumber: this.config.chapterNumber,
                topic,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }
        }
      } catch (error) {
        logger.warn(`Primary research failed for chapter ${this.config.chapterNumber}, continuing without`, {
          sessionId: state.sessionId,
          chapterNumber: this.config.chapterNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      logger.info(`Web research tool not available for chapter ${this.config.chapterNumber}`, {
        sessionId: state.sessionId,
        chapterNumber: this.config.chapterNumber,
      });
    }

    return researchData;
  }

  /**
   * Generate chapter content using the chapter write tool
   */
  private async generateChapterContent(
    state: WorkflowState,
    researchData: string[],
    dependentContent: string
  ): Promise<ChapterResult> {
    const chapterWriteTool = toolRegistry.getTool('chapter_write');
    if (!chapterWriteTool) {
      throw new WorkflowError(
        state.sessionId,
        state.currentStage,
        'Chapter write tool not available',
        {
          code: 'missing_tool',
          recoverable: false,
          context: {
            nodeName: this.name,
          },
        }
      );
    }

    // Prepare the parameters for the chapter write tool
    const chapterWriteParams: ChapterWriteParams = {
      config: {
        chapterNumber: this.config.chapterNumber,
        title: this.config.title,
        outline: this.config.outline,
        wordTarget: this.config.wordTarget,
        dependencies: this.config.dependencies || [],
        style: state.styleGuide!,
        researchTopics: this.config.researchRequirements || [],
      },
      baseContent: state.baseContent,
      researchData: researchData.length > 0 ? researchData : undefined,
      contextFromDependencies: dependentContent || undefined,
    };

    logger.info(`Generating content for chapter ${this.config.chapterNumber}`, {
      sessionId: state.sessionId,
      chapterNumber: this.config.chapterNumber,
      wordTarget: this.config.wordTarget,
      hasBaseContent: !!state.baseContent,
      researchSources: researchData.length,
      hasDependentContent: !!dependentContent,
    });

    // Execute chapter generation with retry logic
    const chapterResult = await withRetry(
      () => chapterWriteTool.execute(chapterWriteParams),
      retryChapterGeneration
    );

    // Validate the result is properly typed
    if (!chapterResult || typeof chapterResult !== 'object') {
      throw new WorkflowError(
        state.sessionId,
        state.currentStage,
        'Chapter write tool returned invalid result',
        {
          code: 'invalid_tool_result',
          recoverable: true,
          context: {
            nodeName: this.name,
          },
        }
      );
    }

    return chapterResult as ChapterResult;
  }

  /**
   * Get content from dependent chapters
   */
  private getDependentChapterContent(state: WorkflowState): string {
    if (!this.config.dependencies || this.config.dependencies.length === 0) {
      return '';
    }

    const dependentContent = this.config.dependencies
      .map((chapterNum) => {
        const chapter = state.chapters.find(
          (c) => c.chapterNumber === chapterNum && c.status === 'completed'
        );
        if (chapter) {
          // Include a summary of the dependent chapter content (first 500 words)
          const words = chapter.content.split(/\s+/);
          const summary = words.slice(0, 500).join(' ');
          return `Chapter ${chapterNum} - ${chapter.title}:\n${summary}${words.length > 500 ? '...' : ''}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n---\n\n');

    return dependentContent;
  }

  /**
   * Persist chapter result to database using Supabase
   */
  private async persistChapterResult(
    sessionId: string,
    chapterResult: ChapterResult
  ): Promise<void> {
    const supabaseStateTool = toolRegistry.getTool('supabase_state');
    if (supabaseStateTool) {
      try {
        logger.info(`Persisting chapter ${chapterResult.chapterNumber} to database`, {
          sessionId,
          chapterNumber: chapterResult.chapterNumber,
          wordCount: chapterResult.wordCount,
          status: chapterResult.status,
        });

        await withRetry(
          () =>
            supabaseStateTool.execute({
              operation: 'save_chapter',
              sessionId,
              data: chapterResult,
            }),
          {
            maxRetries: 2,
            backoffMultiplier: 1.5,
            initialDelay: 1000,
            maxDelay: 5000,
          }
        );

        logger.info(`Chapter ${chapterResult.chapterNumber} persisted successfully`, {
          sessionId,
          chapterNumber: chapterResult.chapterNumber,
        });
      } catch (error) {
        logger.error(
          `Failed to persist chapter ${chapterResult.chapterNumber} after retries`,
          {
            sessionId,
            chapterNumber: chapterResult.chapterNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        );
        // Don't throw here - persistence failure shouldn't fail the entire chapter generation
      }
    } else {
      logger.warn(
        `Supabase state tool not available for persisting chapter ${chapterResult.chapterNumber}`,
        {
          sessionId,
          chapterNumber: chapterResult.chapterNumber,
        }
      );
    }
  }

  /**
   * Update chapter status in the workflow state
   */
  private async updateChapterStatus(
    sessionId: string,
    chapterNumber: number,
    status: ChapterStatus,
    progressMessage?: string
  ): Promise<void> {
    try {
      const supabaseStateTool = toolRegistry.getTool('supabase_state');
      if (supabaseStateTool) {
        await supabaseStateTool.execute({
          operation: 'update_chapter_status',
          sessionId,
          data: {
            chapterNumber,
            status,
            progressMessage,
            updatedAt: new Date().toISOString(),
          },
        });

        logger.info(`Chapter ${chapterNumber} status updated to ${status}`, {
          sessionId,
          chapterNumber,
          status,
          progressMessage,
        });
      }
    } catch (error) {
      logger.warn(`Failed to update chapter ${chapterNumber} status`, {
        sessionId,
        chapterNumber,
        status,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Enhanced error handling with specific recovery strategies
   */
  protected isRecoverableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('api') ||
        message.includes('timeout') ||
        message.includes('rate limit') ||
        message.includes('content_quality') ||
        message.includes('network') ||
        message.includes('connection') ||
        message.includes('server') ||
        message.includes('temporary') ||
        super.isRecoverableError(error)
      );
    }
    return false;
  }

  /**
   * Determine recovery strategy based on error type
   */
  private getRecoveryStrategy(error: unknown): 'retry' | 'reduce_complexity' | 'fail' {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Immediate retry for transient errors
      if (
        message.includes('timeout') ||
        message.includes('rate limit') ||
        message.includes('network') ||
        message.includes('connection')
      ) {
        return 'retry';
      }

      // Reduce complexity for content quality issues
      if (
        message.includes('content_quality') ||
        message.includes('word count') ||
        message.includes('validation')
      ) {
        return 'reduce_complexity';
      }

      // Retry for API errors
      if (message.includes('api') || message.includes('server')) {
        return 'retry';
      }
    }

    return 'fail';
  }

  /**
   * Create reduced complexity configuration for recovery
   */
  private createRecoveryConfig(): ChapterNodeConfig {
    return {
      ...this.config,
      wordTarget: Math.max(800, Math.floor(this.config.wordTarget * 0.7)), // Reduce by 30%
      researchRequirements: this.config.researchRequirements?.slice(0, 1) || [], // Limit research
      dependencies: [], // Remove dependencies to simplify
    };
  }
}

/**
 * Factory function to create chapter nodes for parallel execution
 */
export function createChapterNode(config: ChapterNodeConfig): ChapterNode {
  return new ChapterNode(config);
}

/**
 * Create multiple chapter nodes for parallel execution
 */
export function createParallelChapterNodes(
  chapterConfigs: ChapterNodeConfig[]
): ChapterNode[] {
  return chapterConfigs.map((config) => createChapterNode(config));
}

/**
 * Utility to determine chapter execution order based on dependencies
 */
export function resolveChapterDependencies(
  chapterConfigs: ChapterNodeConfig[]
): ChapterNodeConfig[][] {
  const layers: ChapterNodeConfig[][] = [];
  const remaining = [...chapterConfigs];
  const completed = new Set<number>();

  while (remaining.length > 0) {
    const currentLayer = remaining.filter((config) => {
      const dependencies = config.dependencies || [];
      return dependencies.every((dep) => completed.has(dep));
    });

    if (currentLayer.length === 0) {
      throw new WorkflowError(
        'unknown',
        'chapter_generation',
        'Circular dependency detected in chapter configuration',
        {
          code: 'circular_dependency',
          recoverable: false
        }
      );
    }

    layers.push(currentLayer);

    // Remove current layer from remaining and mark as completed
    currentLayer.forEach((config) => {
      const index = remaining.indexOf(config);
      if (index > -1) {
        remaining.splice(index, 1);
        completed.add(config.chapterNumber);
      }
    });
  }

  return layers;
}