/**
 * Test fixtures for the Book Agent application
 * Provides mock data and utilities for testing
 */

import { vi } from 'vitest';
import type { WorkflowState, ChapterConfig, BookRequirements } from '@/types';

// Mock book requirements for testing
export const mockBookRequirements: BookRequirements = {
  topic: 'Introduction to TypeScript',
  audience: {
    level: 'beginner',
    background: 'software development',
    goals: ['learn TypeScript basics', 'understand type system'],
  },
  styleGuide: {
    tone: 'professional',
    format: 'tutorial',
    length: 'medium',
  },
};

// Mock chapter configuration
export const mockChapterConfig: ChapterConfig = {
  number: 1,
  title: 'Getting Started with TypeScript',
  wordTarget: 2000,
  dependencies: [],
  outline: [
    'Introduction to TypeScript',
    'Installation and Setup',
    'Basic Types',
    'First TypeScript Program',
  ],
};

// Mock workflow state
export const mockWorkflowState: WorkflowState = {
  sessionId: 'test-session-123',
  userId: 'test-user-456',
  currentStage: 'conversation',
  bookRequirements: mockBookRequirements,
  chapters: [],
  currentChapter: mockChapterConfig,
  progress: {
    totalChapters: 5,
    completedChapters: 0,
    currentChapterProgress: 0,
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

// Mock PDF buffer for testing
export const mockPdfBuffer = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000079 00000 n \n0000000173 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n253\n%%EOF'
);

// Mock API responses
export const mockApiResponses = {
  openai: {
    completion: {
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4-mini',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant' as const,
            content: 'Mock response from OpenAI',
          },
          finish_reason: 'stop' as const,
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    },
  },
  firecrawl: {
    crawl: {
      success: true,
      data: {
        markdown: '# Test Page\n\nThis is a test page content.',
        metadata: {
          title: 'Test Page',
          description: 'A test page for web crawling',
          url: 'https://example.com/test',
        },
      },
    },
  },
};

// Mock Supabase responses
export const mockSupabaseResponses = {
  select: {
    data: [mockChapterConfig],
    error: null,
  },
  insert: {
    data: [mockChapterConfig],
    error: null,
  },
  update: {
    data: [mockChapterConfig],
    error: null,
  },
  delete: {
    data: null,
    error: null,
  },
};

// Test utilities
export const testUtils = {
  // Create a mock function that tracks calls
  createMockFn: <T extends (...args: any[]) => any>(returnValue?: ReturnType<T>) => {
    const fn = vi.fn();
    if (returnValue !== undefined) {
      fn.mockReturnValue(returnValue);
    }
    return fn as T;
  },

  // Create a mock async function
  createMockAsyncFn: <T extends (...args: any[]) => Promise<any>>(
    returnValue?: Awaited<ReturnType<T>>
  ) => {
    const fn = vi.fn();
    if (returnValue !== undefined) {
      fn.mockResolvedValue(returnValue);
    }
    return fn as T;
  },

  // Wait for a specific amount of time
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate a random test ID
  generateTestId: () => `test-${Math.random().toString(36).substr(2, 9)}`,
};