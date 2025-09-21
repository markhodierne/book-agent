// Configuration Test Fixtures
// Mock environment and configuration data for testing

import { EnvironmentConfig } from '@/types';

/**
 * Mock environment configuration for testing
 */
export const mockEnvironmentConfig: EnvironmentConfig = {
  openai: {
    apiKey: 'test-openai-key',
    model: 'gpt-5-mini-2025-08-07',
    maxTokens: 4000,
    temperature: 0.7,
  },
  supabase: {
    url: 'https://test-project.supabase.co',
    anonKey: 'test-anon-key',
    serviceRoleKey: 'test-service-key',
  },
  firecrawl: {
    apiKey: 'test-firecrawl-key',
    baseUrl: 'https://api.firecrawl.dev',
  },
  app: {
    nodeEnv: 'test',
    logLevel: 'info',
    enableMetrics: false,
    enableAnalytics: false,
  },
};

/**
 * Create mock environment variables for testing
 */
export function createMockEnvVars(): Record<string, string> {
  return {
    OPENAI_API_KEY: mockEnvironmentConfig.openai.apiKey,
    SUPABASE_URL: mockEnvironmentConfig.supabase.url,
    SUPABASE_ANON_KEY: mockEnvironmentConfig.supabase.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: mockEnvironmentConfig.supabase.serviceRoleKey || '',
    FIRECRAWL_API_KEY: mockEnvironmentConfig.firecrawl.apiKey,
    NODE_ENV: mockEnvironmentConfig.app.nodeEnv,
  };
}

/**
 * Mock invalid environment configuration for error testing
 */
export const mockInvalidEnvironmentConfig = {
  openai: {
    apiKey: '', // Invalid: empty
    model: 'gpt-5-mini-2025-08-07',
  },
  supabase: {
    url: 'invalid-url', // Invalid: not a proper URL
    anonKey: 'test-anon-key',
  },
  firecrawl: {
    apiKey: '', // Invalid: empty
  },
  app: {
    nodeEnv: 'production',
    logLevel: 'debug',
  },
};