import { logger } from '../errors/logging';
import { applicationMetrics, timeOperation } from './metrics';
import { analytics } from './analytics';
import { monitoringConfig } from './config';

/**
 * Utility functions for common monitoring scenarios
 */

/**
 * Monitor workflow execution with comprehensive tracking
 */
export async function monitorWorkflow<T>(
  sessionId: string,
  workflowName: string,
  operation: () => Promise<T>,
  userId?: string
): Promise<T> {
  const startTime = Date.now();

  // Track workflow start
  analytics.trackWorkflowStarted(sessionId, userId, { workflowName });
  logger.info(`Workflow started: ${workflowName}`, { sessionId, userId });

  try {
    // Execute operation with timing
    const result = await timeOperation(applicationMetrics.workflowDuration, operation);

    // Track successful completion
    const duration = (Date.now() - startTime) / 1000;
    analytics.trackWorkflowCompleted(sessionId, userId, {
      workflowName,
      duration,
      success: true,
    });

    logger.info(`Workflow completed: ${workflowName}`, {
      sessionId,
      userId,
      duration,
    });

    return result;
  } catch (error) {
    // Track failure
    const duration = (Date.now() - startTime) / 1000;
    const errorMessage = error instanceof Error ? error.message : String(error);

    analytics.trackWorkflowFailed(sessionId, errorMessage, userId, {
      workflowName,
      duration,
      success: false,
    });

    logger.error(`Workflow failed: ${workflowName}`, error instanceof Error ? error : new Error(String(error)), {
      sessionId,
      userId,
      duration,
    });

    throw error;
  }
}

/**
 * Monitor stage execution within a workflow
 */
export async function monitorStage<T>(
  sessionId: string,
  stageName: string,
  operation: () => Promise<T>,
  userId?: string
): Promise<T> {
  const startTime = Date.now();

  // Track stage start
  analytics.trackStageStarted(sessionId, stageName, userId);
  logger.debug(`Stage started: ${stageName}`, { sessionId, stageName });

  try {
    const result = await operation();

    // Track stage completion
    const duration = (Date.now() - startTime) / 1000;
    analytics.trackStageCompleted(sessionId, stageName, duration, userId);

    logger.debug(`Stage completed: ${stageName}`, {
      sessionId,
      stageName,
      duration,
    });

    return result;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    const errorMessage = error instanceof Error ? error.message : String(error);

    analytics.trackError(sessionId, error instanceof Error ? error : errorMessage, `stage:${stageName}`, userId);

    logger.error(`Stage failed: ${stageName}`, error instanceof Error ? error : new Error(String(error)), {
      sessionId,
      stageName,
      duration,
    });

    throw error;
  }
}

/**
 * Monitor tool execution with metrics tracking
 */
export async function monitorTool<T>(
  sessionId: string,
  toolName: string,
  operation: () => Promise<T>,
  userId?: string
): Promise<T> {
  const startTime = Date.now();

  logger.debug(`Tool execution started: ${toolName}`, { sessionId, toolName });

  try {
    const result = await timeOperation(applicationMetrics.toolExecutionTime, operation);

    const duration = (Date.now() - startTime) / 1000;
    analytics.trackToolExecution(sessionId, toolName, true, duration, userId);

    logger.debug(`Tool execution completed: ${toolName}`, {
      sessionId,
      toolName,
      duration,
      success: true,
    });

    return result;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    analytics.trackToolExecution(sessionId, toolName, false, duration, userId);

    logger.error(`Tool execution failed: ${toolName}`, error instanceof Error ? error : new Error(String(error)), {
      sessionId,
      toolName,
      duration,
      success: false,
    });

    throw error;
  }
}

/**
 * Monitor chapter generation with specific metrics
 */
export async function monitorChapterGeneration<T>(
  sessionId: string,
  chapterNumber: number,
  operation: () => Promise<T & { wordCount?: number }>,
  userId?: string
): Promise<T> {
  const startTime = Date.now();

  // Track chapter generation start
  analytics.trackChapterGenerationStarted(sessionId, chapterNumber, userId);
  logger.info(`Chapter generation started: ${chapterNumber}`, {
    sessionId,
    chapterNumber,
  });

  try {
    const result = await timeOperation(applicationMetrics.chapterGenerationTime, operation);

    // Track chapter generation completion
    const duration = (Date.now() - startTime) / 1000;
    const wordCount = (result as any).wordCount || 0;

    analytics.trackChapterGenerationCompleted(
      sessionId,
      chapterNumber,
      duration,
      wordCount,
      userId
    );

    logger.info(`Chapter generation completed: ${chapterNumber}`, {
      sessionId,
      chapterNumber,
      duration,
      wordCount,
    });

    return result;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    analytics.trackError(
      sessionId,
      error instanceof Error ? error : String(error),
      `chapter:${chapterNumber}`,
      userId
    );

    logger.error(`Chapter generation failed: ${chapterNumber}`, error instanceof Error ? error : new Error(String(error)), {
      sessionId,
      chapterNumber,
      duration,
    });

    throw error;
  }
}

/**
 * Track user interactions for analytics
 */
export function trackUserAction(
  sessionId: string,
  action: string,
  metadata: Record<string, unknown> = {},
  userId?: string
): void {
  analytics.trackUserInteraction(sessionId, action, userId, metadata);
  logger.info(`User action: ${action}`, {
    sessionId,
    userId,
    action,
    ...metadata,
  });
}

/**
 * Get current system health metrics
 */
export function getSystemHealth(): {
  status: 'healthy' | 'warning' | 'critical';
  metrics: Record<string, any>;
  uptime: number;
  timestamp: string;
} {
  const metrics = applicationMetrics;
  const config = monitoringConfig;

  // Calculate health based on thresholds
  const activeWorkflows = metrics.activeWorkflows.get();
  const errorCount = metrics.workflowErrors.get();
  const successCount = metrics.workflowSuccess.get();
  const totalWorkflows = errorCount + successCount;
  const errorRate = totalWorkflows > 0 ? (errorCount / totalWorkflows) * 100 : 0;

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';

  if (errorRate > config.performance.warningThresholds.errorRate) {
    status = 'critical';
  } else if (errorRate > config.performance.warningThresholds.errorRate / 2) {
    status = 'warning';
  }

  return {
    status,
    metrics: {
      activeWorkflows,
      totalWorkflows,
      errorRate: Math.round(errorRate * 100) / 100,
      errorCount,
      successCount,
      averageWorkflowDuration: metrics.workflowDuration.getStats().average,
      averageChapterGenerationTime: metrics.chapterGenerationTime.getStats().average,
      toolErrors: metrics.toolErrors.get(),
    },
    uptime: process.uptime() * 1000,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log system health periodically
 */
export function startHealthMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
  return setInterval(() => {
    const health = getSystemHealth();

    if (health.status === 'critical') {
      logger.critical('System health critical', undefined, { health });
    } else if (health.status === 'warning') {
      logger.warn('System health warning', { health });
    } else if (monitoringConfig.development.enableDebugMode) {
      logger.debug('System health check', { health });
    }
  }, intervalMs);
}

/**
 * Memory monitoring utility
 */
export function monitorMemoryUsage(): void {
  if (!monitoringConfig.performance.enableMemoryTracking) {
    return;
  }

  const memUsage = process.memoryUsage();
  const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);

  if (memUsageMB > monitoringConfig.performance.warningThresholds.memoryUsageMB) {
    logger.warn('High memory usage detected', {
      memoryUsageMB: memUsageMB,
      threshold: monitoringConfig.performance.warningThresholds.memoryUsageMB,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
    });
  }

  if (monitoringConfig.development.enableDebugMode) {
    logger.debug('Memory usage', {
      memoryUsageMB: memUsageMB,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
    });
  }
}