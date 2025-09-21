import { logger } from '../errors/logging';
import { applicationMetrics } from './metrics';

/**
 * Workflow event types for analytics tracking
 */
export enum WorkflowEventType {
  WORKFLOW_STARTED = 'workflow_started',
  WORKFLOW_COMPLETED = 'workflow_completed',
  WORKFLOW_FAILED = 'workflow_failed',
  STAGE_STARTED = 'stage_started',
  STAGE_COMPLETED = 'stage_completed',
  CHAPTER_GENERATION_STARTED = 'chapter_generation_started',
  CHAPTER_GENERATION_COMPLETED = 'chapter_generation_completed',
  TOOL_EXECUTION_STARTED = 'tool_execution_started',
  TOOL_EXECUTION_COMPLETED = 'tool_execution_completed',
  USER_INTERACTION = 'user_interaction',
  ERROR_OCCURRED = 'error_occurred',
}

/**
 * Analytics event interface
 */
export interface AnalyticsEvent {
  eventType: WorkflowEventType;
  timestamp: number;
  sessionId: string;
  userId?: string;
  stage?: string;
  metadata: Record<string, unknown>;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  enableAnalytics: boolean;
  enableMetricsCollection: boolean;
  batchSize: number;
  flushInterval: number; // milliseconds
  maxEventAge: number; // milliseconds
}

/**
 * Default analytics configuration
 */
function getDefaultAnalyticsConfig(): AnalyticsConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    enableAnalytics: true,
    enableMetricsCollection: true,
    batchSize: isDevelopment ? 10 : 100,
    flushInterval: isDevelopment ? 5000 : 30000, // 5s dev, 30s prod
    maxEventAge: 24 * 60 * 60 * 1000, // 24 hours
  };
}

/**
 * Analytics collector class
 */
export class Analytics {
  private config: AnalyticsConfig;
  private eventBuffer: AnalyticsEvent[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config?: Partial<AnalyticsConfig>) {
    this.config = { ...getDefaultAnalyticsConfig(), ...config };

    if (this.config.enableAnalytics) {
      this.startFlushTimer();
    }
  }

  /**
   * Track a workflow event
   */
  track(
    eventType: WorkflowEventType,
    sessionId: string,
    metadata: Record<string, unknown> = {},
    userId?: string
  ): void {
    if (!this.config.enableAnalytics) {
      return;
    }

    const event: AnalyticsEvent = {
      eventType,
      timestamp: Date.now(),
      sessionId,
      userId,
      stage: metadata.stage as string,
      metadata: {
        ...metadata,
        environment: process.env.NODE_ENV || 'development',
      },
    };

    this.eventBuffer.push(event);

    // Update metrics if enabled
    if (this.config.enableMetricsCollection) {
      this.updateMetrics(event);
    }

    // Log the event
    logger.info(`Analytics event: ${eventType}`, {
      sessionId,
      userId,
      stage: event.stage,
      eventType,
      metadata: event.metadata,
    });

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Track workflow lifecycle events
   */
  trackWorkflowStarted(sessionId: string, userId?: string, metadata: Record<string, unknown> = {}): void {
    applicationMetrics.activeWorkflows.inc();
    this.track(WorkflowEventType.WORKFLOW_STARTED, sessionId, metadata, userId);
  }

  trackWorkflowCompleted(sessionId: string, userId?: string, metadata: Record<string, unknown> = {}): void {
    applicationMetrics.activeWorkflows.dec();
    applicationMetrics.workflowSuccess.inc();
    this.track(WorkflowEventType.WORKFLOW_COMPLETED, sessionId, metadata, userId);
  }

  trackWorkflowFailed(sessionId: string, error: string, userId?: string, metadata: Record<string, unknown> = {}): void {
    applicationMetrics.activeWorkflows.dec();
    applicationMetrics.workflowErrors.inc();
    this.track(WorkflowEventType.WORKFLOW_FAILED, sessionId, { ...metadata, error }, userId);
  }

  /**
   * Track stage progression
   */
  trackStageStarted(sessionId: string, stage: string, userId?: string, metadata: Record<string, unknown> = {}): void {
    this.track(WorkflowEventType.STAGE_STARTED, sessionId, { ...metadata, stage }, userId);
  }

  trackStageCompleted(sessionId: string, stage: string, duration: number, userId?: string, metadata: Record<string, unknown> = {}): void {
    this.track(WorkflowEventType.STAGE_COMPLETED, sessionId, {
      ...metadata,
      stage,
      duration
    }, userId);
  }

  /**
   * Track chapter generation
   */
  trackChapterGenerationStarted(sessionId: string, chapterNumber: number, userId?: string, metadata: Record<string, unknown> = {}): void {
    applicationMetrics.activeChapterGeneration.inc();
    this.track(WorkflowEventType.CHAPTER_GENERATION_STARTED, sessionId, {
      ...metadata,
      chapterNumber,
    }, userId);
  }

  trackChapterGenerationCompleted(
    sessionId: string,
    chapterNumber: number,
    duration: number,
    wordCount: number,
    userId?: string,
    metadata: Record<string, unknown> = {}
  ): void {
    applicationMetrics.activeChapterGeneration.dec();
    applicationMetrics.chapterGenerationTime.observe(duration);
    this.track(WorkflowEventType.CHAPTER_GENERATION_COMPLETED, sessionId, {
      ...metadata,
      chapterNumber,
      duration,
      wordCount,
    }, userId);
  }

  /**
   * Track tool execution
   */
  trackToolExecution(
    sessionId: string,
    toolName: string,
    success: boolean,
    duration: number,
    userId?: string,
    metadata: Record<string, unknown> = {}
  ): void {
    applicationMetrics.toolExecutionTime.observe(duration);

    if (!success) {
      applicationMetrics.toolErrors.inc();
    }

    const eventType = success ? WorkflowEventType.TOOL_EXECUTION_COMPLETED : WorkflowEventType.ERROR_OCCURRED;

    this.track(eventType, sessionId, {
      ...metadata,
      toolName,
      success,
      duration,
      type: 'tool_execution',
    }, userId);
  }

  /**
   * Track user interactions
   */
  trackUserInteraction(
    sessionId: string,
    action: string,
    userId?: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.track(WorkflowEventType.USER_INTERACTION, sessionId, {
      ...metadata,
      action,
      type: 'user_interaction',
    }, userId);
  }

  /**
   * Track errors
   */
  trackError(
    sessionId: string,
    error: Error | string,
    context: string,
    userId?: string,
    metadata: Record<string, unknown> = {}
  ): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorName = error instanceof Error ? error.name : 'UnknownError';

    this.track(WorkflowEventType.ERROR_OCCURRED, sessionId, {
      ...metadata,
      error: errorMessage,
      errorName,
      context,
      type: 'error',
    }, userId);
  }

  /**
   * Update metrics based on events
   */
  private updateMetrics(event: AnalyticsEvent): void {
    switch (event.eventType) {
      case WorkflowEventType.WORKFLOW_COMPLETED:
        if (event.metadata.duration) {
          applicationMetrics.workflowDuration.observe(event.metadata.duration as number);
        }
        break;

      case WorkflowEventType.ERROR_OCCURRED:
        if (event.metadata.type === 'api') {
          applicationMetrics.apiErrors.inc();
        }
        break;

      default:
        // No specific metric updates for other events
        break;
    }
  }

  /**
   * Flush events to storage/external service
   */
  flush(): void {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    // Clean up old events
    const now = Date.now();
    const validEvents = events.filter(
      event => now - event.timestamp < this.config.maxEventAge
    );

    // In production, this would send to an analytics service
    // For MVP, we'll just log the summary
    this.logEventsSummary(validEvents);
  }

  /**
   * Log events summary for development
   */
  private logEventsSummary(events: AnalyticsEvent[]): void {
    if (events.length === 0) return;

    const summary = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    logger.info('Analytics events flushed', {
      eventCount: events.length,
      summary,
      timeRange: {
        start: new Date(Math.min(...events.map(e => e.timestamp))).toISOString(),
        end: new Date(Math.max(...events.map(e => e.timestamp))).toISOString(),
      },
    });
  }

  /**
   * Start the flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stop the flush timer
   */
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Get current analytics stats
   */
  getStats(): {
    bufferSize: number;
    config: AnalyticsConfig;
    uptime: number;
  } {
    return {
      bufferSize: this.eventBuffer.length,
      config: this.config,
      uptime: Date.now() - (this.eventBuffer[0]?.timestamp || Date.now()),
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopFlushTimer();
    this.flush(); // Final flush
  }
}

/**
 * Global analytics instance
 */
export const analytics = new Analytics();

/**
 * Convenience functions for common tracking scenarios
 */
export function trackWorkflowEvent(
  event: WorkflowEventType,
  sessionId: string,
  metadata: Record<string, unknown> = {},
  userId?: string
): void {
  analytics.track(event, sessionId, metadata, userId);
}

/**
 * Decorator for tracking method execution time
 */
export function tracked(eventType: WorkflowEventType, getSessionId?: (args: any[]) => string) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return descriptor;

    const decoratedMethod = async function (this: unknown, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
      const startTime = Date.now();
      const sessionId = getSessionId ? getSessionId(args) : 'unknown';

      try {
        const result = await originalMethod.call(this, ...args);
        const duration = (Date.now() - startTime) / 1000;

        analytics.track(eventType, sessionId, {
          method: `${target.constructor.name}.${propertyKey}`,
          duration,
          success: true,
        });

        return result;
      } catch (error) {
        const duration = (Date.now() - startTime) / 1000;

        analytics.track(WorkflowEventType.ERROR_OCCURRED, sessionId, {
          method: `${target.constructor.name}.${propertyKey}`,
          duration,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });

        throw error;
      }
    };

    descriptor.value = decoratedMethod as T;

    return descriptor;
  };
}