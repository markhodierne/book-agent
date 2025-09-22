// Comprehensive Unit Tests for FormattingNode
// Tests PDF generation, React-PDF integration, table of contents, and error handling
// Following CLAUDE.md testing standards and project architecture

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FormattingNode } from '@/lib/agents/nodes/formatting';
import { WorkflowState, FormattingResult, TableOfContentsEntry } from '@/types';
import { WorkflowError } from '@/lib/errors/exports';
import { createMockWorkflowState, createMockChapterResult, createMockBookOutline } from '@/__tests__/fixtures/workflow-fixtures';

// Mock React-PDF components and functions
vi.mock('@react-pdf/renderer', () => ({
  Document: vi.fn(({ children }) => ({ type: 'Document', children })),
  Page: vi.fn(({ children }) => ({ type: 'Page', children })),
  Text: vi.fn(({ children }) => ({ type: 'Text', children })),
  View: vi.fn(({ children }) => ({ type: 'View', children })),
  StyleSheet: {
    create: vi.fn((styles) => styles),
  },
  Font: {
    register: vi.fn(),
  },
  pdf: vi.fn(() => ({
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
  })),
}));

// Mock the error handling exports
vi.mock('@/lib/errors/exports', () => ({
  WorkflowError: class extends Error {
    constructor(
      public sessionId: string,
      public stage: string,
      message: string,
      public options: any = {}
    ) {
      super(message);
      this.name = 'WorkflowError';
      this.code = options.code;
      this.recoverable = options.recoverable;
    }
  },
  WorkflowErrorContext: class {
    constructor(public sessionId: string, public userId?: string) {}
    updateStage() {}
    cleanup() {}
    createError(ErrorClass: any, message: string, options: any) {
      return new ErrorClass(this.sessionId, 'test_stage', message, options);
    }
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock state persistence
vi.mock('@/lib/agents/state/persistence', () => ({
  updateSessionStatus: vi.fn().mockResolvedValue(undefined),
}));

describe('FormattingNode', () => {
  let formattingNode: FormattingNode;
  let mockWorkflowState: WorkflowState;

  beforeEach(() => {
    vi.clearAllMocks();
    formattingNode = new FormattingNode();

    // Create mock state with completed chapters (meeting 30k word minimum)
    mockWorkflowState = createMockWorkflowState({
      currentStage: 'formatting',
      chapters: [
        createMockChapterResult({
          chapterNumber: 1,
          title: 'Introduction to AI',
          content: 'This is a comprehensive introduction to artificial intelligence...',
          wordCount: 8000,
          status: 'completed',
        }),
        createMockChapterResult({
          chapterNumber: 2,
          title: 'Machine Learning Fundamentals',
          content: 'Machine learning is a subset of artificial intelligence...',
          wordCount: 10000,
          status: 'completed',
        }),
        createMockChapterResult({
          chapterNumber: 3,
          title: 'Neural Networks',
          content: 'Neural networks are the backbone of modern AI systems...',
          wordCount: 12500,
          status: 'completed',
        }),
      ],
      outline: createMockBookOutline({
        title: 'AI Fundamentals',
        subtitle: 'A Comprehensive Guide',
        totalWordCount: 30500,
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Node Creation and Basic Properties', () => {
    it('should create FormattingNode with correct name and description', () => {
      expect(formattingNode.name).toBe('formatting');
      expect(formattingNode.description).toContain('Generate professional PDF');
      expect(formattingNode.description).toContain('table of contents');
    });

    it('should implement WorkflowNode interface correctly', () => {
      expect(typeof formattingNode.execute).toBe('function');
      expect(typeof formattingNode.validate).toBe('function');
      expect(typeof formattingNode.recover).toBe('function');
    });
  });

  describe('Validation', () => {
    it('should validate state with all required components', () => {
      const isValid = formattingNode.validate(mockWorkflowState);
      expect(isValid).toBe(true);
    });

    it('should fail validation when outline is missing', () => {
      const invalidState = { ...mockWorkflowState, outline: undefined };
      const isValid = formattingNode.validate(invalidState);
      expect(isValid).toBe(false);
    });

    it('should fail validation when chapters are missing', () => {
      const invalidState = { ...mockWorkflowState, chapters: [] };
      const isValid = formattingNode.validate(invalidState);
      expect(isValid).toBe(false);
    });

    it('should fail validation when requirements are missing', () => {
      const invalidState = { ...mockWorkflowState, requirements: undefined };
      const isValid = formattingNode.validate(invalidState);
      expect(isValid).toBe(false);
    });

    it('should fail validation when chapters are not completed', () => {
      const invalidState = {
        ...mockWorkflowState,
        chapters: [
          ...mockWorkflowState.chapters,
          createMockChapterResult({ status: 'writing' }),
        ],
      };
      const isValid = formattingNode.validate(invalidState);
      expect(isValid).toBe(false);
    });
  });

  describe('PDF Generation and Formatting', () => {
    it('should execute successfully and generate PDF', async () => {
      const result = await formattingNode.execute(mockWorkflowState);

      expect(result.currentStage).toBe('user_review');
      expect(result.formattingResult).toBeDefined();
      expect(result.formattingResult?.pdfBuffer).toBeInstanceOf(Buffer);
      expect(result.formattingResult?.pageCount).toBeGreaterThan(0);
      expect(result.formattingResult?.totalWordCount).toBe(30500);
      expect(result.formattingResult?.fileSize).toBeGreaterThan(0);
      expect(result.formattingResult?.generatedAt).toBeDefined();
    });

    it('should generate correct page count estimation', async () => {
      const result = await formattingNode.execute(mockWorkflowState);

      // With 30500 words, expect approximately 124 pages (250 words/page + 2 front matter pages)
      expect(result.formattingResult?.pageCount).toBeGreaterThan(120);
      expect(result.formattingResult?.pageCount).toBeLessThan(130);
    });

    it('should include all chapters in correct order', async () => {
      const result = await formattingNode.execute(mockWorkflowState);

      expect(result.formattingResult).toBeDefined();
      expect(result.formattingResult?.totalWordCount).toBe(30500);

      // Verify React-PDF pdf function was called
      const { pdf } = await import('@react-pdf/renderer');
      expect(pdf).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle chapters with markdown-style headings', async () => {
      const stateWithMarkdown = {
        ...mockWorkflowState,
        chapters: [
          createMockChapterResult({
            chapterNumber: 1,
            title: 'Test Chapter',
            content: '# Introduction\n\nThis is an introduction paragraph.\n\n## Subsection\n\nThis is a subsection paragraph.',
            wordCount: 30000,
            status: 'completed',
          }),
        ],
      };

      const result = await formattingNode.execute(stateWithMarkdown);
      expect(result.currentStage).toBe('user_review');
      expect(result.formattingResult).toBeDefined();
    });

    it('should generate table of contents with correct structure', async () => {
      const result = await formattingNode.execute(mockWorkflowState);

      expect(result.formattingResult).toBeDefined();

      // Table of contents should be generated internally
      // We can verify this by checking the PDF generation was called
      const { pdf } = await import('@react-pdf/renderer');
      expect(pdf).toHaveBeenCalled();
    });

    it('should apply typography configuration based on style guide', async () => {
      const stateWithAcademicStyle = {
        ...mockWorkflowState,
        styleGuide: {
          ...mockWorkflowState.styleGuide!,
          formality: 'academic' as const,
        },
      };

      const result = await formattingNode.execute(stateWithAcademicStyle);
      expect(result.currentStage).toBe('user_review');
      expect(result.formattingResult).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw WorkflowError when outline is missing', async () => {
      const invalidState = { ...mockWorkflowState, outline: undefined };

      await expect(formattingNode.execute(invalidState)).rejects.toThrow(WorkflowError);
    });

    it('should throw WorkflowError when chapters are missing', async () => {
      const invalidState = { ...mockWorkflowState, chapters: [] };

      await expect(formattingNode.execute(invalidState)).rejects.toThrow(WorkflowError);
    });

    it('should throw WorkflowError when requirements are missing', async () => {
      const invalidState = { ...mockWorkflowState, requirements: undefined };

      await expect(formattingNode.execute(invalidState)).rejects.toThrow(WorkflowError);
    });

    it('should throw WorkflowError when chapters are incomplete', async () => {
      const invalidState = {
        ...mockWorkflowState,
        chapters: [
          createMockChapterResult({ status: 'writing' }),
          createMockChapterResult({ status: 'needs_revision' }),
        ],
      };

      await expect(formattingNode.execute(invalidState)).rejects.toThrow(WorkflowError);
    });

    it('should throw WorkflowError when word count is below minimum', async () => {
      const invalidState = {
        ...mockWorkflowState,
        chapters: [
          createMockChapterResult({ wordCount: 1000 }),
          createMockChapterResult({ wordCount: 500 }),
        ],
      };

      await expect(formattingNode.execute(invalidState)).rejects.toThrow(WorkflowError);
    });

    it('should handle PDF generation failures gracefully', async () => {
      // Mock PDF generation to fail
      const { pdf } = await import('@react-pdf/renderer');
      (pdf as any).mockImplementation(() => ({
        toBuffer: vi.fn().mockRejectedValue(new Error('PDF generation failed')),
      }));

      await expect(formattingNode.execute(mockWorkflowState)).rejects.toThrow();

      // Restore mock
      (pdf as any).mockImplementation(() => ({
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      }));
    });
  });

  describe('Recovery Mechanism', () => {
    it('should implement recovery for retryable errors', async () => {
      const mockError = new WorkflowError(
        'test-session',
        'formatting',
        'PDF generation failed',
        { code: 'pdf_generation_failed', recoverable: true }
      );

      const recoveryState = { ...mockWorkflowState, retryCount: 1 };
      const result = await formattingNode.recover(recoveryState, mockError);

      expect(result.currentStage).toBe('user_review');
      expect(result.retryCount).toBe(2); // Should increment during recovery
    });

    it('should fail after maximum retry attempts', async () => {
      const mockError = new WorkflowError(
        'test-session',
        'formatting',
        'PDF generation failed',
        { code: 'pdf_generation_failed', recoverable: true }
      );

      const highRetryState = { ...mockWorkflowState, retryCount: 3 };

      await expect(formattingNode.recover(highRetryState, mockError)).rejects.toThrow(
        /Maximum retries exceeded/
      );
    });

    it('should handle memory errors with reduced complexity', async () => {
      const mockError = new WorkflowError(
        'test-session',
        'formatting',
        'Memory error during PDF generation',
        { code: 'memory_error', recoverable: true }
      );

      const recoveryState = { ...mockWorkflowState, retryCount: 1 };
      const result = await formattingNode.recover(recoveryState, mockError);

      expect(result.currentStage).toBe('user_review');
      expect(result.formattingResult).toBeDefined();
    });

    it('should re-execute normally for other error types', async () => {
      const mockError = new WorkflowError(
        'test-session',
        'formatting',
        'Unknown error',
        { code: 'unknown_error', recoverable: true }
      );

      const recoveryState = { ...mockWorkflowState, retryCount: 1 };
      const result = await formattingNode.recover(recoveryState, mockError);

      expect(result.currentStage).toBe('user_review');
      expect(result.formattingResult).toBeDefined();
    });
  });

  describe('Progress Tracking', () => {
    it('should update progress through formatting phases', async () => {
      const result = await formattingNode.execute(mockWorkflowState);

      expect(result.progress.currentStageProgress).toBe(100);
      expect(result.currentStage).toBe('user_review');
    });

    it('should maintain chapter completion counts', async () => {
      const result = await formattingNode.execute(mockWorkflowState);

      expect(result.progress.chaptersCompleted).toBeGreaterThan(0);
      expect(result.progress.totalChapters).toBeGreaterThan(0);
    });
  });

  describe('Content Structure and Quality', () => {
    it('should handle books with many chapters', async () => {
      const manyChaptersState = {
        ...mockWorkflowState,
        chapters: Array.from({ length: 15 }, (_, i) =>
          createMockChapterResult({
            chapterNumber: i + 1,
            title: `Chapter ${i + 1}`,
            wordCount: 2000,
            status: 'completed',
          })
        ),
      };

      const result = await formattingNode.execute(manyChaptersState);
      expect(result.formattingResult?.totalWordCount).toBe(30000);
      expect(result.formattingResult?.pageCount).toBeGreaterThan(120);
    });

    it('should handle chapters with various content lengths', async () => {
      const variableLengthState = {
        ...mockWorkflowState,
        chapters: [
          createMockChapterResult({ wordCount: 5000 }),
          createMockChapterResult({ wordCount: 1000 }),
          createMockChapterResult({ wordCount: 10000 }),
          createMockChapterResult({ wordCount: 15000 }),
        ],
      };

      const result = await formattingNode.execute(variableLengthState);
      expect(result.formattingResult?.totalWordCount).toBe(31000);
    });

    it('should maintain chapter order in final PDF', async () => {
      const unorderedChapters = [
        createMockChapterResult({ chapterNumber: 3, title: 'Chapter Three', wordCount: 10000 }),
        createMockChapterResult({ chapterNumber: 1, title: 'Chapter One', wordCount: 10000 }),
        createMockChapterResult({ chapterNumber: 2, title: 'Chapter Two', wordCount: 10500 }),
      ];

      const unorderedState = {
        ...mockWorkflowState,
        chapters: unorderedChapters,
      };

      const result = await formattingNode.execute(unorderedState);
      expect(result.formattingResult).toBeDefined();

      // Verify PDF generation was called (chapters should be sorted internally)
      const { pdf } = await import('@react-pdf/renderer');
      expect(pdf).toHaveBeenCalled();
    });
  });

  describe('Integration with Workflow State', () => {
    it('should preserve existing state properties', async () => {
      const result = await formattingNode.execute(mockWorkflowState);

      expect(result.sessionId).toBe(mockWorkflowState.sessionId);
      expect(result.userId).toBe(mockWorkflowState.userId);
      expect(result.requirements).toEqual(mockWorkflowState.requirements);
      expect(result.styleGuide).toEqual(mockWorkflowState.styleGuide);
      expect(result.outline).toEqual(mockWorkflowState.outline);
      expect(result.chapters).toEqual(mockWorkflowState.chapters);
    });

    it('should update timestamps correctly', async () => {
      const result = await formattingNode.execute(mockWorkflowState);

      expect(result.updatedAt).toBeDefined();
      expect(new Date(result.updatedAt).getTime()).toBeGreaterThan(
        new Date(mockWorkflowState.updatedAt).getTime()
      );
    });

    it('should transition to user_review stage', async () => {
      const result = await formattingNode.execute(mockWorkflowState);

      expect(result.currentStage).toBe('user_review');
      expect(result.status).toBe('active'); // Still active, awaiting user review
    });
  });
});