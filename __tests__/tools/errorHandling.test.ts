import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeToolSafely,
  ToolValidator,
  ToolTimeout,
  ToolCircuitBreaker,
} from '@/lib/tools/errorHandling';
import { ToolError } from '@/lib/errors/exports';

// Mock the monitoring and error modules
vi.mock('@/lib/monitoring/metrics', () => ({
  applicationMetrics: {
    toolExecutionSuccessCount: {
      inc: vi.fn(),
    },
    toolExecutionErrorCount: {
      inc: vi.fn(),
    },
  },
}));

vi.mock('@/lib/errors/exports', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/errors/exports')>();
  return {
    ...original,
    withRetry: vi.fn((operation) => operation()),
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

describe('executeToolSafely', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes successfully and returns success result', async () => {
    const mockExecution = vi.fn().mockResolvedValue('test result');

    const result = await executeToolSafely(
      'test_tool',
      { param: 'test' },
      mockExecution
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('test result');
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
    expect(result.retryCount).toBe(0);
  });

  it('handles errors and returns error result', async () => {
    const mockExecution = vi.fn().mockRejectedValue(new Error('Test error'));

    const result = await executeToolSafely(
      'test_tool',
      { param: 'test' },
      mockExecution
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Tool execution failed');
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });

  it('uses custom retry configuration', async () => {
    const mockExecution = vi.fn().mockResolvedValue('result');
    const customConfig = {
      maxRetries: 5,
      timeout: 90000,
    };

    const result = await executeToolSafely(
      'test_tool',
      { param: 'test' },
      mockExecution,
      customConfig
    );

    expect(result.success).toBe(true);
  });
});

describe('ToolValidator', () => {
  describe('validateParams', () => {
    it('passes validation for valid parameters', () => {
      const validator = (params: any) => params.required !== undefined;

      expect(() => {
        ToolValidator.validateParams('test_tool', { required: 'value' }, validator);
      }).not.toThrow();
    });

    it('throws ToolError for invalid parameters', () => {
      const validator = (params: any) => params.required !== undefined;

      expect(() => {
        ToolValidator.validateParams('test_tool', { notRequired: 'value' }, validator);
      }).toThrow(ToolError);
    });

    it('throws ToolError with custom validation message', () => {
      const validator = (params: any) => 'Custom validation error';

      expect(() => {
        ToolValidator.validateParams('test_tool', {}, validator);
      }).toThrow('Custom validation error');
    });

    it('handles validator exceptions', () => {
      const validator = () => {
        throw new Error('Validator exception');
      };

      expect(() => {
        ToolValidator.validateParams('test_tool', {}, validator);
      }).toThrow('Parameter validation error: Validator exception');
    });
  });

  describe('validateResult', () => {
    it('passes validation for valid results', () => {
      const validator = (result: any) => result.success === true;

      expect(() => {
        ToolValidator.validateResult('test_tool', { success: true }, validator);
      }).not.toThrow();
    });

    it('throws ToolError for invalid results', () => {
      const validator = (result: any) => result.success === true;

      expect(() => {
        ToolValidator.validateResult('test_tool', { success: false }, validator);
      }).toThrow(ToolError);
    });
  });

  describe('commonValidators', () => {
    it('validates non-empty strings', () => {
      const validator = ToolValidator.commonValidators.nonEmptyString;

      expect(validator('test')).toBe(true);
      expect(validator('')).toContain('Expected non-empty string');
      expect(validator(123)).toContain('Expected non-empty string');
    });

    it('validates positive numbers', () => {
      const validator = ToolValidator.commonValidators.positiveNumber;

      expect(validator(5)).toBe(true);
      expect(validator(0)).toContain('Expected positive number');
      expect(validator(-5)).toContain('Expected positive number');
      expect(validator('5')).toContain('Expected positive number');
    });

    it('validates buffers', () => {
      const validator = ToolValidator.commonValidators.validBuffer;

      expect(validator(Buffer.from('test'))).toBe(true);
      expect(validator(Buffer.alloc(0))).toContain('Expected non-empty buffer');
      expect(validator('not a buffer')).toContain('Expected non-empty buffer');
    });

    it('validates objects with required keys', () => {
      const validator = ToolValidator.commonValidators.objectWithKeys(['key1', 'key2']);

      expect(validator({ key1: 'value1', key2: 'value2' })).toBe(true);
      expect(validator({ key1: 'value1' })).toContain('Missing required keys: key2');
      expect(validator('not an object')).toContain('Expected object');
    });

    it('validates enum values', () => {
      const validator = ToolValidator.commonValidators.enumValue(['option1', 'option2']);

      expect(validator('option1')).toBe(true);
      expect(validator('option3')).toContain('Expected one of: option1, option2');
    });
  });
});

describe('ToolTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves promise within timeout', async () => {
    const promise = Promise.resolve('success');

    const result = await ToolTimeout.withTimeout(promise, 1000, 'test_tool');
    expect(result).toBe('success');
  });

  it('throws timeout error when promise takes too long', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('delayed'), 2000);
    });

    const timeoutPromise = ToolTimeout.withTimeout(promise, 1000, 'test_tool');

    // Advance time to trigger timeout
    vi.advanceTimersByTime(1000);

    await expect(timeoutPromise).rejects.toThrow(ToolError);
  });

  it('creates timeout controller', () => {
    const controller = ToolTimeout.createController(1000, 'test_tool');

    expect(controller.isTimedOut).toBe(false);

    controller.start();
    vi.advanceTimersByTime(1000);

    expect(controller.isTimedOut).toBe(true);
    expect(() => controller.checkTimeout()).toThrow(ToolError);
  });

  it('clears timeout controller', () => {
    const controller = ToolTimeout.createController(1000, 'test_tool');

    controller.start();
    controller.clear();
    vi.advanceTimersByTime(1000);

    expect(controller.isTimedOut).toBe(false);
  });
});

describe('ToolCircuitBreaker', () => {
  let circuitBreaker: ToolCircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    circuitBreaker = new ToolCircuitBreaker('test_tool', {
      failureThreshold: 3,
      recoveryTimeoutMs: 5000,
      monitorWindowMs: 10000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in CLOSED state', () => {
    const state = circuitBreaker.getState();
    expect(state.state).toBe('CLOSED');
    expect(state.failureCount).toBe(0);
  });

  it('executes operations successfully when CLOSED', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await circuitBreaker.execute(operation);
    expect(result).toBe('success');
  });

  it('opens circuit after threshold failures', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('failure'));

    // Fail the threshold number of times
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation);
      } catch {
        // Expected to fail
      }
    }

    const state = circuitBreaker.getState();
    expect(state.state).toBe('OPEN');
    expect(state.failureCount).toBe(3);
  });

  it('prevents execution when OPEN', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('failure'));

    // Trigger failures to open circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation);
      } catch {
        // Expected to fail
      }
    }

    // Now try to execute - should be blocked
    await expect(circuitBreaker.execute(operation)).rejects.toThrow(
      'Circuit breaker is OPEN'
    );
  });

  it('transitions to HALF_OPEN after recovery timeout', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('failure'));

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation);
      } catch {
        // Expected to fail
      }
    }

    // Wait for recovery timeout
    vi.advanceTimersByTime(5000);

    const state = circuitBreaker.getState();
    expect(state.state).toBe('HALF_OPEN');
  });

  it('resets to CLOSED on successful execution in HALF_OPEN', async () => {
    const failingOperation = vi.fn().mockRejectedValue(new Error('failure'));
    const successOperation = vi.fn().mockResolvedValue('success');

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingOperation);
      } catch {
        // Expected to fail
      }
    }

    // Wait for recovery
    vi.advanceTimersByTime(5000);

    // Execute successfully to close circuit
    const result = await circuitBreaker.execute(successOperation);
    expect(result).toBe('success');

    const state = circuitBreaker.getState();
    expect(state.state).toBe('CLOSED');
    expect(state.failureCount).toBe(0);
  });

  it('can be manually reset', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('failure'));

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(operation);
      } catch {
        // Expected to fail
      }
    }

    circuitBreaker.reset();

    const state = circuitBreaker.getState();
    expect(state.state).toBe('CLOSED');
    expect(state.failureCount).toBe(0);
  });
});