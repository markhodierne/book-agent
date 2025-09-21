import {
  ToolError,
  withRetry,
  logger,
} from '@/lib/errors/exports';
import { applicationMetrics } from '@/lib/monitoring/metrics';
import type { RetryConfig, ToolResult } from '@/types';

/**
 * Tool-specific error handling utilities
 */

/**
 * Enhanced tool execution wrapper with comprehensive error handling
 */
export async function executeToolSafely<P, R>(
  toolName: string,
  params: P,
  execution: (params: P) => Promise<R>,
  config?: Partial<RetryConfig>
): Promise<ToolResult<R>> {
  const startTime = Date.now();
  let retryCount = 0;

  try {
    // Use tool-specific retry configuration
    const retryConfig: RetryConfig = {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
      maxDelay: 30000,
      timeout: 60000,
      ...config,
    };

    // Execute with retry logic
    const result = await withRetry(
      async (): Promise<R> => {
        retryCount++;

        try {
          logger.debug('Tool execution attempt', {
            toolName,
            attempt: retryCount,
            maxRetries: retryConfig.maxRetries,
          });

          return await execution(params);

        } catch (error) {
          // Log retry attempts
          if (retryCount < retryConfig.maxRetries) {
            logger.warn('Tool execution failed, will retry', {
              toolName,
              attempt: retryCount,
              maxRetries: retryConfig.maxRetries,
              error: error instanceof Error ? error.message : String(error),
            });
          }

          throw error;
        }
      },
      retryConfig
    );

    const executionTime = Date.now() - startTime;

    // Log successful execution
    logger.info('Tool execution completed successfully', {
      toolName,
      executionTime,
      retryCount: retryCount - 1, // Adjust for final successful attempt
    });

    // Update success metrics
    applicationMetrics.toolExecutionSuccessCount.inc();

    return {
      success: true,
      data: result,
      executionTime,
      retryCount: retryCount - 1,
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;

    // Ensure error is properly wrapped
    const toolError = error instanceof ToolError
      ? error
      : new ToolError(
          toolName,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          {
            parameters: params,
            cause: error instanceof Error ? error : new Error(String(error)),
          }
        );

    // Log error with full context
    logger.error('Tool execution failed permanently', {
      toolName,
      executionTime,
      retryCount: retryCount - 1,
      error: toolError.message,
      cause: toolError.cause?.message,
      stack: toolError.stack,
    });

    // Update error metrics
    applicationMetrics.toolExecutionErrorCount.inc();

    return {
      success: false,
      error: toolError.message,
      executionTime,
      retryCount: retryCount - 1,
    };
  }
}

/**
 * Tool validation utilities
 */
export class ToolValidator {
  /**
   * Validate tool parameters against a schema
   */
  static validateParams<P>(
    toolName: string,
    params: P,
    validator: (params: P) => boolean | string
  ): void {
    try {
      const result = validator(params);

      if (result === false) {
        throw ToolError.forValidation(toolName, 'Parameter validation failed');
      }

      if (typeof result === 'string') {
        throw ToolError.forValidation(toolName, result);
      }
    } catch (error) {
      if (error instanceof ToolError) {
        throw error;
      }

      throw ToolError.forValidation(
        toolName,
        `Parameter validation error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate tool result against expected format
   */
  static validateResult<R>(
    toolName: string,
    result: R,
    validator: (result: R) => boolean | string
  ): void {
    try {
      const validationResult = validator(result);

      if (validationResult === false) {
        throw ToolError.forValidation(toolName, 'Result validation failed');
      }

      if (typeof validationResult === 'string') {
        throw ToolError.forValidation(toolName, validationResult);
      }
    } catch (error) {
      if (error instanceof ToolError) {
        throw error;
      }

      throw ToolError.forValidation(
        toolName,
        `Result validation error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Common parameter validation patterns
   */
  static commonValidators = {
    /**
     * Require non-empty string
     */
    nonEmptyString: (value: unknown): string | boolean => {
      if (typeof value !== 'string' || value.trim() === '') {
        return 'Expected non-empty string';
      }
      return true;
    },

    /**
     * Require positive number
     */
    positiveNumber: (value: unknown): string | boolean => {
      if (typeof value !== 'number' || value <= 0 || isNaN(value)) {
        return 'Expected positive number';
      }
      return true;
    },

    /**
     * Require valid buffer
     */
    validBuffer: (value: unknown): string | boolean => {
      if (!Buffer.isBuffer(value) || value.length === 0) {
        return 'Expected non-empty buffer';
      }
      return true;
    },

    /**
     * Require object with specific keys
     */
    objectWithKeys: (requiredKeys: string[]) => (value: unknown): string | boolean => {
      if (typeof value !== 'object' || value === null) {
        return 'Expected object';
      }

      const obj = value as Record<string, unknown>;
      const missingKeys = requiredKeys.filter(key => !(key in obj));

      if (missingKeys.length > 0) {
        return `Missing required keys: ${missingKeys.join(', ')}`;
      }

      return true;
    },

    /**
     * Validate against enum values
     */
    enumValue: <T>(enumValues: T[]) => (value: unknown): string | boolean => {
      if (!enumValues.includes(value as T)) {
        return `Expected one of: ${enumValues.join(', ')}`;
      }
      return true;
    },
  };
}

/**
 * Tool timeout utilities
 */
export class ToolTimeout {
  /**
   * Wrap execution with timeout handling
   */
  static withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    toolName: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(ToolError.forTimeout(toolName, timeoutMs));
      }, timeoutMs);
    });

    return Promise.race([
      promise.finally(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }),
      timeoutPromise,
    ]);
  }

  /**
   * Create a timeout controller for manual timeout management
   */
  static createController(timeoutMs: number, toolName: string) {
    let timeoutId: NodeJS.Timeout | undefined;
    let isTimedOut = false;

    const controller = {
      start: () => {
        timeoutId = setTimeout(() => {
          isTimedOut = true;
        }, timeoutMs);
      },

      clear: () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      },

      checkTimeout: () => {
        if (isTimedOut) {
          throw ToolError.forTimeout(toolName, timeoutMs);
        }
      },

      get isTimedOut() {
        return isTimedOut;
      },
    };

    return controller;
  }
}

/**
 * Tool circuit breaker implementation for fault tolerance
 */
export class ToolCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly toolName: string,
    private readonly config: {
      failureThreshold: number;
      recoveryTimeoutMs: number;
      monitorWindowMs: number;
    }
  ) {}

  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.updateState();

    if (this.state === 'OPEN') {
      throw ToolError.forCircuitBreaker(
        this.toolName,
        `Circuit breaker is OPEN (${this.failureCount} failures)`
      );
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState() {
    this.updateState();
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = undefined;
    this.state = 'CLOSED';

    logger.info('Circuit breaker reset', { toolName: this.toolName });
  }

  private updateState(): void {
    const now = Date.now();

    if (this.state === 'OPEN' && this.lastFailureTime) {
      const timeElapsed = now - this.lastFailureTime;
      if (timeElapsed >= this.config.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker entering HALF_OPEN state', {
          toolName: this.toolName,
          timeElapsed,
        });
      }
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.reset();
      logger.info('Circuit breaker recovered to CLOSED state', {
        toolName: this.toolName,
      });
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      logger.error('Circuit breaker opened due to failures', {
        toolName: this.toolName,
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
      });
    }
  }
}