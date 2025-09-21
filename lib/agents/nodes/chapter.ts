// Chapter Node Factory for Parallel Chapter Generation
// Creates individual chapter generation nodes for LangGraph parallel execution
// Following CLAUDE.md standards and ARCHITECTURE.md parallel design

import { ChapterConfig, ChapterResult, WorkflowState } from '@/types';
import { BaseWorkflowNode } from './base';
import { toolRegistry } from '@/lib/tools';
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
        'missing_dependencies',
        'Chapter generation requires outline, style guide, and requirements',
        {
          nodeName: this.name,
          sessionId: state.sessionId,
          recoverable: false,
        }
      );
    }

    // Update progress - starting chapter generation
    let updatedState = this.updateProgress(state, 10, 'Starting chapter generation');

    try {
      // Phase 1: Research (if web research tool is available)
      updatedState = this.updateProgress(
        updatedState,
        20,
        'Conducting research for chapter content'
      );

      let researchData: string | undefined;
      const webResearchTool = toolRegistry.getTool('web_research');
      if (webResearchTool) {
        try {
          researchData = await withRetry(
            () =>
              webResearchTool.execute({
                query: `${this.config.title} ${state.requirements!.topic}`,
                maxPages: 5,
              }),
            retryChapterGeneration
          );

          logger.info(`Research completed for chapter ${this.config.chapterNumber}`, {
            sessionId: state.sessionId,
            chapterNumber: this.config.chapterNumber,
            researchLength: researchData.length,
          });
        } catch (error) {
          logger.warn(`Research failed for chapter ${this.config.chapterNumber}, continuing without`, {
            sessionId: state.sessionId,
            chapterNumber: this.config.chapterNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Phase 2: Get dependent chapter content
      updatedState = this.updateProgress(
        updatedState,
        40,
        'Processing chapter dependencies'
      );

      const dependentContent = this.getDependentChapterContent(state);

      // Phase 3: Generate chapter content
      updatedState = this.updateProgress(
        updatedState,
        60,
        'Generating chapter content'
      );

      const chapterWriteTool = toolRegistry.getTool('chapter_write');
      if (!chapterWriteTool) {
        throw new WorkflowError(
          'missing_tool',
          'Chapter write tool not available',
          {
            nodeName: this.name,
            sessionId: state.sessionId,
            recoverable: false,
          }
        );
      }

      const chapterContent = await withRetry(
        () =>
          chapterWriteTool.execute({
            chapterConfig: this.config,
            styleGuide: state.styleGuide!,
            baseContent: state.baseContent,
            researchData,
            dependentContent,
            requirements: state.requirements!,
          }),
        retryChapterGeneration
      );

      // Phase 4: Validate and create chapter result
      updatedState = this.updateProgress(
        updatedState,
        80,
        'Validating chapter content'
      );

      const chapterResult = this.createChapterResult(chapterContent);

      // Phase 5: Persist chapter data
      updatedState = this.updateProgress(
        updatedState,
        90,
        'Saving chapter data'
      );

      await this.persistChapterResult(state.sessionId, chapterResult);

      // Complete chapter generation
      updatedState = this.updateProgress(
        updatedState,
        100,
        'Chapter generation completed'
      );

      // Add chapter to results
      const updatedChapters = [...updatedState.chapters, chapterResult];

      logger.info(`Chapter ${this.config.chapterNumber} generation completed`, {
        sessionId: state.sessionId,
        chapterNumber: this.config.chapterNumber,
        wordCount: chapterResult.wordCount,
        title: chapterResult.title,
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
        status: 'needs_revision',
        error: error instanceof Error ? error.message : 'Unknown error',
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
        'max_retries_exceeded',
        `Maximum retries exceeded for chapter ${this.config.chapterNumber}`,
        {
          nodeName: this.name,
          sessionId: state.sessionId,
          recoverable: false,
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
          return `Chapter ${chapterNum} - ${chapter.title}:\n${chapter.content}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');

    return dependentContent;
  }

  /**
   * Create chapter result from generated content
   */
  private createChapterResult(content: string): ChapterResult {
    const wordCount = content.split(/\s+/).length;

    return {
      chapterNumber: this.config.chapterNumber,
      title: this.config.title,
      content,
      wordCount,
      status: 'completed',
      dependencies: this.config.dependencies,
    };
  }

  /**
   * Persist chapter result to database
   */
  private async persistChapterResult(
    sessionId: string,
    chapterResult: ChapterResult
  ): Promise<void> {
    const supabaseStateTool = toolRegistry.getTool('supabase_state');
    if (supabaseStateTool) {
      try {
        await supabaseStateTool.execute({
          operation: 'save_chapter',
          sessionId,
          data: chapterResult,
        });
      } catch (error) {
        logger.warn(
          `Failed to persist chapter ${chapterResult.chapterNumber}`,
          {
            sessionId,
            chapterNumber: chapterResult.chapterNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        );
      }
    }
  }

  /**
   * Error recovery logic specific to chapter generation
   */
  protected isRecoverableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('api') ||
        message.includes('timeout') ||
        message.includes('rate limit') ||
        message.includes('content_quality') ||
        super.isRecoverableError(error)
      );
    }
    return false;
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
        'circular_dependency',
        'Circular dependency detected in chapter configuration',
        { recoverable: false }
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