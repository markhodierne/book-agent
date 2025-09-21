import {
  ToolError,
  withRetry,
  executeWithToolContext,
  logger,
} from '@/lib/errors/exports';
import { applicationMetrics, timeOperation } from '@/lib/monitoring/metrics';
import type { ToolConfig, ToolResult, RetryConfig } from '@/types';

/**
 * Enhanced tool interface with execution metadata and context
 */
export interface Tool<P = unknown, R = unknown> {
  readonly name: string;
  readonly description: string;
  invoke: (params: P) => Promise<ToolResult<R>>;
  invokeRaw: (params: P) => Promise<R>;
  readonly config: ToolConfig<P, R>;
}

/**
 * Tool creation options with enhanced configuration
 */
export interface CreateToolOptions<P = unknown, R = unknown> {
  name: string;
  description: string;
  execute: (params: P) => Promise<R>;
  retryConfig?: RetryConfig;
  timeout?: number;
  sessionId?: string;
  validateParams?: (params: P) => void;
  validateResult?: (result: R) => void;
}

/**
 * Default retry configuration for tools
 */
export const DEFAULT_TOOL_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  backoffMultiplier: 2,
  initialDelay: 1000,
  maxDelay: 30000,
  timeout: 60000,
};

/**
 * Creates a typed, retryable tool with consistent error handling and monitoring
 *
 * This function implements the tool-centric design principle from ARCHITECTURE.md
 * by creating discrete, reusable tools that can be orchestrated by LangGraph nodes
 * without containing business logic themselves.
 *
 * @param options Tool configuration with validation and retry options
 * @returns Typed tool with invoke methods and metadata
 */
export function createTool<P = unknown, R = unknown>(
  options: CreateToolOptions<P, R>
): Tool<P, R> {
  const {
    name,
    description,
    execute,
    retryConfig = DEFAULT_TOOL_RETRY_CONFIG,
    timeout,
    sessionId,
    validateParams,
    validateResult,
  } = options;

  // Create tool configuration
  const config: ToolConfig<P, R> = {
    name,
    description,
    parameters: {} as P, // Placeholder, actual params come from invoke calls
    execute,
    retryConfig,
    timeout,
  };

  // Raw execution method without error wrapping (for internal use)
  const invokeRaw = async (params: P): Promise<R> => {
    // Parameter validation
    if (validateParams) {
      try {
        validateParams(params);
      } catch (error) {
        throw ToolError.forValidation(name, `Parameter validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Execute with tool context for enhanced error handling
    const result = await executeWithToolContext(
      name,
      params,
      () => execute(params),
      sessionId
    );

    // Result validation
    if (validateResult) {
      try {
        validateResult(result);
      } catch (error) {
        throw ToolError.forValidation(name, `Result validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return result;
  };

  // Enhanced execution method with metrics and full error handling
  const invoke = async (params: P): Promise<ToolResult<R>> => {
    const startTime = Date.now();
    let retryCount = 0;

    try {
      // Execute with retry logic and performance monitoring
      const result = await timeOperation(
        applicationMetrics.toolExecutionTime,
        async () => {
          return await withRetry(
            async () => {
              try {
                return await invokeRaw(params);
              } catch (error) {
                retryCount++;

                // Log retry attempts for monitoring
                if (retryCount > 1) {
                  logger.warn(`Tool execution retry: ${name} (attempt ${retryCount})`);
                }

                throw error;
              }
            },
            retryConfig
          );
        }
      );

      const executionTime = Date.now() - startTime;

      // Log successful execution
      logger.debug(`Tool execution completed: ${name} (${executionTime}ms, ${retryCount} retries)`);

      // Track successful execution
      applicationMetrics.toolExecutionSuccessCount.inc();

      return {
        success: true,
        data: result,
        executionTime,
        retryCount,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Ensure error is properly typed
      const toolError = error instanceof ToolError
        ? error
        : ToolError.forExecution(name, error instanceof Error ? error.message : String(error));

      // Log error with context
      logger.error(`Tool execution failed: ${name} (${executionTime}ms, ${retryCount} retries) - ${toolError.message}`);

      // Track failed execution
      applicationMetrics.toolExecutionErrorCount.inc();

      return {
        success: false,
        error: toolError.message,
        executionTime,
        retryCount,
      };
    }
  };

  return {
    name,
    description,
    invoke,
    invokeRaw,
    config,
  };
}

/**
 * Factory for creating tools with common patterns
 */
export const ToolFactory = {
  /**
   * Creates an API-based tool with network-optimized retry configuration
   */
  createApiTool: <P, R>(
    name: string,
    description: string,
    execute: (params: P) => Promise<R>,
    timeout = 30000
  ): Tool<P, R> => {
    return createTool({
      name,
      description,
      execute,
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000,
        maxDelay: 15000,
        timeout,
      },
      timeout,
    });
  },

  /**
   * Creates a file processing tool with extended timeout
   */
  createFileProcessingTool: <P, R>(
    name: string,
    description: string,
    execute: (params: P) => Promise<R>
  ): Tool<P, R> => {
    return createTool({
      name,
      description,
      execute,
      retryConfig: {
        maxRetries: 2,
        backoffMultiplier: 1.5,
        initialDelay: 2000,
        maxDelay: 10000,
        timeout: 120000, // 2 minutes for file processing
      },
      timeout: 120000,
    });
  },

  /**
   * Creates a database tool with database-optimized retry configuration
   */
  createDatabaseTool: <P, R>(
    name: string,
    description: string,
    execute: (params: P) => Promise<R>
  ): Tool<P, R> => {
    return createTool({
      name,
      description,
      execute,
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 1.5,
        initialDelay: 500,
        maxDelay: 5000,
        timeout: 30000,
      },
      timeout: 30000,
    });
  },

  /**
   * Creates a chapter generation tool with extended timeout and minimal retries
   */
  createChapterGenerationTool: <P, R>(
    name: string,
    description: string,
    execute: (params: P) => Promise<R>
  ): Tool<P, R> => {
    return createTool({
      name,
      description,
      execute,
      retryConfig: {
        maxRetries: 1, // Expensive operations get fewer retries
        backoffMultiplier: 2,
        initialDelay: 5000,
        maxDelay: 30000,
        timeout: 300000, // 5 minutes for chapter generation
      },
      timeout: 300000,
    });
  },
};