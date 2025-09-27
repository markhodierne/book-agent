import type { RetryConfig } from '../../types';
import { BaseError, ToolError } from './index';

/**
 * Default retry configurations for different operation types
 */
export const DEFAULT_RETRY_CONFIG: Record<string, RetryConfig> = {
  api: {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
    maxDelay: 30000,
    timeout: 600000, // 10 minutes for GPT-5 high reasoning operations
  },
  database: {
    maxRetries: 2,
    backoffMultiplier: 1.5,
    initialDelay: 500,
    maxDelay: 5000,
    timeout: 30000,
  },
  fileProcessing: {
    maxRetries: 2,
    backoffMultiplier: 2,
    initialDelay: 2000,
    maxDelay: 10000,
    timeout: 120000,
  },
  chapterGeneration: {
    maxRetries: 1,
    backoffMultiplier: 1,
    initialDelay: 5000,
    maxDelay: 5000,
    timeout: 300000, // 5 minutes per chapter
  },
  webResearch: {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
    maxDelay: 15000,
    timeout: 45000,
  },
} as const;

/**
 * Retry result interface
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

/**
 * Retry operation statistics
 */
export interface RetryStats {
  attempts: number;
  totalDelay: number;
  lastError?: Error;
  startTime: number;
  endTime?: number;
}

/**
 * Retry operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  context?: {
    operationName?: string;
    onRetry?: (attempt: number, error: Error, delay: number) => void;
    shouldRetry?: (error: Error, attempt: number) => boolean;
  }
): Promise<T> {
  const stats: RetryStats = {
    attempts: 0,
    totalDelay: 0,
    startTime: Date.now(),
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    stats.attempts = attempt + 1;

    try {
      // Set timeout if specified
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        if (config.timeout) {
          timeoutId = setTimeout(() => {
            reject(new Error(`Operation timed out after ${config.timeout}ms`));
          }, config.timeout);
        }
      });

      const operationPromise = operation();

      // Race between operation and timeout
      const result = config.timeout
        ? await Promise.race([operationPromise, timeoutPromise])
        : await operationPromise;

      // Clear timeout if operation completed
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      stats.endTime = Date.now();
      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      stats.lastError = lastError;

      // Check if we should retry
      const shouldRetry = context?.shouldRetry
        ? context.shouldRetry(lastError, attempt)
        : isRetryableError(lastError);

      // If this is the last attempt or error is not retryable, throw
      if (attempt >= config.maxRetries || !shouldRetry) {
        stats.endTime = Date.now();
        throw enhanceErrorWithRetryInfo(lastError, stats, context?.operationName);
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, config);
      stats.totalDelay += delay;

      // Call retry callback if provided
      if (context?.onRetry) {
        context.onRetry(attempt + 1, lastError, delay);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript requires it
  stats.endTime = Date.now();
  throw enhanceErrorWithRetryInfo(
    lastError || new Error('Unknown retry error'),
    stats,
    context?.operationName
  );
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  // Calculate exponential backoff
  const exponentialDelay = Math.min(
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );

  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
  const delay = Math.max(0, exponentialDelay + jitter);

  return Math.floor(delay);
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: Error): boolean {
  // Network errors are usually retryable
  if (error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('EAI_AGAIN') ||
      error.message.includes('EPIPE')) {
    return true;
  }

  // Rate limiting errors are retryable
  if (error.message.includes('rate limit') ||
      error.message.includes('429') ||
      error.message.includes('too many requests')) {
    return true;
  }

  // Server errors (5xx) are usually retryable
  if (error.message.includes('500') ||
      error.message.includes('502') ||
      error.message.includes('503') ||
      error.message.includes('504')) {
    return true;
  }

  // Timeout errors are retryable
  if (error.message.includes('timeout') ||
      error.message.includes('TIMEOUT')) {
    return true;
  }

  // Tool errors with specific retry codes
  if (error instanceof ToolError) {
    const retryableCodes = [
      'TOOL_TIMEOUT',
      'TOOL_RATE_LIMIT',
      'TOOL_NETWORK_ERROR',
      'TOOL_SERVER_ERROR',
    ];
    return retryableCodes.includes(error.code || '');
  }

  // Database connection errors are retryable
  if (error.message.includes('connection') &&
      (error.message.includes('lost') ||
       error.message.includes('closed') ||
       error.message.includes('refused'))) {
    return true;
  }

  // By default, don't retry
  return false;
}

/**
 * Enhance error with retry information
 */
function enhanceErrorWithRetryInfo(
  error: Error,
  stats: RetryStats,
  operationName?: string
): Error {
  const duration = (stats.endTime || Date.now()) - stats.startTime;

  if (error instanceof BaseError) {
    // Add retry context to existing BaseError
    const context = {
      ...error.context,
      retryStats: {
        attempts: stats.attempts,
        totalDelay: stats.totalDelay,
        duration,
        operationName,
      },
    };

    return new (error.constructor as any)(error.message, {
      code: error.code,
      context,
      cause: (error as any).cause,
    });
  }

  // Wrap non-BaseError in BaseError with retry context
  return new BaseError(error.message, {
    code: 'RETRY_FAILED',
    context: {
      retryStats: {
        attempts: stats.attempts,
        totalDelay: stats.totalDelay,
        duration,
        operationName,
      },
      originalError: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    },
    cause: error,
  });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with specific configuration presets
 */
export const retryAPI = <T>(operation: () => Promise<T>, context?: Parameters<typeof withRetry>[2]) =>
  withRetry(operation, DEFAULT_RETRY_CONFIG.api!, context);

export const retryDatabase = <T>(operation: () => Promise<T>, context?: Parameters<typeof withRetry>[2]) =>
  withRetry(operation, DEFAULT_RETRY_CONFIG.database!, context);

export const retryFileProcessing = <T>(operation: () => Promise<T>, context?: Parameters<typeof withRetry>[2]) =>
  withRetry(operation, DEFAULT_RETRY_CONFIG.fileProcessing!, context);

export const retryChapterGeneration = <T>(operation: () => Promise<T>, context?: Parameters<typeof withRetry>[2]) =>
  withRetry(operation, DEFAULT_RETRY_CONFIG.chapterGeneration!, context);

export const retryWebResearch = <T>(operation: () => Promise<T>, context?: Parameters<typeof withRetry>[2]) =>
  withRetry(operation, DEFAULT_RETRY_CONFIG.webResearch!, context);

/**
 * Create a retryable version of any function
 */
export function createRetryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config: RetryConfig,
  context?: {
    operationName?: string;
    shouldRetry?: (error: Error, attempt: number) => boolean;
  }
): T {
  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    return withRetry(
      () => fn(...args),
      config,
      context
    );
  }) as T;
}

/**
 * Batch retry operations with controlled concurrency
 */
export async function retryBatch<T>(
  operations: (() => Promise<T>)[],
  config: RetryConfig,
  options?: {
    concurrency?: number;
    stopOnFirstError?: boolean;
    operationName?: string;
  }
): Promise<RetryResult<T>[]> {
  const { concurrency = 3, stopOnFirstError = false } = options || {};
  const results: RetryResult<T>[] = [];

  // Process operations in batches
  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, i + concurrency);

    const batchPromises = batch.map(async (operation, index) => {
      const startTime = Date.now();
      try {
        const data = await withRetry(operation, config, {
          operationName: `${options?.operationName || 'batch'}-${i + index}`,
        });

        return {
          success: true,
          data,
          attempts: 1, // withRetry will handle actual attempts
          totalDelay: Date.now() - startTime,
        } as RetryResult<T>;
      } catch (error) {
        const result = {
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          attempts: config.maxRetries + 1,
          totalDelay: Date.now() - startTime,
        } as RetryResult<T>;

        if (stopOnFirstError) {
          throw error;
        }

        return result;
      }
    });

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      if (stopOnFirstError) {
        throw error;
      }
    }
  }

  return results;
}