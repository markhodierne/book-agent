import type { WorkflowStage } from '../../types';
import { BaseError, ToolError, DatabaseError, WorkflowError } from './index';
import { logger } from './logging';

/**
 * Error context enrichment for better debugging and monitoring
 */
export interface ErrorContext {
  sessionId?: string;
  userId?: string;
  stage?: WorkflowStage;
  operation?: string;
  toolName?: string;
  requestId?: string;
  userAgent?: string;
  timestamp: string;
  environment: string;
  version?: string;
  buildId?: string;
}

/**
 * Global context store for request-scoped information
 */
class ErrorContextStore {
  private contexts = new Map<string, Partial<ErrorContext>>();
  private defaultContext: Partial<ErrorContext> = {};

  /**
   * Set default context that applies to all errors
   */
  setDefaultContext(context: Partial<ErrorContext>): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  /**
   * Set context for a specific scope (usually request ID)
   */
  setContext(scopeId: string, context: Partial<ErrorContext>): void {
    this.contexts.set(scopeId, {
      ...this.contexts.get(scopeId),
      ...context,
    });
  }

  /**
   * Get context for a specific scope
   */
  getContext(scopeId?: string): ErrorContext {
    const base: ErrorContext = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version,
      buildId: process.env.VERCEL_GIT_COMMIT_SHA || process.env.BUILD_ID,
      ...this.defaultContext,
    };

    if (scopeId && this.contexts.has(scopeId)) {
      return { ...base, ...this.contexts.get(scopeId) };
    }

    return base;
  }

  /**
   * Clear context for a specific scope
   */
  clearContext(scopeId: string): void {
    this.contexts.delete(scopeId);
  }

  /**
   * Clear all contexts (useful for testing)
   */
  clearAllContexts(): void {
    this.contexts.clear();
    this.defaultContext = {};
  }
}

export const errorContextStore = new ErrorContextStore();

/**
 * Enrich error with current context information
 */
export function enrichError<T extends Error>(error: T, scopeId?: string, additionalContext?: Record<string, unknown>): T {
  const context = errorContextStore.getContext(scopeId);
  const enrichedContext = {
    ...context,
    ...additionalContext,
  };

  if (error instanceof BaseError) {
    // Enhance existing BaseError with context
    const existingContext = error.context || {};

    // Create new error with enriched context
    const enrichedError = new (error.constructor as any)(error.message, {
      code: error.code,
      context: { ...existingContext, ...enrichedContext },
      cause: (error as any).cause,
    });

    // Preserve original stack trace
    enrichedError.stack = error.stack;
    return enrichedError as T;
  }

  // For non-BaseError, create wrapper BaseError
  const wrappedError = new BaseError(error.message, {
    code: 'ENRICHED_ERROR',
    context: {
      ...enrichedContext,
      originalError: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    },
    cause: error,
  });

  // Preserve original stack trace
  wrappedError.stack = error.stack;
  return wrappedError as unknown as T;
}

/**
 * Context-aware error handler middleware
 */
export function withErrorContext<T extends (...args: any[]) => any>(
  fn: T,
  contextProvider?: (...args: Parameters<T>) => Partial<ErrorContext>
): T {
  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const requestId = generateRequestId();

    try {
      // Set context if provider is given
      if (contextProvider) {
        const context = contextProvider(...args);
        errorContextStore.setContext(requestId, { ...context, requestId });
      }

      const result = await fn(...args);
      errorContextStore.clearContext(requestId);
      return result;
    } catch (error) {
      const enrichedError = enrichError(
        error instanceof Error ? error : new Error(String(error)),
        requestId
      );

      // Log enriched error
      logger.error('Context-aware error occurred', enrichedError);

      errorContextStore.clearContext(requestId);
      throw enrichedError;
    }
  }) as T;
}

/**
 * Workflow-specific error context manager
 */
export class WorkflowErrorContext {
  constructor(
    private sessionId: string,
    private userId?: string
  ) {
    errorContextStore.setContext(sessionId, {
      sessionId,
      userId,
      requestId: sessionId, // Use sessionId as requestId for workflows
    });
  }

  /**
   * Update workflow stage context
   */
  updateStage(stage: WorkflowStage): void {
    errorContextStore.setContext(this.sessionId, {
      stage,
      operation: `workflow_${stage}`,
    });
  }

  /**
   * Set tool execution context
   */
  setToolContext(toolName: string, _parameters?: unknown): void {
    errorContextStore.setContext(this.sessionId, {
      toolName,
      operation: `tool_${toolName}`,
    });
  }

  /**
   * Set database operation context
   */
  setDatabaseContext(operation: string, _table?: string): void {
    errorContextStore.setContext(this.sessionId, {
      operation: `db_${operation}`,
      toolName: undefined, // Clear tool context
    });
  }

  /**
   * Create context-aware error for this workflow
   */
  createError(
    ErrorClass: typeof ToolError | typeof DatabaseError | typeof WorkflowError,
    message: string,
    options?: any
  ): BaseError {
    const context = errorContextStore.getContext(this.sessionId);

    if (ErrorClass === ToolError && context.toolName) {
      return new ToolError(context.toolName, message, options);
    }

    if (ErrorClass === DatabaseError && context.operation) {
      return new DatabaseError(context.operation, message, options);
    }

    if (ErrorClass === WorkflowError && context.stage) {
      return new WorkflowError(this.sessionId, context.stage, message, options);
    }

    // Fallback to BaseError
    return new BaseError(message, {
      code: 'WORKFLOW_ERROR',
      context,
      ...options,
    });
  }

  /**
   * Clean up context when workflow completes
   */
  cleanup(): void {
    errorContextStore.clearContext(this.sessionId);
  }
}

/**
 * Tool execution error handler with automatic context
 */
export async function executeWithToolContext<T>(
  toolName: string,
  parameters: unknown,
  operation: () => Promise<T>,
  sessionId?: string
): Promise<T> {
  const scopeId = sessionId || generateRequestId();
  const startTime = Date.now();

  try {
    // Set tool context
    errorContextStore.setContext(scopeId, {
      toolName,
      operation: `tool_${toolName}`,
    });

    logger.debug(`Executing tool: ${toolName}`, { toolName, parameters });

    const result = await operation();
    const duration = Date.now() - startTime;

    logger.info(`Tool execution completed: ${toolName}`, {
      toolName,
      duration,
      success: true,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const enrichedError = error instanceof ToolError
      ? error
      : new ToolError(toolName, error instanceof Error ? error.message : String(error), {
          parameters,
          cause: error instanceof Error ? error : undefined,
        });

    // Enrich with context
    const finalError = enrichError(enrichedError, scopeId, { duration });

    logger.error(`Tool execution failed: ${toolName}`, finalError, {
      toolName,
      parameters,
      duration,
      success: false,
    });

    throw finalError;
  } finally {
    if (!sessionId) {
      errorContextStore.clearContext(scopeId);
    }
  }
}

/**
 * Database operation error handler with automatic context
 */
export async function executeWithDatabaseContext<T>(
  operation: string,
  table: string,
  dbOperation: () => Promise<T>,
  sessionId?: string
): Promise<T> {
  const scopeId = sessionId || generateRequestId();
  const startTime = Date.now();

  try {
    // Set database context
    errorContextStore.setContext(scopeId, {
      operation: `db_${operation}`,
    });

    logger.debug(`Executing database operation: ${operation}`, { operation, table });

    const result = await dbOperation();
    const duration = Date.now() - startTime;

    logger.debug(`Database operation completed: ${operation}`, {
      operation,
      table,
      duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const enrichedError = error instanceof DatabaseError
      ? error
      : new DatabaseError(operation, error instanceof Error ? error.message : String(error), {
          table,
          cause: error instanceof Error ? error : undefined,
        });

    // Enrich with context
    const finalError = enrichError(enrichedError, scopeId, { duration });

    logger.error(`Database operation failed: ${operation}`, finalError, {
      operation,
      table,
      duration,
    });

    throw finalError;
  } finally {
    if (!sessionId) {
      errorContextStore.clearContext(scopeId);
    }
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Express middleware for request context (if using Express)
 */
export function requestContextMiddleware() {
  return (req: any, res: any, next: any) => {
    const requestId = generateRequestId();

    errorContextStore.setContext(requestId, {
      requestId,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id,
    });

    // Add cleanup on response finish
    res.on('finish', () => {
      errorContextStore.clearContext(requestId);
    });

    // Make request ID available to route handlers
    req.requestId = requestId;
    next();
  };
}

/**
 * Get current error context for debugging
 */
export function getCurrentContext(scopeId?: string): ErrorContext {
  return errorContextStore.getContext(scopeId);
}

/**
 * Set global default context (useful for serverless functions)
 */
export function setGlobalContext(context: Partial<ErrorContext>): void {
  errorContextStore.setDefaultContext(context);
}