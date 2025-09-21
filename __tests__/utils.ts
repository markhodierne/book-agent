/**
 * Test utilities for the Book Agent application
 * Provides common testing helpers and setup functions
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

// Mock environment setup
export function setupTestEnvironment() {
  // Mock Next.js environment
  vi.mock('next/navigation', () => ({
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => '/test-path',
    useSearchParams: () => new URLSearchParams(),
  }));

  // Mock Supabase client
  vi.mock('@/lib/database/client', () => ({
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({ data: [], error: null }),
        insert: vi.fn().mockReturnValue({ data: [], error: null }),
        update: vi.fn().mockReturnValue({ data: [], error: null }),
        delete: vi.fn().mockReturnValue({ data: null, error: null }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      })),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: null, error: null }),
          download: vi.fn().mockResolvedValue({ data: null, error: null }),
          remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      },
    },
  }));

  // Mock OpenAI client
  vi.mock('@/lib/ai/client', () => ({
    openai: {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'Mock AI response' } }],
          }),
        },
      },
    },
  }));

  // Mock LangGraph
  vi.mock('@langchain/langgraph', () => ({
    StateGraph: vi.fn(() => ({
      addNode: vi.fn().mockReturnThis(),
      addEdge: vi.fn().mockReturnThis(),
      setEntryPoint: vi.fn().mockReturnThis(),
      setFinishPoint: vi.fn().mockReturnThis(),
      compile: vi.fn(() => ({
        invoke: vi.fn().mockResolvedValue({}),
        stream: vi.fn().mockReturnValue(async function* () {
          yield { step: 'test', data: {} };
        }),
      })),
    })),
    START: 'START',
    END: 'END',
  }));
}

// React Testing Library utilities
export function setupReactTestingEnvironment() {
  // Mock React Query
  vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(() => ({
      data: null,
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    })),
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      isLoading: false,
      error: null,
    })),
    QueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
      setQueryData: vi.fn(),
      getQueryData: vi.fn(),
    })),
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  }));

  // Mock Zustand store
  vi.mock('@/lib/state/store', () => ({
    useBookStore: vi.fn(() => ({
      currentSession: null,
      setCurrentSession: vi.fn(),
      updateProgress: vi.fn(),
      addChapter: vi.fn(),
    })),
  }));
}

// Custom matchers for testing
export const customMatchers = {
  // Check if an error has the expected structure
  toBeValidError: (received: any, expectedType: string) => {
    const pass = received &&
                 received.name === expectedType &&
                 typeof received.message === 'string' &&
                 received.timestamp instanceof Date;

    return {
      pass,
      message: () => pass
        ? `Expected error not to be valid ${expectedType}`
        : `Expected error to be valid ${expectedType}, received: ${JSON.stringify(received)}`,
    };
  },

  // Check if a workflow state is valid
  toBeValidWorkflowState: (received: any) => {
    const pass = received &&
                 typeof received.sessionId === 'string' &&
                 typeof received.userId === 'string' &&
                 typeof received.currentStage === 'string' &&
                 Array.isArray(received.chapters);

    return {
      pass,
      message: () => pass
        ? 'Expected workflow state not to be valid'
        : `Expected workflow state to be valid, received: ${JSON.stringify(received)}`,
    };
  },
};

// Test data generators
export const generators = {
  // Generate a random session ID
  sessionId: () => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  // Generate a random user ID
  userId: () => `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  // Generate mock chapter data
  chapter: (overrides = {}) => ({
    number: 1,
    title: 'Test Chapter',
    wordTarget: 2000,
    dependencies: [],
    outline: ['Section 1', 'Section 2'],
    ...overrides,
  }),

  // Generate mock book requirements
  bookRequirements: (overrides = {}) => ({
    topic: 'Test Topic',
    audience: {
      level: 'beginner',
      background: 'general',
      goals: ['learn', 'understand'],
    },
    styleGuide: {
      tone: 'professional',
      format: 'tutorial',
      length: 'medium',
    },
    ...overrides,
  }),
};

// Async test helpers
export const asyncHelpers = {
  // Wait for condition to be true
  waitFor: async (condition: () => boolean, timeout = 5000) => {
    const start = Date.now();
    while (!condition() && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
  },

  // Flush all pending promises
  flushPromises: () => new Promise(resolve => setTimeout(resolve, 0)),
};

// Mock factory functions
export const createMockTool = (name: string, result: any = 'mock result') => ({
  name,
  description: `Mock tool: ${name}`,
  execute: vi.fn().mockResolvedValue(result),
  parameters: {},
});

export const createMockAgent = (result: any = {}) => ({
  invoke: vi.fn().mockResolvedValue(result),
  stream: vi.fn().mockReturnValue(async function* () {
    yield result;
  }),
});

// Test cleanup utilities
export const cleanup = {
  // Reset all mocks
  resetMocks: () => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  },

  // Reset environment
  resetEnvironment: () => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  },
};