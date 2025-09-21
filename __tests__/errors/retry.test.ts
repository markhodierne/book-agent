import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  withRetry,
  retryAPI,
  retryDatabase,
  createRetryable,
  retryBatch,
  DEFAULT_RETRY_CONFIG,
} from '../../lib/errors/retry';
import { ToolError } from '../../lib/errors';
import type { RetryConfig } from '../../types';

// Mock timers
vi.mock('node:timers/promises', () => ({
  setTimeout: vi.fn().mockImplementation((_ms: number) => Promise.resolve()),
}));

const defaultConfig: RetryConfig = {
  maxRetries: 2,
  backoffMultiplier: 2,
  initialDelay: 100,
  maxDelay: 1000,
};

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await withRetry(operation, defaultConfig);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');

    const promise = withRetry(operation, defaultConfig);

    // Fast-forward through the delay
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should fail after exhausting retries', async () => {
    const error = new Error('Persistent failure');
    const operation = vi.fn().mockRejectedValue(error);

    await expect(withRetry(operation, defaultConfig)).rejects.toThrow();
    expect(operation).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('should not retry non-retryable errors', async () => {
    const error = new Error('400 Bad Request'); // Non-retryable
    const operation = vi.fn().mockRejectedValue(error);

    const shouldRetry = () => false;

    await expect(withRetry(operation, defaultConfig, { shouldRetry })).rejects.toThrow();
    expect(operation).toHaveBeenCalledTimes(1); // No retries
  });

  it('should call onRetry callback', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');

    const onRetry = vi.fn();

    const promise = withRetry(operation, defaultConfig, { onRetry });

    await vi.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number));
  });

  it('should handle timeout', async () => {
    const operation = vi.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 10000))
    );

    const configWithTimeout = { ...defaultConfig, timeout: 1000 };

    await expect(withRetry(operation, configWithTimeout)).rejects.toThrow('timed out');
  });

  it('should enhance error with retry information', async () => {
    const originalError = new Error('Test error');
    const operation = vi.fn().mockRejectedValue(originalError);

    try {
      await withRetry(operation, defaultConfig, { operationName: 'testOperation' });
    } catch (error: any) {
      expect(error.context?.retryStats?.attempts).toBe(3);
      expect(error.context?.retryStats?.operationName).toBe('testOperation');
    }
  });
});

describe('calculateDelay (internal)', () => {
  // Since calculateDelay is internal, we test it indirectly through withRetry behavior
  it('should use exponential backoff', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Test error'));
    const onRetry = vi.fn();

    const config: RetryConfig = {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 100,
      maxDelay: 1000,
    };

    try {
      await withRetry(operation, config, { onRetry });
    } catch {
      // Expected to fail
    }

    // Check that delays increase (allowing for jitter)
    const delays = onRetry.mock.calls.map(call => call[2]);
    expect(delays.length).toBe(3);

    // With jitter, delays should be roughly: 100, 200, 400 (±25%)
    expect(delays[0]).toBeGreaterThan(75);
    expect(delays[0]).toBeLessThan(125);
    expect(delays[1]).toBeGreaterThan(150);
    expect(delays[1]).toBeLessThan(250);
  });

  it('should respect maxDelay', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Test error'));
    const onRetry = vi.fn();

    const config: RetryConfig = {
      maxRetries: 5,
      backoffMultiplier: 10,
      initialDelay: 100,
      maxDelay: 300, // Low max delay
    };

    try {
      await withRetry(operation, config, { onRetry });
    } catch {
      // Expected to fail
    }

    const delays = onRetry.mock.calls.map(call => call[2]);

    // All delays should be capped at maxDelay (plus jitter)
    delays.forEach(delay => {
      expect(delay).toBeLessThan(375); // 300 + 25% jitter
    });
  });
});

describe('isRetryableError (internal)', () => {
  it('should identify retryable network errors', async () => {
    const networkErrors = [
      new Error('ECONNRESET'),
      new Error('ETIMEDOUT'),
      new Error('ENOTFOUND'),
    ];

    for (const error of networkErrors) {
      const operation = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const promise = withRetry(operation, { ...defaultConfig, maxRetries: 1 });
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBe('success');
      expect(operation).toHaveBeenCalledTimes(2); // Initial + 1 retry
    }
  });

  it('should identify retryable HTTP errors', async () => {
    const httpErrors = [
      new Error('500 Internal Server Error'),
      new Error('502 Bad Gateway'),
      new Error('503 Service Unavailable'),
      new Error('429 Too Many Requests'),
    ];

    for (const error of httpErrors) {
      const operation = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const promise = withRetry(operation, { ...defaultConfig, maxRetries: 1 });
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBe('success');
    }
  });

  it('should not retry 4xx client errors', async () => {
    const clientErrors = [
      new Error('400 Bad Request'),
      new Error('401 Unauthorized'),
      new Error('404 Not Found'),
    ];

    for (const error of clientErrors) {
      const operation = vi.fn().mockRejectedValue(error);

      await expect(withRetry(operation, defaultConfig)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    }
  });

  it('should handle ToolError retry codes', async () => {
    const retryableToolError = new ToolError('test', 'Test error', {
      code: 'TOOL_TIMEOUT',
    });

    const operation = vi.fn()
      .mockRejectedValueOnce(retryableToolError)
      .mockResolvedValue('success');

    const promise = withRetry(operation, { ...defaultConfig, maxRetries: 1 });
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe('Default retry configurations', () => {
  it('should provide API retry config', () => {
    expect(DEFAULT_RETRY_CONFIG.api).toEqual({
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
      maxDelay: 30000,
      timeout: 60000,
    });
  });

  it('should provide database retry config', () => {
    expect(DEFAULT_RETRY_CONFIG.database).toEqual({
      maxRetries: 2,
      backoffMultiplier: 1.5,
      initialDelay: 500,
      maxDelay: 5000,
      timeout: 30000,
    });
  });
});

describe('Convenience retry functions', () => {
  it('should use correct config for retryAPI', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await retryAPI(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should use correct config for retryDatabase', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await retryDatabase(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe('createRetryable', () => {
  it('should create retryable function', async () => {
    const originalFn = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue('success');

    const retryableFn = createRetryable(originalFn, defaultConfig);

    const promise = retryableFn('arg1', 'arg2');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(originalFn).toHaveBeenCalledTimes(2);
  });
});

describe('retryBatch', () => {
  it('should process operations in batches', async () => {
    const operations = [
      vi.fn().mockResolvedValue('result1'),
      vi.fn().mockResolvedValue('result2'),
      vi.fn().mockResolvedValue('result3'),
      vi.fn().mockResolvedValue('result4'),
    ];

    const results = await retryBatch(operations, defaultConfig, { concurrency: 2 });

    expect(results).toHaveLength(4);
    expect(results.every(r => r.success)).toBe(true);
    expect(results.map(r => r.data)).toEqual(['result1', 'result2', 'result3', 'result4']);
  });

  it('should handle failures without stopping', async () => {
    const operations = [
      vi.fn().mockResolvedValue('success'),
      vi.fn().mockRejectedValue(new Error('failure')),
      vi.fn().mockResolvedValue('success2'),
    ];

    const results = await retryBatch(operations, defaultConfig);

    expect(results).toHaveLength(3);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[2].success).toBe(true);
  });

  it('should stop on first error when configured', async () => {
    const operations = [
      vi.fn().mockResolvedValue('success'),
      vi.fn().mockRejectedValue(new Error('failure')),
      vi.fn().mockResolvedValue('success2'),
    ];

    await expect(
      retryBatch(operations, defaultConfig, { stopOnFirstError: true })
    ).rejects.toThrow('failure');
  });
});