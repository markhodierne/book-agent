const requiredEnvVars = [
  'OPENAI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'FIRECRAWL_API_KEY'
] as const;

export function validateEnvironment(): void {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

export interface EnvironmentConfig {
  OPENAI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  FIRECRAWL_API_KEY: string;
  NODE_ENV: string;
}

export function getEnvironmentConfig(): EnvironmentConfig {
  validateEnvironment();

  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    SUPABASE_URL: process.env.SUPABASE_URL!,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY!,
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
}