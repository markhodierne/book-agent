import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Next.js environment variables
process.env.NODE_ENV = 'test';

// Mock environment variables for testing
process.env.OPENAI_API_KEY = 'test-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-key';
process.env.FIRECRAWL_API_KEY = 'test-key';

// Mock timers by default for consistent test behavior
vi.useFakeTimers();

// Global test setup
beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();

  // Reset timers to real timers if needed for specific tests
  // Tests can call vi.useFakeTimers() again if they need fake timers
  vi.useRealTimers();
});

afterEach(() => {
  // Clean up after each test
  vi.clearAllMocks();
  vi.useRealTimers();
});