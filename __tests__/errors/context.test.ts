import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  errorContextStore,
  enrichError,
  withErrorContext,
  WorkflowErrorContext,
  executeWithToolContext,
  executeWithDatabaseContext,
  getCurrentContext,
  setGlobalContext,
} from '../../lib/errors/context';
import { BaseError, ToolError, DatabaseError, WorkflowError } from '../../lib/errors';
import type { WorkflowStage } from '../../types';

describe('ErrorContextStore', () => {
  beforeEach(() => {
    errorContextStore.clearAllContexts();
  });

  it('should set and get default context', () => {
    const defaultContext = { environment: 'test', version: '1.0.0' };
    errorContextStore.setDefaultContext(defaultContext);

    const context = errorContextStore.getContext();

    expect(context.environment).toBe('test');
    expect(context.version).toBe('1.0.0');
    expect(context.timestamp).toBeDefined();
  });

  it('should set and get scoped context', () => {
    const scopeId = 'test-scope';
    const scopeContext = { sessionId: 'session-123', userId: 'user-456' };

    errorContextStore.setContext(scopeId, scopeContext);
    const context = errorContextStore.getContext(scopeId);

    expect(context.sessionId).toBe('session-123');
    expect(context.userId).toBe('user-456');
  });

  it('should merge default and scoped context', () => {
    const defaultContext = { environment: 'test' };
    const scopeContext = { sessionId: 'session-123' };

    errorContextStore.setDefaultContext(defaultContext);
    errorContextStore.setContext('scope', scopeContext);

    const context = errorContextStore.getContext('scope');

    expect(context.environment).toBe('test');
    expect(context.sessionId).toBe('session-123');
  });

  it('should clear specific context', () => {
    errorContextStore.setContext('scope1', { sessionId: 'session-1' });
    errorContextStore.setContext('scope2', { sessionId: 'session-2' });

    errorContextStore.clearContext('scope1');

    const context1 = errorContextStore.getContext('scope1');
    const context2 = errorContextStore.getContext('scope2');

    expect(context1.sessionId).toBeUndefined();
    expect(context2.sessionId).toBe('session-2');
  });

  it('should clear all contexts', () => {
    errorContextStore.setDefaultContext({ environment: 'test' });
    errorContextStore.setContext('scope', { sessionId: 'session' });

    errorContextStore.clearAllContexts();

    const context = errorContextStore.getContext('scope');

    expect(context.environment).toBeUndefined();
    expect(context.sessionId).toBeUndefined();
  });
});

describe('enrichError', () => {
  beforeEach(() => {
    errorContextStore.clearAllContexts();
  });

  it('should enrich BaseError with context', () => {
    const scopeId = 'test-scope';
    errorContextStore.setContext(scopeId, { sessionId: 'session-123' });

    const originalError = new BaseError('Test error', { code: 'TEST_ERROR' });
    const enrichedError = enrichError(originalError, scopeId);

    expect(enrichedError).toBeInstanceOf(BaseError);
    expect(enrichedError.message).toBe('Test error');
    expect(enrichedError.code).toBe('TEST_ERROR');
    expect(enrichedError.context?.sessionId).toBe('session-123');
  });

  it('should wrap regular Error in BaseError with context', () => {
    const scopeId = 'test-scope';
    errorContextStore.setContext(scopeId, { sessionId: 'session-123' });

    const originalError = new Error('Regular error');
    const enrichedError = enrichError(originalError, scopeId);

    expect(enrichedError).toBeInstanceOf(BaseError);
    expect(enrichedError.message).toBe('Regular error');
    expect(enrichedError.context?.sessionId).toBe('session-123');
    expect(enrichedError.context?.originalError?.name).toBe('Error');
  });

  it('should add additional context', () => {
    const originalError = new BaseError('Test error');
    const additionalContext = { operation: 'test-operation' };

    const enrichedError = enrichError(originalError, undefined, additionalContext);

    expect(enrichedError.context?.operation).toBe('test-operation');
  });

  it('should preserve original stack trace', () => {
    const originalError = new Error('Test error');
    const originalStack = originalError.stack;

    const enrichedError = enrichError(originalError);

    expect(enrichedError.stack).toBe(originalStack);
  });
});

describe('withErrorContext', () => {
  beforeEach(() => {
    errorContextStore.clearAllContexts();
  });

  it('should execute function successfully with context', async () => {
    const testFunction = vi.fn().mockResolvedValue('success');
    const contextProvider = vi.fn().mockReturnValue({ operation: 'test' });

    const wrappedFunction = withErrorContext(testFunction, contextProvider);
    const result = await wrappedFunction('arg1', 'arg2');

    expect(result).toBe('success');
    expect(contextProvider).toHaveBeenCalledWith('arg1', 'arg2');
    expect(testFunction).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should enrich errors with context', async () => {
    const testError = new Error('Test error');
    const testFunction = vi.fn().mockRejectedValue(testError);
    const contextProvider = vi.fn().mockReturnValue({ operation: 'test' });

    const wrappedFunction = withErrorContext(testFunction, contextProvider);

    try {
      await wrappedFunction();
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toBe('Test error');
      expect(error.context).toMatchObject({
        operation: 'test',
        requestId: expect.any(String),
      });
    }
  });

  it('should clean up context after execution', async () => {
    const testFunction = vi.fn().mockResolvedValue('success');
    const contextProvider = () => ({ operation: 'test' });

    const wrappedFunction = withErrorContext(testFunction, contextProvider);
    await wrappedFunction();

    // Context should be cleaned up - getting context without scope should not have operation
    const currentContext = getCurrentContext();
    expect(currentContext.operation).toBeUndefined();
  });
});

describe('WorkflowErrorContext', () => {
  let workflowContext: WorkflowErrorContext;
  const sessionId = 'test-session-123';
  const userId = 'user-456';

  beforeEach(() => {
    errorContextStore.clearAllContexts();
    workflowContext = new WorkflowErrorContext(sessionId, userId);
  });

  afterEach(() => {
    workflowContext.cleanup();
  });

  it('should initialize with session and user context', () => {
    const context = getCurrentContext(sessionId);

    expect(context.sessionId).toBe(sessionId);
    expect(context.userId).toBe(userId);
    expect(context.requestId).toBe(sessionId);
  });

  it('should update stage context', () => {
    const stage: WorkflowStage = 'outline';
    workflowContext.updateStage(stage);

    const context = getCurrentContext(sessionId);

    expect(context.stage).toBe(stage);
    expect(context.operation).toBe('workflow_outline');
  });

  it('should set tool context', () => {
    const toolName = 'pdfExtract';
    const parameters = { file: 'test.pdf' };

    workflowContext.setToolContext(toolName, parameters);

    const context = getCurrentContext(sessionId);

    expect(context.toolName).toBe(toolName);
    expect(context.operation).toBe('tool_pdfExtract');
  });

  it('should set database context', () => {
    workflowContext.setDatabaseContext('insert', 'books');

    const context = getCurrentContext(sessionId);

    expect(context.operation).toBe('db_insert');
    expect(context.toolName).toBeUndefined(); // Should clear tool context
  });

  it('should create ToolError with context', () => {
    workflowContext.setToolContext('testTool');
    workflowContext.updateStage('chapter_generation');

    const error = workflowContext.createError(ToolError, 'Tool failed', {
      parameters: { test: 'data' },
    });

    expect(error).toBeInstanceOf(ToolError);
    expect((error as ToolError).toolName).toBe('testTool');
    expect((error as ToolError).parameters).toEqual({ test: 'data' });
  });

  it('should create DatabaseError with context', () => {
    workflowContext.setDatabaseContext('select', 'chapters');

    const error = workflowContext.createError(DatabaseError, 'Query failed', {
      table: 'chapters',
    });

    expect(error).toBeInstanceOf(DatabaseError);
    expect((error as DatabaseError).operation).toBe('select');
    expect((error as DatabaseError).table).toBe('chapters');
  });

  it('should create WorkflowError with context', () => {
    workflowContext.updateStage('quality_review');

    const error = workflowContext.createError(WorkflowError, 'Workflow failed', {
      recoverable: false,
    });

    expect(error).toBeInstanceOf(WorkflowError);
    expect((error as WorkflowError).sessionId).toBe(sessionId);
    expect((error as WorkflowError).stage).toBe('quality_review');
    expect((error as WorkflowError).recoverable).toBe(false);
  });

  it('should fallback to BaseError when context is incomplete', () => {
    const error = workflowContext.createError(ToolError, 'Error without tool context');

    expect(error).toBeInstanceOf(BaseError);
    expect(error.code).toBe('WORKFLOW_ERROR');
  });

  it('should cleanup context', () => {
    workflowContext.cleanup();

    const context = getCurrentContext(sessionId);

    expect(context.sessionId).toBeUndefined();
    expect(context.userId).toBeUndefined();
  });
});

describe('executeWithToolContext', () => {
  beforeEach(() => {
    errorContextStore.clearAllContexts();
  });

  it('should execute operation successfully with tool context', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const toolName = 'testTool';
    const parameters = { input: 'test' };

    const result = await executeWithToolContext(toolName, parameters, operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should wrap errors in ToolError with context', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));
    const toolName = 'testTool';
    const parameters = { input: 'test' };

    await expect(
      executeWithToolContext(toolName, parameters, operation)
    ).rejects.toMatchObject({
      toolName,
      parameters,
      message: 'Operation failed',
    });
  });

  it('should preserve ToolError instances', async () => {
    const originalError = new ToolError('testTool', 'Tool failed', { code: 'CUSTOM_CODE' });
    const operation = vi.fn().mockRejectedValue(originalError);

    await expect(
      executeWithToolContext('testTool', {}, operation)
    ).rejects.toMatchObject({
      code: 'CUSTOM_CODE',
      toolName: 'testTool',
    });
  });

  it('should clean up context when no sessionId provided', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    await executeWithToolContext('testTool', {}, operation);

    // Should not have any lingering context
    const context = getCurrentContext();
    expect(context.toolName).toBeUndefined();
  });
});

describe('executeWithDatabaseContext', () => {
  beforeEach(() => {
    errorContextStore.clearAllContexts();
  });

  it('should execute operation successfully with database context', async () => {
    const operation = vi.fn().mockResolvedValue({ data: 'result' });

    const result = await executeWithDatabaseContext('select', 'users', operation);

    expect(result).toEqual({ data: 'result' });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should wrap errors in DatabaseError with context', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Query failed'));

    await expect(
      executeWithDatabaseContext('select', 'users', operation)
    ).rejects.toMatchObject({
      operation: 'select',
      table: 'users',
      message: 'Query failed',
    });
  });

  it('should preserve DatabaseError instances', async () => {
    const originalError = new DatabaseError('select', 'Query failed', {
      code: 'CUSTOM_CODE',
    });
    const operation = vi.fn().mockRejectedValue(originalError);

    await expect(
      executeWithDatabaseContext('select', 'users', operation)
    ).rejects.toMatchObject({
      code: 'CUSTOM_CODE',
      operation: 'select',
    });
  });
});

describe('Global context functions', () => {
  beforeEach(() => {
    errorContextStore.clearAllContexts();
  });

  it('should set and get global context', () => {
    const globalContext = { environment: 'test', version: '1.0.0' };

    setGlobalContext(globalContext);
    const context = getCurrentContext();

    expect(context.environment).toBe('test');
    expect(context.version).toBe('1.0.0');
  });

  it('should get current context for specific scope', () => {
    errorContextStore.setContext('scope', { sessionId: 'session-123' });

    const context = getCurrentContext('scope');

    expect(context.sessionId).toBe('session-123');
  });
});