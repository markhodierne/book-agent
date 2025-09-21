// GPT-5 Mini Agent Wrapper
// Hybrid approach: OpenAI Agents SDK for GPT-5 mini calls within LangGraph workflows
// Handles new GPT-5 parameters (reasoning_effort, verbosity) automatically

import { Agent, run } from '@openai/agents';
import { validateEnvironment, getEnvironmentConfig } from '@/lib/config/environment';
import {
  WorkflowError,
  WorkflowErrorContext,
  logger,
  withRetry,
  retryAPI,
} from '@/lib/errors/exports';

// Validate environment on import
validateEnvironment();

const config = getEnvironmentConfig();

/**
 * GPT-5 Mini Agent Configuration
 */
export interface GPT5AgentConfig {
  name: string;
  instructions: string;
  reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
  temperature?: number;
  max_tokens?: number;
}

/**
 * GPT-5 Mini Agent Response
 */
export interface GPT5Response {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  reasoning?: string; // GPT-5 reasoning process if available
}

/**
 * GPT-5 Mini Agent Wrapper Class
 * Provides simplified interface for GPT-5 mini calls within LangGraph workflows
 */
export class GPT5Agent {
  private agent: Agent;
  private config: GPT5AgentConfig;

  constructor(config: GPT5AgentConfig) {
    this.config = config;

    // Create OpenAI Agent with GPT-5 mini specific configuration
    this.agent = new Agent({
      name: config.name,
      instructions: config.instructions,
      model: 'gpt-5-mini-2025-08-07',
      // GPT-5 specific parameters
      reasoning_effort: config.reasoning_effort || 'medium',
      verbosity: config.verbosity || 'medium',
      temperature: config.temperature || 0.7,
      max_tokens: config.max_tokens || 2000,
    });

    logger.info('GPT-5 Agent created', {
      name: config.name,
      reasoning_effort: config.reasoning_effort || 'medium',
      verbosity: config.verbosity || 'medium',
    });
  }

  /**
   * Execute GPT-5 mini call with error handling and retry logic
   */
  async execute(
    prompt: string,
    errorContext?: WorkflowErrorContext
  ): Promise<GPT5Response> {
    const sessionId = errorContext?.sessionId || 'unknown';

    try {
      logger.info('Executing GPT-5 agent', {
        sessionId,
        agentName: this.config.name,
        promptLength: prompt.length,
      });

      // Use retry logic for API calls
      const result = await retryAPI(async () => {
        return await run(this.agent, prompt);
      });

      // Extract response data
      const response: GPT5Response = {
        content: result.finalOutput || '',
        usage: result.usage,
        reasoning: result.reasoning, // GPT-5 reasoning trace if available
      };

      logger.info('GPT-5 agent execution completed', {
        sessionId,
        agentName: this.config.name,
        contentLength: response.content.length,
        tokensUsed: response.usage?.total_tokens,
      });

      return response;

    } catch (error) {
      logger.error('GPT-5 agent execution failed', {
        sessionId,
        agentName: this.config.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new WorkflowError(
        'gpt5_agent_failure',
        `GPT-5 agent '${this.config.name}' execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          agentName: this.config.name,
          recoverable: true,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Update agent configuration
   */
  updateConfig(updates: Partial<GPT5AgentConfig>): void {
    this.config = { ...this.config, ...updates };

    // Recreate agent with new configuration
    this.agent = new Agent({
      name: this.config.name,
      instructions: this.config.instructions,
      model: 'gpt-5-mini-2025-08-07',
      reasoning_effort: this.config.reasoning_effort || 'medium',
      verbosity: this.config.verbosity || 'medium',
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.max_tokens || 2000,
    });

    logger.info('GPT-5 Agent configuration updated', {
      name: this.config.name,
      updates,
    });
  }

  /**
   * Get current agent configuration
   */
  getConfig(): GPT5AgentConfig {
    return { ...this.config };
  }
}

/**
 * Factory function for creating specialized GPT-5 agents
 */
export function createGPT5Agent(config: GPT5AgentConfig): GPT5Agent {
  return new GPT5Agent(config);
}

/**
 * Pre-configured agents for common book generation tasks
 */
export const BookGenerationAgents = {
  /**
   * Title Generation Agent
   */
  titleGenerator: () => createGPT5Agent({
    name: 'Title Generator',
    instructions: `You are an expert book title generator with extensive experience in publishing and marketing. Your task is to create compelling, marketable book titles that accurately reflect the content and appeal to the target audience.

Generate exactly 5 title options that are:
- Specific, memorable, and engaging
- 3-12 words long
- Include subtitles where appropriate to clarify scope or benefits
- Avoid generic terms; be specific to the topic and value proposition

Format your response as a numbered list:
1. [Title]: [Optional Subtitle]
2. [Title]: [Optional Subtitle]
...`,
    reasoning_effort: 'medium',
    verbosity: 'medium',
    temperature: 0.8,
  }),

  /**
   * Chapter Structure Planning Agent
   */
  structurePlanner: () => createGPT5Agent({
    name: 'Structure Planner',
    instructions: `You are a professional book structuring specialist with expertise in creating logical, comprehensive chapter organizations. Your task is to plan the optimal chapter structure for books.

Plan 8-25 chapters based on content complexity and scope:
- Distribute word counts logically (1,000-2,500 words per chapter typical)
- Create logical progression from foundational to advanced topics
- Consider chapter dependencies and logical flow between topics

Format your response as:
TOTAL CHAPTERS: [number]
WORD DISTRIBUTION: [comma-separated word counts for each chapter]
CHAPTER TITLES:
1. [Chapter 1 Title]
2. [Chapter 2 Title]
...`,
    reasoning_effort: 'high', // Need thorough structural planning
    verbosity: 'medium',
    temperature: 0.7,
  }),

  /**
   * Chapter Outline Creation Agent
   */
  outlineCreator: () => createGPT5Agent({
    name: 'Outline Creator',
    instructions: `You are a professional book outline specialist creating detailed chapter specifications for parallel generation. Each chapter outline must be comprehensive and self-contained to enable independent writing.

Provide:
- Detailed content overview (2-3 sentences)
- 3-5 specific learning objectives or key points to cover
- Research requirements (external sources needed)
- Dependencies on other chapters (reference by number)

Format your response as:
CONTENT OVERVIEW: [2-3 sentence description]
KEY OBJECTIVES:
- [Objective 1]
- [Objective 2]
- [Objective 3]
RESEARCH REQUIREMENTS:
- [Research need 1]
- [Research need 2]
DEPENDENCIES: [Chapter numbers this depends on, or "None"]`,
    reasoning_effort: 'high', // Need detailed planning
    verbosity: 'medium',
    temperature: 0.7,
  }),

  /**
   * Requirements Gathering Agent
   */
  requirementsGatherer: () => createGPT5Agent({
    name: 'Requirements Gatherer',
    instructions: `You are an expert book consultation specialist who helps authors clarify their book vision through guided conversation. Your goal is to extract comprehensive book requirements through natural dialogue.

Ask focused questions to understand:
- Topic scope and specific angles
- Target audience demographics and expertise level
- Author background and goals
- Desired writing style and approach
- Content orientation and engagement strategy

Be conversational, insightful, and help users think through their book concept thoroughly.`,
    reasoning_effort: 'medium',
    verbosity: 'medium',
    temperature: 0.8, // More conversational
  }),

  /**
   * Chapter Content Generator Agent
   */
  chapterWriter: () => createGPT5Agent({
    name: 'Chapter Writer',
    instructions: `You are a professional book writer specializing in creating comprehensive, engaging chapter content. Your task is to write complete chapters that match specified requirements exactly.

Follow the provided:
- Style guide and tone requirements
- Word count targets (±15% acceptable)
- Chapter outline and objectives
- Target audience expertise level

Create well-structured content with:
- Clear section headings and organization
- Practical examples and actionable insights
- Smooth transitions between concepts
- Engaging introduction and strong conclusion`,
    reasoning_effort: 'high', // Need deep content generation
    verbosity: 'high', // Generate comprehensive content
    temperature: 0.7,
    max_tokens: 4000, // Longer content generation
  }),
};