import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTool, ToolFactory, DEFAULT_TOOL_RETRY_CONFIG } from '@/lib/tools/createTool';

// Mock the monitoring and error modules
vi.mock('@/lib/monitoring/metrics', () => ({
  applicationMetrics: {
    toolExecutionTime: {
      startTimer: vi.fn(() => vi.fn()),
    },
    toolExecutionSuccessCount: {
      inc: vi.fn(),
    },
    toolExecutionErrorCount: {
      inc: vi.fn(),
    },
  },
  timeOperation: vi.fn((_, operation) => operation()),
}));

vi.mock('@/lib/errors/exports', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/errors/exports')>();
  return {
    ...original,
    executeWithToolContext: vi.fn((_, __, operation) => operation()),
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    withRetry: vi.fn((operation) => operation()),
  };
});

describe('createTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('creates a tool with correct properties', () => {
    const execute = vi.fn().mockResolvedValue('test result');

    const tool = createTool({
      name: 'test_tool',
      description: 'A test tool',
      execute,
    });

    expect(tool.name).toBe('test_tool');
    expect(tool.description).toBe('A test tool');
    expect(tool.config.name).toBe('test_tool');
    expect(tool.config.description).toBe('A test tool');
    expect(tool.config.retryConfig).toEqual(DEFAULT_TOOL_RETRY_CONFIG);
  });

  it('executes successfully and returns ToolResult', async () => {
    const execute = vi.fn().mockResolvedValue('test result');

    const tool = createTool({
      name: 'test_tool',
      description: 'A test tool',
      execute,
    });

    const result = await tool.invoke({ param: 'test' });

    expect(result.success).toBe(true);
    expect(result.data).toBe('test result');
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
    expect(result.retryCount).toBe(0);
    expect(execute).toHaveBeenCalledWith({ param: 'test' });
  });

  it('handles execution errors and returns error ToolResult', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('Test error'));

    const tool = createTool({
      name: 'test_tool',
      description: 'A test tool',
      execute,
    });

    const result = await tool.invoke({ param: 'test' });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });

  it('validates parameters when validator provided', async () => {
    const execute = vi.fn().mockResolvedValue('result');
    const validateParams = vi.fn().mockImplementation((params: any) => {
      if (!params.required) {
        throw new Error('Missing required parameter');
      }
    });

    const tool = createTool({
      name: 'test_tool',
      description: 'A test tool',
      execute,
      validateParams,
    });

    // Should fail validation
    const result = await tool.invoke({ notRequired: 'test' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Parameter validation failed');

    // Should pass validation
    const result2 = await tool.invoke({ required: 'test' });
    expect(result2.success).toBe(true);
  });

  it('validates results when validator provided', async () => {
    const execute = vi.fn().mockResolvedValue({ invalid: true });
    const validateResult = vi.fn().mockImplementation((result: any) => {
      if (result.invalid) {
        throw new Error('Invalid result');
      }
    });

    const tool = createTool({
      name: 'test_tool',
      description: 'A test tool',
      execute,
      validateResult,
    });

    const result = await tool.invoke({ param: 'test' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Result validation failed');
  });

  it('uses custom retry configuration', () => {
    const customRetryConfig = {
      maxRetries: 5,
      backoffMultiplier: 1.5,
      initialDelay: 500,
      maxDelay: 10000,
      timeout: 30000,
    };

    const tool = createTool({
      name: 'test_tool',
      description: 'A test tool',
      execute: vi.fn(),
      retryConfig: customRetryConfig,
    });

    expect(tool.config.retryConfig).toEqual(customRetryConfig);
  });

  it('invokeRaw bypasses ToolResult wrapping', async () => {
    const execute = vi.fn().mockResolvedValue('direct result');

    const tool = createTool({
      name: 'test_tool',
      description: 'A test tool',
      execute,
    });

    const result = await tool.invokeRaw({ param: 'test' });
    expect(result).toBe('direct result');
  });

  it('invokeRaw throws errors directly', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('Direct error'));

    const tool = createTool({
      name: 'test_tool',
      description: 'A test tool',
      execute,
    });

    await expect(tool.invokeRaw({ param: 'test' })).rejects.toThrow('Direct error');
  });
});

describe('ToolFactory', () => {
  it('creates API tool with correct configuration', () => {
    const execute = vi.fn();
    const tool = ToolFactory.createApiTool(
      'api_tool',
      'An API tool',
      execute,
      15000
    );

    expect(tool.name).toBe('api_tool');
    expect(tool.config.retryConfig?.maxRetries).toBe(3);
    expect(tool.config.retryConfig?.timeout).toBe(15000);
    expect(tool.config.timeout).toBe(15000);
  });

  it('creates file processing tool with extended timeout', () => {
    const execute = vi.fn();
    const tool = ToolFactory.createFileProcessingTool(
      'file_tool',
      'A file processing tool',
      execute
    );

    expect(tool.name).toBe('file_tool');
    expect(tool.config.retryConfig?.maxRetries).toBe(2);
    expect(tool.config.retryConfig?.timeout).toBe(120000);
    expect(tool.config.timeout).toBe(120000);
  });

  it('creates database tool with optimized configuration', () => {
    const execute = vi.fn();
    const tool = ToolFactory.createDatabaseTool(
      'db_tool',
      'A database tool',
      execute
    );

    expect(tool.name).toBe('db_tool');
    expect(tool.config.retryConfig?.maxRetries).toBe(3);
    expect(tool.config.retryConfig?.timeout).toBe(30000);
    expect(tool.config.timeout).toBe(30000);
  });

  it('creates chapter generation tool with minimal retries', () => {
    const execute = vi.fn();
    const tool = ToolFactory.createChapterGenerationTool(
      'chapter_tool',
      'A chapter generation tool',
      execute
    );

    expect(tool.name).toBe('chapter_tool');
    expect(tool.config.retryConfig?.maxRetries).toBe(1);
    expect(tool.config.retryConfig?.timeout).toBe(300000);
    expect(tool.config.timeout).toBe(300000);
  });
});