import { isBaseError } from './index';

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: {
    sessionId?: string;
    userId?: string;
    toolName?: string;
    operation?: string;
    duration?: number;
  };
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStructuredLogging: boolean;
  enableErrorTracking: boolean;
  redactSensitiveData: boolean;
  maxLogEntrySize: number;
}

/**
 * Default logger configuration based on environment
 */
function getDefaultLoggerConfig(): LoggerConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    level: isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
    enableConsole: true,
    enableStructuredLogging: !isDevelopment,
    enableErrorTracking: !isDevelopment,
    redactSensitiveData: !isDevelopment,
    maxLogEntrySize: 10000, // 10KB
  };
}

/**
 * Sensitive data patterns to redact
 */
const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /auth/i,
  /credential/i,
  /sk-[a-zA-Z0-9]+/, // OpenAI API keys
  /eyJ[a-zA-Z0-9]+/, // JWT tokens
];

/**
 * Structured logger class
 */
export class Logger {
  private config: LoggerConfig;
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, number> = new Map();

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...getDefaultLoggerConfig(), ...config };
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.logError(LogLevel.ERROR, message, error, context);
  }

  /**
   * Log critical error message
   */
  critical(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.logError(LogLevel.CRITICAL, message, error, context);
  }

  /**
   * Log operation performance
   */
  performance(
    operation: string,
    duration: number,
    context?: Record<string, unknown>
  ): void {
    this.log(LogLevel.INFO, `Operation completed: ${operation}`, {
      ...context,
      duration,
      type: 'performance',
    });
  }

  /**
   * Log operation start
   */
  operationStart(operation: string, context?: Record<string, unknown>): () => void {
    const startTime = Date.now();
    this.debug(`Operation started: ${operation}`, context);

    return () => {
      const duration = Date.now() - startTime;
      this.performance(operation, duration, context);
    };
  }

  /**
   * Core logging method
   */
  public log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.processContext(context),
    };

    this.outputLog(logEntry);
  }

  /**
   * Error logging with enhanced information
   */
  public logError(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    // Track error frequency
    const errorKey = error ? `${error.name}:${error.message}` : message;
    this.updateErrorStats(errorKey);

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.processContext(context),
      error: error ? this.processError(error) : undefined,
    };

    this.outputLog(logEntry);

    // Send to error tracking service in production
    if (this.config.enableErrorTracking && level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
      this.trackError(logEntry);
    }
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const logLevelIndex = levels.indexOf(level);

    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * Process and redact sensitive context data
   */
  private processContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;

    if (!this.config.redactSensitiveData) {
      return context;
    }

    return this.redactSensitiveData(context);
  }

  /**
   * Process error for logging
   */
  private processError(error: Error): LogEntry['error'] {
    const errorData: LogEntry['error'] = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    if (isBaseError(error)) {
      errorData.code = error.code;
    }

    return errorData;
  }

  /**
   * Output log entry to appropriate channels
   */
  private outputLog(entry: LogEntry): void {
    // Truncate large log entries
    const truncatedEntry = this.truncateLogEntry(entry);

    if (this.config.enableConsole) {
      this.outputToConsole(truncatedEntry);
    }

    if (this.config.enableStructuredLogging) {
      this.outputToStructuredLog(truncatedEntry);
    }
  }

  /**
   * Output to console with appropriate formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const level = entry.level.toUpperCase().padEnd(8);

    let message = `[${timestamp}] ${level} ${entry.message}`;

    if (entry.context) {
      message += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.error) {
      message += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack && entry.level === LogLevel.DEBUG) {
        message += `\n  Stack: ${entry.error.stack}`;
      }
    }

    // Use appropriate console method
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message);
        break;
    }
  }

  /**
   * Output to structured logging system (JSON)
   */
  private outputToStructuredLog(entry: LogEntry): void {
    // In production, this would send to a logging service like DataDog, LogDNA, etc.
    console.log(JSON.stringify(entry));
  }

  /**
   * Track error in monitoring system
   */
  private trackError(entry: LogEntry): void {
    // In production, this would send to error tracking service like Sentry
    // For now, we'll just track locally
    if (entry.error) {
      const errorKey = `${entry.error.name}:${entry.error.message}`;
      const frequency = this.errorCounts.get(errorKey) || 0;

      // Alert on repeated errors
      if (frequency > 5) {
        console.warn(`High error frequency detected: ${errorKey} (${frequency} occurrences)`);
      }
    }
  }

  /**
   * Update error statistics
   */
  private updateErrorStats(errorKey: string): void {
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
    this.lastErrors.set(errorKey, Date.now());

    // Clean up old error stats (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, timestamp] of this.lastErrors.entries()) {
      if (timestamp < oneHourAgo) {
        this.errorCounts.delete(key);
        this.lastErrors.delete(key);
      }
    }
  }

  /**
   * Recursively redact sensitive data from objects
   */
  private redactSensitiveData(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactSensitiveData(item));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if key contains sensitive information
      const isSensitiveKey = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));

      if (isSensitiveKey) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        // Check if value looks like sensitive data
        const isSensitiveValue = SENSITIVE_PATTERNS.some(pattern => pattern.test(value));
        result[key] = isSensitiveValue ? '[REDACTED]' : value;
      } else {
        result[key] = this.redactSensitiveData(value);
      }
    }

    return result;
  }

  /**
   * Truncate log entry if it's too large
   */
  private truncateLogEntry(entry: LogEntry): LogEntry {
    const entryString = JSON.stringify(entry);

    if (entryString.length <= this.config.maxLogEntrySize) {
      return entry;
    }

    const truncatedEntry = { ...entry };

    if (truncatedEntry.context) {
      truncatedEntry.context = {
        ...truncatedEntry.context,
        _truncated: true,
        _originalSize: entryString.length,
      };
    }

    // Remove stack trace if present to reduce size
    if (truncatedEntry.error?.stack) {
      truncatedEntry.error = {
        ...truncatedEntry.error,
        stack: undefined,
      };
    }

    return truncatedEntry;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): { errorKey: string; count: number; lastOccurrence: number }[] {
    const result: { errorKey: string; count: number; lastOccurrence: number }[] = [];
    for (const [errorKey, count] of this.errorCounts.entries()) {
      result.push({
        errorKey,
        count,
        lastOccurrence: this.lastErrors.get(errorKey) || 0,
      });
    }
    return result;
  }

  /**
   * Clear error statistics
   */
  clearErrorStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Error logging utility functions
 */
export async function logError(
  error: Error,
  context?: Record<string, unknown>,
  level: LogLevel = LogLevel.ERROR
): Promise<void> {
  logger.logError(level, error.message, error, context);
}

/**
 * Performance logging decorator
 */
export function logPerformance(operationName?: string) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return descriptor;

    descriptor.value = async function (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
      const operation = operationName || `${target.constructor.name}.${propertyKey}`;
      const endTimer = logger.operationStart(operation);

      try {
        const result = await originalMethod.apply(this, args);
        endTimer();
        return result;
      } catch (error) {
        endTimer();
        logger.error(`Operation failed: ${operation}`, error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    } as T;

    return descriptor;
  };
}

/**
 * Log workflow events for debugging
 */
export function logWorkflowEvent(
  sessionId: string,
  stage: string,
  event: string,
  context?: Record<string, unknown>
): void {
  logger.info(`Workflow event: ${event}`, {
    sessionId,
    stage,
    event,
    type: 'workflow',
    ...context,
  });
}

/**
 * Log tool execution
 */
export function logToolExecution(
  toolName: string,
  parameters: unknown,
  result: { success: boolean; error?: string },
  duration: number
): void {
  const level = result.success ? LogLevel.INFO : LogLevel.WARN;
  const message = `Tool execution ${result.success ? 'completed' : 'failed'}: ${toolName}`;

  logger.log(level, message, {
    toolName,
    parameters: (logger as any).config.redactSensitiveData ? (logger as any).redactSensitiveData(parameters) : parameters,
    success: result.success,
    error: result.error,
    duration,
    type: 'tool',
  });
}