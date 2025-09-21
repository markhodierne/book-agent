// OpenAI Client Configuration
// Centralized OpenAI client setup with error handling and validation
// Following CLAUDE.md standards and environment configuration

import OpenAI from 'openai';
import { validateEnvironment, getEnvironmentConfig } from './environment';

// Validate environment on import
validateEnvironment();

const config = getEnvironmentConfig();

/**
 * Configured OpenAI client instance
 * Uses GPT-4o-mini as specified in CLAUDE.md for cost-effective high-quality generation
 */
export const openai = new OpenAI({
  apiKey: config.openaiApiKey,
  timeout: 120000, // 2 minutes timeout
  maxRetries: 2,   // Limited retries for expensive operations
});

/**
 * Default OpenAI parameters for book generation
 * Optimized for consistent, high-quality content generation
 */
export const defaultOpenAIParams = {
  model: 'gpt-4o-mini' as const,
  temperature: 0.7,    // Balanced creativity and consistency
  top_p: 0.9,         // Focus on high-probability tokens
  frequency_penalty: 0.1,  // Slight penalty for repetition
  presence_penalty: 0.1,   // Encourage topic diversity
} as const;

/**
 * Validate OpenAI connection and API key
 */
export async function validateOpenAIConnection(): Promise<boolean> {
  try {
    // Test with minimal API call
    const response = await openai.models.list();
    return response.data.length > 0;
  } catch (error) {
    console.error('OpenAI connection validation failed:', error);
    return false;
  }
}