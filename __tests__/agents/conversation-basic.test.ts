// Basic Conversation Node Tests
// Simple functionality verification for Task 13

import { describe, it, expect, vi } from 'vitest';
import { createConversationNode } from '@/lib/agents/nodes/conversation';
import { WorkflowState } from '@/types';

// Mock all external dependencies
vi.mock('@/lib/config/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock response' } }],
        }),
      },
    },
  },
}));

vi.mock('@/lib/tools/registry', () => ({
  toolRegistry: {
    getTool: vi.fn(),
  },
}));

vi.mock('@/lib/config/environment', () => ({
  validateEnvironment: vi.fn(),
  getEnvironmentConfig: vi.fn().mockReturnValue({
    OPENAI_API_KEY: 'test-key',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    FIRECRAWL_API_KEY: 'test-firecrawl-key',
    NODE_ENV: 'test',
  }),
}));

vi.mock('@/lib/errors/exports', () => ({
  WorkflowError: class MockWorkflowError extends Error {
    recoverable = true;
    constructor(message: string) {
      super(message);
      this.name = 'WorkflowError';
    }
  },
  WorkflowErrorContext: class {
    updateStage = vi.fn();
    createError = vi.fn();
    cleanup = vi.fn();
  },
  executeWithToolContext: vi.fn().mockImplementation(async (_name, _params, fn) => fn()),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ConversationNode - Basic Tests', () => {
  const mockState: WorkflowState = {
    sessionId: 'test-session',
    userId: 'test-user',
    currentStage: 'conversation',
    status: 'active',
    userPrompt: 'I want to create a book about AI',
    progress: {
      currentStage: 'conversation',
      percentage: 0,
      message: 'Starting',
      startedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('creates conversation node successfully', () => {
    const node = createConversationNode();
    expect(node.name).toBe('conversation');
    expect(node.description).toContain('requirements');
  });

  it('validates user prompt correctly', () => {
    const node = createConversationNode();

    // Valid prompts
    expect(node.validate(mockState)).toBe(true);
    expect(node.validate({ ...mockState, userPrompt: 'AI book' })).toBe(true);

    // Invalid prompts
    expect(node.validate({ ...mockState, userPrompt: '' })).toBe(false);
    expect(node.validate({ ...mockState, userPrompt: 'AI' })).toBe(false);
  });

  it('implements recovery method', async () => {
    const node = createConversationNode();
    const mockError = new Error('Test error') as any;

    const result = await node.recover(mockState, mockError);

    expect(result.requirements).toBeDefined();
    expect(result.requirements?.topic).toBe(mockState.userPrompt);
    expect(result.currentStage).toBe('outline');
  });

  it('has required properties from BaseWorkflowNode', () => {
    const node = createConversationNode();

    expect(typeof node.execute).toBe('function');
    expect(typeof node.validate).toBe('function');
    expect(typeof node.recover).toBe('function');
  });
});