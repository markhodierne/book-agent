import { describe, it, expect } from 'vitest';
import {
  BaseError,
  ToolError,
  DatabaseError,
  WorkflowError,
  isBaseError,
  isToolError,
  isDatabaseError,
  isWorkflowError,
  toBaseError,
} from '../../lib/errors';
import type { WorkflowStage } from '../../types';

describe('BaseError', () => {
  it('should create error with basic properties', () => {
    const error = new BaseError('Test error');

    expect(error.name).toBe('BaseError');
    expect(error.message).toBe('Test error');
    expect(error.timestamp).toBeDefined();
    expect(error.code).toBeUndefined();
    expect(error.context).toBeUndefined();
  });

  it('should create error with options', () => {
    const context = { userId: '123', operation: 'test' };
    const error = new BaseError('Test error', {
      code: 'TEST_ERROR',
      context,
    });

    expect(error.code).toBe('TEST_ERROR');
    expect(error.context).toEqual(context);
  });

  it('should support error chaining', () => {
    const originalError = new Error('Original error');
    const error = new BaseError('Wrapped error', { cause: originalError });

    expect(error.cause).toBe(originalError);
  });

  it('should serialize to JSON correctly', () => {
    const context = { userId: '123' };
    const error = new BaseError('Test error', {
      code: 'TEST_ERROR',
      context,
    });

    const json = error.toJSON();

    expect(json).toEqual({
      name: 'BaseError',
      message: 'Test error',
      code: 'TEST_ERROR',
      timestamp: error.timestamp,
      context,
    });
  });

  it('should provide detailed error information', () => {
    const error = new BaseError('Test error', {
      code: 'TEST_ERROR',
      context: { operation: 'test' },
    });

    const details = error.getDetails();

    expect(details).toContain('Test error');
    expect(details).toContain('Code: TEST_ERROR');
    expect(details).toContain('Context:');
    expect(details).toContain('operation');
  });
});

describe('ToolError', () => {
  it('should create tool error with required properties', () => {
    const error = new ToolError('testTool', 'Tool failed');

    expect(error.name).toBe('ToolError');
    expect(error.message).toBe('Tool failed');
    expect(error.toolName).toBe('testTool');
    expect(error.retryAttempt).toBe(0);
    expect(error.code).toBe('TOOL_ERROR');
  });

  it('should create tool error with options', () => {
    const parameters = { input: 'test' };
    const error = new ToolError('testTool', 'Tool failed', {
      parameters,
      retryAttempt: 2,
      code: 'CUSTOM_CODE',
    });

    expect(error.parameters).toEqual(parameters);
    expect(error.retryAttempt).toBe(2);
    expect(error.code).toBe('CUSTOM_CODE');
  });

  it('should create retry error with static method', () => {
    const parameters = { input: 'test' };
    const cause = new Error('Network error');
    const error = ToolError.forRetry('testTool', 'Retry failed', 3, parameters, cause);

    expect(error.code).toBe('TOOL_RETRY_FAILED');
    expect(error.retryAttempt).toBe(3);
    expect(error.parameters).toEqual(parameters);
    expect(error.cause).toBe(cause);
  });

  it('should create timeout error with static method', () => {
    const error = ToolError.forTimeout('testTool', 5000);

    expect(error.code).toBe('TOOL_TIMEOUT');
    expect(error.message).toContain('timed out after 5000ms');
    expect(error.context?.timeoutMs).toBe(5000);
  });

  it('should create validation error with static method', () => {
    const parameters = { invalid: 'data' };
    const error = ToolError.forValidation('testTool', 'Invalid parameters', parameters);

    expect(error.code).toBe('TOOL_VALIDATION_ERROR');
    expect(error.parameters).toEqual(parameters);
  });
});

describe('DatabaseError', () => {
  it('should create database error with required properties', () => {
    const error = new DatabaseError('select', 'Query failed');

    expect(error.name).toBe('DatabaseError');
    expect(error.message).toBe('Query failed');
    expect(error.operation).toBe('select');
    expect(error.code).toBe('DATABASE_ERROR');
  });

  it('should create database error with options', () => {
    const error = new DatabaseError('insert', 'Insert failed', {
      table: 'users',
      query: 'INSERT INTO users...',
      code: 'CUSTOM_CODE',
    });

    expect(error.table).toBe('users');
    expect(error.query).toBe('INSERT INTO users...');
    expect(error.code).toBe('CUSTOM_CODE');
  });

  it('should create connection error with static method', () => {
    const cause = new Error('Connection refused');
    const error = DatabaseError.forConnection('Cannot connect to database', cause);

    expect(error.code).toBe('DATABASE_CONNECTION_ERROR');
    expect(error.operation).toBe('connection');
    expect(error.cause).toBe(cause);
  });

  it('should create query error with static method', () => {
    const error = DatabaseError.forQuery('users', 'select', 'Query failed', 'SELECT * FROM users');

    expect(error.code).toBe('DATABASE_QUERY_ERROR');
    expect(error.table).toBe('users');
    expect(error.operation).toBe('select');
    expect(error.query).toBe('SELECT * FROM users');
  });

  it('should create constraint error with static method', () => {
    const error = DatabaseError.forConstraint('users', 'insert', 'unique_email');

    expect(error.code).toBe('DATABASE_CONSTRAINT_ERROR');
    expect(error.message).toContain('unique_email');
    expect(error.context?.constraint).toBe('unique_email');
  });

  it('should create RLS error with static method', () => {
    const error = DatabaseError.forRLS('users', 'select', 'RLS policy violation');

    expect(error.code).toBe('DATABASE_RLS_ERROR');
    expect(error.table).toBe('users');
    expect(error.operation).toBe('select');
  });
});

describe('WorkflowError', () => {
  const sessionId = 'test-session-123';
  const stage: WorkflowStage = 'conversation';

  it('should create workflow error with required properties', () => {
    const error = new WorkflowError(sessionId, stage, 'Workflow failed');

    expect(error.name).toBe('WorkflowError');
    expect(error.message).toBe('Workflow failed');
    expect(error.sessionId).toBe(sessionId);
    expect(error.stage).toBe(stage);
    expect(error.recoverable).toBe(true);
    expect(error.code).toBe('WORKFLOW_ERROR');
  });

  it('should create workflow error with options', () => {
    const error = new WorkflowError(sessionId, stage, 'Critical failure', {
      recoverable: false,
      code: 'CUSTOM_CODE',
      context: { nodeId: 'test-node' },
    });

    expect(error.recoverable).toBe(false);
    expect(error.code).toBe('CUSTOM_CODE');
    expect(error.context?.nodeId).toBe('test-node');
  });

  it('should create node error with static method', () => {
    const cause = new Error('Node execution failed');
    const error = WorkflowError.forNode(sessionId, stage, 'testNode', 'Node failed', false, cause);

    expect(error.code).toBe('WORKFLOW_NODE_ERROR');
    expect(error.recoverable).toBe(false);
    expect(error.context?.nodeName).toBe('testNode');
    expect(error.cause).toBe(cause);
  });

  it('should create state error with static method', () => {
    const error = WorkflowError.forState(sessionId, stage, 'save');

    expect(error.code).toBe('WORKFLOW_STATE_ERROR');
    expect(error.message).toContain('save workflow state');
    expect(error.context?.operation).toBe('save');
  });

  it('should create critical error with static method', () => {
    const error = WorkflowError.forCritical(sessionId, stage, 'Critical system failure');

    expect(error.code).toBe('WORKFLOW_CRITICAL_ERROR');
    expect(error.recoverable).toBe(false);
  });

  it('should create timeout error with static method', () => {
    const error = WorkflowError.forTimeout(sessionId, stage, 30000);

    expect(error.code).toBe('WORKFLOW_TIMEOUT');
    expect(error.message).toContain('timed out after 30000ms');
    expect(error.context?.timeoutMs).toBe(30000);
  });
});

describe('Error type guards', () => {
  it('should identify BaseError correctly', () => {
    const baseError = new BaseError('test');
    const toolError = new ToolError('tool', 'test');
    const regularError = new Error('test');

    expect(isBaseError(baseError)).toBe(true);
    expect(isBaseError(toolError)).toBe(true); // ToolError extends BaseError
    expect(isBaseError(regularError)).toBe(false);
    expect(isBaseError('not an error')).toBe(false);
  });

  it('should identify ToolError correctly', () => {
    const toolError = new ToolError('tool', 'test');
    const baseError = new BaseError('test');
    const regularError = new Error('test');

    expect(isToolError(toolError)).toBe(true);
    expect(isToolError(baseError)).toBe(false);
    expect(isToolError(regularError)).toBe(false);
  });

  it('should identify DatabaseError correctly', () => {
    const dbError = new DatabaseError('select', 'test');
    const baseError = new BaseError('test');

    expect(isDatabaseError(dbError)).toBe(true);
    expect(isDatabaseError(baseError)).toBe(false);
  });

  it('should identify WorkflowError correctly', () => {
    const workflowError = new WorkflowError('session', 'conversation', 'test');
    const baseError = new BaseError('test');

    expect(isWorkflowError(workflowError)).toBe(true);
    expect(isWorkflowError(baseError)).toBe(false);
  });
});

describe('toBaseError', () => {
  it('should return BaseError as-is', () => {
    const baseError = new BaseError('test');
    const result = toBaseError(baseError);

    expect(result).toBe(baseError);
  });

  it('should wrap regular Error in BaseError', () => {
    const regularError = new Error('Regular error');
    const result = toBaseError(regularError);

    expect(result).toBeInstanceOf(BaseError);
    expect(result.message).toBe('Regular error');
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.cause).toBe(regularError);
    expect(result.context?.originalName).toBe('Error');
  });

  it('should wrap non-Error values in BaseError', () => {
    const result = toBaseError('string error');

    expect(result).toBeInstanceOf(BaseError);
    expect(result.message).toBe('string error');
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.context?.originalValue).toBe('string error');
  });

  it('should add custom context when provided', () => {
    const context = { operation: 'test' };
    const result = toBaseError('error', context);

    expect(result.context?.operation).toBe('test');
    expect(result.context?.originalValue).toBe('error');
  });
});