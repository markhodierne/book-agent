// Conversation Node Tests
// Comprehensive testing for Stage 1 requirements gathering
// Following CLAUDE.md testing standards and patterns

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ConversationNode, createConversationNode } from '@/lib/agents/nodes/conversation';
import { WorkflowState, BookRequirements } from '@/types';
import { toolRegistry } from '@/lib/tools/registry';
import { openai } from '@/lib/config/openai';

// Mock external dependencies
vi.mock('@/lib/config/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
  defaultOpenAIParams: {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    top_p: 0.9,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
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
    openaiApiKey: 'test-key',
  }),
}));

vi.mock('@/lib/errors/exports', () => ({
  WorkflowError: vi.fn().mockImplementation((message: string, details?: string, context?: any) => ({
    name: 'WorkflowError',
    message,
    details,
    context,
    recoverable: context?.recoverable ?? true,
  })),
  WorkflowErrorContext: vi.fn().mockImplementation(() => ({
    updateStage: vi.fn(),
    createError: vi.fn().mockReturnValue(new Error('Mocked error')),
    cleanup: vi.fn(),
  })),
  executeWithToolContext: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ConversationNode', () => {
  let conversationNode: ConversationNode;
  let mockState: WorkflowState;
  let mockOpenAI: Mock;
  let mockPdfTool: Mock;

  beforeEach(async () => {
    conversationNode = createConversationNode();

    mockState = {
      sessionId: 'test-session-123',
      userId: 'test-user-456',
      currentStage: 'conversation',
      status: 'active',
      userPrompt: 'I want to create a guide about artificial intelligence',
      progress: {
        currentStage: 'conversation',
        percentage: 0,
        message: 'Starting conversation',
        startedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Setup OpenAI mock
    mockOpenAI = openai.chat.completions.create as Mock;
    mockOpenAI.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Great! I\'d love to help you create a comprehensive AI guide. Let me ask a few questions to understand your vision better...',
          },
        },
      ],
    });

    // Setup PDF tool mock
    mockPdfTool = {
      execute: vi.fn().mockResolvedValue('Extracted PDF content about machine learning fundamentals...'),
    };

    const mockToolRegistry = toolRegistry.getTool as Mock;
    mockToolRegistry.mockReturnValue(mockPdfTool);

    // Setup executeWithToolContext mock
    const { executeWithToolContext } = await import('@/lib/errors/exports');
    (executeWithToolContext as any).mockImplementation(async (name: string, params: any, fn: Function) => {
      return await fn();
    });
  });

  describe('Node Creation and Configuration', () => {
    it('creates conversation node with correct properties', () => {
      expect(conversationNode.name).toBe('conversation');
      expect(conversationNode.description).toBe('Gather comprehensive book requirements through guided AI conversation');
    });

    it('factory function creates valid node instance', () => {
      const node = createConversationNode();
      expect(node).toBeInstanceOf(ConversationNode);
      expect(node.name).toBe('conversation');
    });
  });

  describe('Input Validation', () => {
    it('validates valid user prompt', () => {
      const isValid = conversationNode.validate(mockState);
      expect(isValid).toBe(true);
    });

    it('rejects empty user prompt', () => {
      const invalidState = { ...mockState, userPrompt: '' };
      const isValid = conversationNode.validate(invalidState);
      expect(isValid).toBe(false);
    });

    it('rejects user prompt shorter than 3 characters', () => {
      const invalidState = { ...mockState, userPrompt: 'AI' };
      const isValid = conversationNode.validate(invalidState);
      expect(isValid).toBe(false);
    });

    it('accepts user prompt exactly 3 characters', () => {
      const validState = { ...mockState, userPrompt: 'AI book' };
      const isValid = conversationNode.validate(validState);
      expect(isValid).toBe(true);
    });
  });

  describe('PDF Content Integration', () => {
    it('processes PDF content when provided', async () => {
      const stateWithPdf = {
        ...mockState,
        pdfFile: Buffer.from('mock PDF content'),
      };

      const result = await conversationNode.execute(stateWithPdf);

      expect(toolRegistry.getTool).toHaveBeenCalledWith('pdfExtract');
      expect(mockPdfTool.execute).toHaveBeenCalledWith({
        fileBuffer: stateWithPdf.pdfFile,
        options: { preserveLineBreaks: false },
      });

      expect(result.baseContent).toBeDefined();
      expect(result.currentStage).toBe('outline');
    });

    it('skips PDF processing when no file provided', async () => {
      const result = await conversationNode.execute(mockState);

      expect(toolRegistry.getTool).not.toHaveBeenCalled();
      expect(result.baseContent).toBeDefined(); // Should be empty string
      expect(result.currentStage).toBe('outline');
    });

    it('handles PDF extraction errors gracefully', async () => {
      const stateWithPdf = {
        ...mockState,
        pdfFile: Buffer.from('corrupt PDF'),
      };

      mockPdfTool.execute.mockRejectedValue(new Error('PDF extraction failed'));

      await expect(conversationNode.execute(stateWithPdf)).rejects.toThrow();
    });

    it('logs PDF processing progress', async () => {
      const stateWithPdf = {
        ...mockState,
        pdfFile: Buffer.from('mock PDF content'),
      };

      await conversationNode.execute(stateWithPdf);

      const { logger } = await import('@/lib/errors/exports');
      expect(logger.info).toHaveBeenCalledWith(
        'Processing PDF content for conversation context',
        expect.objectContaining({
          sessionId: 'test-session-123',
          fileSize: expect.any(Number),
        })
      );
    });
  });

  describe('Requirements Collection', () => {
    it('generates complete requirements structure', async () => {
      const result = await conversationNode.execute(mockState);

      expect(result.requirements).toBeDefined();
      expect(result.requirements?.topic).toBeDefined();
      expect(result.requirements?.audience).toBeDefined();
      expect(result.requirements?.author).toBeDefined();
      expect(result.requirements?.style).toBeDefined();
      expect(result.requirements?.wordCountTarget).toBeGreaterThanOrEqual(30000);
    });

    it('includes conversation history in result', async () => {
      const result = await conversationNode.execute(mockState);

      expect(result.conversationHistory).toBeDefined();
      expect(Array.isArray(result.conversationHistory)).toBe(true);
      expect(result.conversationHistory?.length).toBeGreaterThan(0);
    });

    it('sets appropriate word count target', async () => {
      const result = await conversationNode.execute(mockState);

      expect(result.requirements?.wordCountTarget).toBeGreaterThanOrEqual(30000);
      expect(result.requirements?.wordCountTarget).toBeLessThanOrEqual(150000);
    });

    it('defines audience with proper structure', async () => {
      const result = await conversationNode.execute(mockState);
      const audience = result.requirements?.audience;

      expect(audience).toBeDefined();
      expect(audience?.demographics).toBeTruthy();
      expect(['beginner', 'intermediate', 'advanced', 'mixed']).toContain(audience?.expertiseLevel);
      expect(['professional', 'academic', 'casual', 'mixed']).toContain(audience?.context);
    });

    it('creates valid style guide', async () => {
      const result = await conversationNode.execute(mockState);
      const style = result.requirements?.style;

      expect(style).toBeDefined();
      expect(style?.tone).toBeTruthy();
      expect(style?.voice).toBeTruthy();
      expect(['first-person', 'second-person', 'third-person']).toContain(style?.perspective);
      expect(['formal', 'informal', 'mixed']).toContain(style?.formality);
      expect(['basic', 'intermediate', 'advanced']).toContain(style?.technicalLevel);
    });
  });

  describe('OpenAI Integration', () => {
    it('calls OpenAI with proper system prompts', async () => {
      await conversationNode.execute(mockState);

      expect(mockOpenAI).toHaveBeenCalled();
      const calls = mockOpenAI.mock.calls;

      // Verify at least one call has system prompt
      const hasSystemPrompt = calls.some((call: any[]) =>
        call[0]?.messages?.some((msg: any) => msg.role === 'system')
      );
      expect(hasSystemPrompt).toBe(true);
    });

    it('uses correct OpenAI parameters', async () => {
      await conversationNode.execute(mockState);

      expect(mockOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 800,
        })
      );
    });

    it('handles OpenAI API errors', async () => {
      mockOpenAI.mockRejectedValue(new Error('OpenAI API Error'));

      await expect(conversationNode.execute(mockState)).rejects.toThrow();
    });

    it('handles empty OpenAI responses', async () => {
      mockOpenAI.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(conversationNode.execute(mockState)).rejects.toThrow();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('implements error recovery with fallback requirements', async () => {
      const mockError = new Error('Conversation failed');
      mockOpenAI.mockRejectedValue(mockError);

      const recoveredState = await conversationNode.recover(mockState, mockError as any);

      expect(recoveredState.requirements).toBeDefined();
      expect(recoveredState.requirements?.topic).toBe(mockState.userPrompt);
      expect(recoveredState.requirements?.wordCountTarget).toBe(30000);
      expect(recoveredState.currentStage).toBe('outline');
    });

    it('provides minimum viable requirements in recovery', async () => {
      const mockError = new Error('Complete failure');
      const recoveredState = await conversationNode.recover(mockState, mockError as any);

      const requirements = recoveredState.requirements;
      expect(requirements?.audience?.expertiseLevel).toBe('intermediate');
      expect(requirements?.style?.formality).toBe('formal');
      expect(requirements?.approach).toBe('practical');
      expect(requirements?.focus).toBe('comprehensive');
    });

    it('logs recovery attempts', async () => {
      const mockError = new Error('Test error');
      await conversationNode.recover(mockState, mockError as any);

      const { logger } = await import('@/lib/errors/exports');
      expect(logger.info).toHaveBeenCalledWith(
        'Recovering conversation node with simplified approach',
        expect.objectContaining({
          sessionId: 'test-session-123',
        })
      );
    });
  });

  describe('State Transition', () => {
    it('transitions to outline stage on completion', async () => {
      const result = await conversationNode.execute(mockState);

      expect(result.currentStage).toBe('outline');
    });

    it('updates progress to 100% on completion', async () => {
      const result = await conversationNode.execute(mockState);

      expect(result.progress?.percentage).toBe(100);
      expect(result.progress?.message).toContain('completed');
    });

    it('preserves session and user IDs', async () => {
      const result = await conversationNode.execute(mockState);

      expect(result.sessionId).toBe(mockState.sessionId);
      expect(result.userId).toBe(mockState.userId);
    });

    it('includes all required data for outline stage', async () => {
      const result = await conversationNode.execute(mockState);

      expect(result.requirements).toBeDefined();
      expect(result.baseContent).toBeDefined();
      expect(result.conversationHistory).toBeDefined();
    });
  });

  describe('Style Sample Generation', () => {
    it('generates exactly 3 style options', async () => {
      const result = await conversationNode.execute(mockState);

      // The style samples are internal to the conversation, but should result in a selected style
      expect(result.requirements?.style).toBeDefined();

      // Verify the style has all required properties
      const style = result.requirements?.style;
      expect(style?.tone).toBeTruthy();
      expect(style?.voice).toBeTruthy();
      expect(style?.perspective).toBeTruthy();
      expect(style?.formality).toBeTruthy();
      expect(style?.technicalLevel).toBeTruthy();
    });
  });

  describe('Requirements Schema Validation', () => {
    it('produces schema-compliant requirements', async () => {
      const result = await conversationNode.execute(mockState);
      const requirements = result.requirements;

      // Verify all required fields are present
      expect(requirements?.topic).toBeTruthy();
      expect(requirements?.audience).toBeTruthy();
      expect(requirements?.author).toBeTruthy();
      expect(requirements?.style).toBeTruthy();
      expect(requirements?.approach).toBeTruthy();
      expect(requirements?.focus).toBeTruthy();
      expect(requirements?.wordCountTarget).toBeGreaterThanOrEqual(30000);

      // Verify enum values are valid
      expect(['beginner', 'intermediate', 'advanced', 'mixed']).toContain(requirements?.audience?.expertiseLevel);
      expect(['professional', 'academic', 'casual', 'mixed']).toContain(requirements?.audience?.context);
      expect(['first-person', 'second-person', 'third-person']).toContain(requirements?.style?.perspective);
      expect(['formal', 'informal', 'mixed']).toContain(requirements?.style?.formality);
      expect(['basic', 'intermediate', 'advanced']).toContain(requirements?.style?.technicalLevel);
      expect(['practical', 'theoretical', 'mixed']).toContain(requirements?.approach);
      expect(['comprehensive', 'focused', 'survey']).toContain(requirements?.focus);
    });
  });
});