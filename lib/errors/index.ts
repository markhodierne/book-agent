import type {
  BaseError as IBaseError,
  ToolError as IToolError,
  DatabaseError as IDatabaseError,
  WorkflowError as IWorkflowError,
  WorkflowStage,
} from '../../types';

/**
 * Base error class for all application errors
 * Provides consistent error structure and context tracking
 */
export class BaseError extends Error implements IBaseError {
  public override readonly name: string;
  public readonly code?: string;
  public readonly timestamp: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      code?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message);

    this.name = this.constructor.name;
    this.code = options?.code;
    this.timestamp = new Date().toISOString();
    this.context = options?.context;

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Support error chaining
    if (options?.cause) {
      (this as any).cause = options.cause;
    }
  }

  /**
   * Convert error to plain object for serialization
   */
  toJSON(): IBaseError {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context,
    };
  }

  /**
   * Get error details with context
   */
  getDetails(): string {
    const details = [this.message];

    if (this.code) {
      details.push(`Code: ${this.code}`);
    }

    if (this.context && Object.keys(this.context).length > 0) {
      details.push(`Context: ${JSON.stringify(this.context, null, 2)}`);
    }

    return details.join('\n');
  }

  /**
   * Override toString to prevent [object Object] display
   */
  toString(): string {
    return `${this.name}: ${this.message}`;
  }
}

/**
 * Tool-specific error for AI tool execution failures
 */
export class ToolError extends BaseError implements IToolError {
  public readonly toolName: string;
  public readonly parameters?: unknown;
  public readonly retryAttempt: number;

  constructor(
    toolName: string,
    message: string,
    options?: {
      code?: string;
      parameters?: unknown;
      retryAttempt?: number;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, {
      code: options?.code || 'TOOL_ERROR',
      context: {
        ...options?.context,
        toolName,
        parameters: options?.parameters,
        retryAttempt: options?.retryAttempt || 0,
      },
      cause: options?.cause,
    });

    this.toolName = toolName;
    this.parameters = options?.parameters;
    this.retryAttempt = options?.retryAttempt || 0;
  }

  /**
   * Create a ToolError for retry scenarios
   */
  static forRetry(
    toolName: string,
    message: string,
    retryAttempt: number,
    parameters?: unknown,
    cause?: Error
  ): ToolError {
    return new ToolError(toolName, message, {
      code: 'TOOL_RETRY_FAILED',
      parameters,
      retryAttempt,
      cause,
    });
  }

  /**
   * Create a ToolError for timeout scenarios
   */
  static forTimeout(
    toolName: string,
    timeoutMs: number,
    parameters?: unknown
  ): ToolError {
    return new ToolError(toolName, `Tool execution timed out after ${timeoutMs}ms`, {
      code: 'TOOL_TIMEOUT',
      parameters,
      context: { timeoutMs },
    });
  }

  /**
   * Create a ToolError for validation failures
   */
  static forValidation(
    toolName: string,
    message: string,
    parameters?: unknown
  ): ToolError {
    return new ToolError(toolName, message, {
      code: 'TOOL_VALIDATION_ERROR',
      parameters,
    });
  }

  /**
   * Create a ToolError for circuit breaker failures
   */
  static forCircuitBreaker(
    toolName: string,
    message: string,
    parameters?: unknown
  ): ToolError {
    return new ToolError(toolName, message, {
      code: 'TOOL_CIRCUIT_BREAKER_ERROR',
      parameters,
    });
  }

  /**
   * Create a ToolError for execution failures
   */
  static forExecution(
    toolName: string,
    message: string,
    parameters?: unknown
  ): ToolError {
    return new ToolError(toolName, message, {
      code: 'TOOL_EXECUTION_ERROR',
      parameters,
    });
  }

  /**
   * Override toString to prevent [object Object] display
   */
  toString(): string {
    return `${this.name}: ${this.message}`;
  }
}

/**
 * Database operation error for Supabase operations
 */
export class DatabaseError extends BaseError implements IDatabaseError {
  public readonly operation: string;
  public readonly table?: string;
  public readonly query?: string;

  constructor(
    operation: string,
    message: string,
    options?: {
      code?: string;
      table?: string;
      query?: string;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, {
      code: options?.code || 'DATABASE_ERROR',
      context: {
        ...options?.context,
        operation,
        table: options?.table,
        query: options?.query,
      },
      cause: options?.cause,
    });

    this.operation = operation;
    this.table = options?.table;
    this.query = options?.query;
  }

  /**
   * Create a DatabaseError for connection failures
   */
  static forConnection(message: string, cause?: Error): DatabaseError {
    return new DatabaseError('connection', message, {
      code: 'DATABASE_CONNECTION_ERROR',
      cause,
    });
  }

  /**
   * Create a DatabaseError for query failures
   */
  static forQuery(
    table: string,
    operation: string,
    message: string,
    query?: string,
    cause?: Error
  ): DatabaseError {
    return new DatabaseError(operation, message, {
      code: 'DATABASE_QUERY_ERROR',
      table,
      query,
      cause,
    });
  }

  /**
   * Create a DatabaseError for constraint violations
   */
  static forConstraint(
    table: string,
    operation: string,
    constraint: string,
    cause?: Error
  ): DatabaseError {
    return new DatabaseError(operation, `Constraint violation: ${constraint}`, {
      code: 'DATABASE_CONSTRAINT_ERROR',
      table,
      context: { constraint },
      cause,
    });
  }

  /**
   * Create a DatabaseError for RLS policy violations
   */
  static forRLS(
    table: string,
    operation: string,
    message: string,
    cause?: Error
  ): DatabaseError {
    return new DatabaseError(operation, message, {
      code: 'DATABASE_RLS_ERROR',
      table,
      cause,
    });
  }

  /**
   * Override toString to prevent [object Object] display
   */
  toString(): string {
    return `${this.name}: ${this.message}`;
  }
}

/**
 * Workflow execution error for LangGraph operations
 */
export class WorkflowError extends BaseError implements IWorkflowError {
  public readonly sessionId: string;
  public readonly stage: WorkflowStage;
  public readonly recoverable: boolean;

  constructor(
    sessionId: string,
    stage: WorkflowStage,
    message: string,
    options?: {
      code?: string;
      recoverable?: boolean;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, {
      code: options?.code || 'WORKFLOW_ERROR',
      context: {
        ...options?.context,
        sessionId,
        stage,
        recoverable: options?.recoverable ?? true,
      },
      cause: options?.cause,
    });

    this.sessionId = sessionId;
    this.stage = stage;
    this.recoverable = options?.recoverable ?? true;
  }

  /**
   * Create a WorkflowError for node execution failures
   */
  static forNode(
    sessionId: string,
    stage: WorkflowStage,
    nodeName: string,
    message: string,
    recoverable = true,
    cause?: Error
  ): WorkflowError {
    return new WorkflowError(sessionId, stage, message, {
      code: 'WORKFLOW_NODE_ERROR',
      recoverable,
      context: { nodeName },
      cause,
    });
  }

  /**
   * Create a WorkflowError for state persistence failures
   */
  static forState(
    sessionId: string,
    stage: WorkflowStage,
    operation: string,
    cause?: Error
  ): WorkflowError {
    return new WorkflowError(
      sessionId,
      stage,
      `Failed to ${operation} workflow state`,
      {
        code: 'WORKFLOW_STATE_ERROR',
        recoverable: true,
        context: { operation },
        cause,
      }
    );
  }

  /**
   * Create a WorkflowError for unrecoverable failures
   */
  static forCritical(
    sessionId: string,
    stage: WorkflowStage,
    message: string,
    cause?: Error
  ): WorkflowError {
    return new WorkflowError(sessionId, stage, message, {
      code: 'WORKFLOW_CRITICAL_ERROR',
      recoverable: false,
      cause,
    });
  }

  /**
   * Create a WorkflowError for timeout scenarios
   */
  static forTimeout(
    sessionId: string,
    stage: WorkflowStage,
    timeoutMs: number,
    cause?: Error
  ): WorkflowError {
    return new WorkflowError(
      sessionId,
      stage,
      `Workflow stage timed out after ${timeoutMs}ms`,
      {
        code: 'WORKFLOW_TIMEOUT',
        recoverable: true,
        context: { timeoutMs },
        cause,
      }
    );
  }

  /**
   * Override toString to prevent [object Object] display
   */
  toString(): string {
    return `${this.name}: ${this.message}`;
  }
}

/**
 * Check if an error is of a specific type
 */
export function isBaseError(error: unknown): error is BaseError {
  return error instanceof BaseError;
}

export function isToolError(error: unknown): error is ToolError {
  return error instanceof ToolError;
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

export function isWorkflowError(error: unknown): error is WorkflowError {
  return error instanceof WorkflowError;
}

/**
 * Convert any error to a BaseError for consistent handling
 */
export function toBaseError(error: unknown, context?: Record<string, unknown>): BaseError {
  if (isBaseError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new BaseError(error.message, {
      code: 'UNKNOWN_ERROR',
      context: {
        ...context,
        originalName: error.name,
        originalStack: error.stack,
      },
      cause: error,
    });
  }

  return new BaseError(String(error), {
    code: 'UNKNOWN_ERROR',
    context: {
      ...context,
      originalValue: error,
    },
  });
}