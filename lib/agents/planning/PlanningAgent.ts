// Planning Agent for Adaptive Strategy Selection
// Follows CLAUDE.md standards: GPT-5 mini integration, error handling, and state management
// MVP Task 2: Basic Planning Agent Foundation

import { createGPT5Agent, GPT5Agent, GPT5Response } from '@/lib/agents/gpt5-wrapper';
import {
  PlanningContext,
  ContentComplexity,
  ExecutionStrategy,
  ContentApproach,
  ResearchIntensity,
  WorkflowState,
} from '@/types';
import {
  WorkflowError,
  WorkflowErrorContext,
  logger,
} from '@/lib/errors/exports';

/**
 * Analysis result from planning agent
 */
export interface PlanningAnalysis {
  complexity: ContentComplexity;
  topicCategory: string;
  estimatedWordCount: number;
  strategy: ExecutionStrategy;
  approach: ContentApproach;
  chapterCount: number;
  estimatedDuration: number;
  researchIntensity: ResearchIntensity;
  adaptationTriggers: string[];
  reasoning?: string;
}

/**
 * Planning request parameters
 */
export interface PlanningRequest {
  userPrompt: string;
  baseContent?: string;
  targetWordCount?: number;
  constraints?: string[];
  preferences?: any;
}

/**
 * Master Planning Agent for adaptive book generation strategy
 * MVP Scope: Basic complexity analysis and strategy selection
 */
export class PlanningAgent {
  private agent: GPT5Agent;

  constructor() {
    this.agent = createGPT5Agent({
      name: 'Master Planner',
      instructions: `You are an expert book production planner with deep knowledge of content creation workflows. Your role is to analyze user requirements and create optimal execution strategies for generating comprehensive books.

Your responsibilities:
- Analyze content complexity and determine optimal chapter structure
- Choose between different generation strategies based on topic and audience
- Allocate resources (research time, generation complexity, review cycles)
- Create adaptive plans that can adjust based on intermediate results
- Identify potential challenges and prepare contingency strategies

COMPLEXITY ANALYSIS CRITERIA:
- SIMPLE: Basic topics, straightforward content, minimal research needed (e.g., basic tutorials, introductory guides)
- MODERATE: Standard topics requiring some research and domain knowledge (e.g., professional how-to guides, business topics)
- COMPLEX: Advanced topics requiring extensive research and expertise (e.g., technical manuals, scientific topics)
- EXPERT: Highly specialized requiring domain expertise and comprehensive research (e.g., academic texts, professional certifications)

STRATEGY SELECTION:
- SEQUENTIAL: Generate chapters one by one (safer, better for complex dependencies)
- PARALLEL: Generate multiple chapters simultaneously (faster, suitable for independent topics)
- HYBRID: Mix approach based on chapter dependencies

APPROACH SELECTION:
- STANDARD: Balanced approach for most topics
- RESEARCH_HEAVY: Focus on external research and sources (academic, technical topics)
- NARRATIVE_FOCUSED: Emphasis on storytelling and flow (creative, case-study content)
- TECHNICAL_DEEP: Deep technical content with precision (programming, engineering)
- PRACTICAL_GUIDE: Step-by-step actionable guidance (tutorials, how-to books)

Format your response as JSON with:
{
  "complexity": "[simple|moderate|complex|expert]",
  "topicCategory": "[brief category description]",
  "estimatedWordCount": [number],
  "strategy": "[sequential|parallel|hybrid]",
  "approach": "[standard|research_heavy|narrative_focused|technical_deep|practical_guide]",
  "chapterCount": [8-25],
  "estimatedDuration": [minutes],
  "researchIntensity": "[minimal|moderate|extensive|expert]",
  "adaptationTriggers": ["trigger1", "trigger2"],
  "reasoning": "[brief explanation of decisions]"
}`,
      reasoning_effort: 'high',
      verbosity: 'medium'
    });
  }

  /**
   * Analyze user requirements and generate planning strategy
   */
  async createPlan(
    request: PlanningRequest,
    errorContext?: WorkflowErrorContext
  ): Promise<PlanningAnalysis> {
    try {
      logger.info('Creating planning strategy', {
        sessionId: errorContext?.sessionId,
        promptLength: request.userPrompt.length,
        hasBaseContent: !!request.baseContent,
      });

      const prompt = this.buildPlanningPrompt(request);
      const response = await this.agent.execute(prompt, errorContext);

      const analysis = this.parsePlanningResponse(response);

      logger.info('Planning strategy created', {
        sessionId: errorContext?.sessionId,
        complexity: analysis.complexity,
        strategy: analysis.strategy,
        chapterCount: analysis.chapterCount,
      });

      return analysis;

    } catch (error) {
      logger.error('Planning agent execution failed', {
        sessionId: errorContext?.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (errorContext) {
        throw errorContext.createError(WorkflowError, `Planning agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          code: 'planning_agent_failure',
          recoverable: true,
          cause: error instanceof Error ? error : undefined,
        });
      }

      throw error;
    }
  }

  /**
   * Build comprehensive prompt for planning analysis
   */
  private buildPlanningPrompt(request: PlanningRequest): string {
    let prompt = `Analyze the following book requirements and create an optimal generation plan:

USER PROMPT: "${request.userPrompt}"`;

    if (request.baseContent) {
      prompt += `\n\nBASE CONTENT PROVIDED: ${request.baseContent.length} characters of source material`;
    }

    if (request.targetWordCount) {
      prompt += `\n\nTARGET WORD COUNT: ${request.targetWordCount} words`;
    }

    if (request.constraints && request.constraints.length > 0) {
      prompt += `\n\nCONSTRAINTS: ${request.constraints.join(', ')}`;
    }

    prompt += `\n\nProvide a comprehensive planning analysis in the specified JSON format, considering:
1. Content complexity and research requirements
2. Optimal chapter structure and dependencies
3. Resource allocation and time estimation
4. Strategy adaptation triggers for quality maintenance`;

    return prompt;
  }

  /**
   * Parse and validate planning response from GPT-5
   */
  private parsePlanningResponse(response: GPT5Response): PlanningAnalysis {
    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in planning response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      const analysis: PlanningAnalysis = {
        complexity: this.validateComplexity(parsed.complexity),
        topicCategory: parsed.topicCategory || 'General',
        estimatedWordCount: Math.max(5000, parsed.estimatedWordCount || 30000),
        strategy: this.validateStrategy(parsed.strategy),
        approach: this.validateApproach(parsed.approach),
        chapterCount: Math.min(Math.max(8, parsed.chapterCount || 12), 25),
        estimatedDuration: Math.max(15, parsed.estimatedDuration || 60),
        researchIntensity: this.validateResearchIntensity(parsed.researchIntensity),
        adaptationTriggers: Array.isArray(parsed.adaptationTriggers) ? parsed.adaptationTriggers : [],
        reasoning: response.reasoning || parsed.reasoning,
      };

      return analysis;

    } catch (error) {
      logger.error('Failed to parse planning response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseLength: response.content.length,
      });

      // Return fallback plan for simple content
      return this.createFallbackPlan();
    }
  }

  /**
   * Validate complexity value with fallback
   */
  private validateComplexity(value: any): ContentComplexity {
    const validComplexities: ContentComplexity[] = ['simple', 'moderate', 'complex', 'expert'];
    return validComplexities.includes(value) ? value : 'moderate';
  }

  /**
   * Validate strategy value with fallback
   */
  private validateStrategy(value: any): ExecutionStrategy {
    const validStrategies: ExecutionStrategy[] = ['sequential', 'parallel', 'hybrid'];
    return validStrategies.includes(value) ? value : 'sequential';
  }

  /**
   * Validate approach value with fallback
   */
  private validateApproach(value: any): ContentApproach {
    const validApproaches: ContentApproach[] = ['standard', 'research_heavy', 'narrative_focused', 'technical_deep', 'practical_guide'];
    return validApproaches.includes(value) ? value : 'standard';
  }

  /**
   * Validate research intensity with fallback
   */
  private validateResearchIntensity(value: any): ResearchIntensity {
    const validIntensities: ResearchIntensity[] = ['minimal', 'moderate', 'extensive', 'expert'];
    return validIntensities.includes(value) ? value : 'moderate';
  }

  /**
   * Create fallback planning strategy for error scenarios
   */
  private createFallbackPlan(): PlanningAnalysis {
    return {
      complexity: 'moderate',
      topicCategory: 'General',
      estimatedWordCount: 30000,
      strategy: 'sequential',
      approach: 'standard',
      chapterCount: 12,
      estimatedDuration: 60,
      researchIntensity: 'moderate',
      adaptationTriggers: ['quality_below_threshold', 'user_feedback_negative'],
      reasoning: 'Fallback plan due to parsing error - using safe defaults for moderate complexity content',
    };
  }

  /**
   * Convert analysis to PlanningContext for workflow state
   */
  static toPlanningContext(analysis: PlanningAnalysis): PlanningContext {
    const now = new Date().toISOString();

    return {
      complexity: analysis.complexity,
      topicCategory: analysis.topicCategory,
      estimatedWordCount: analysis.estimatedWordCount,
      strategy: analysis.strategy,
      approach: analysis.approach,
      chapterCount: analysis.chapterCount,
      estimatedDuration: analysis.estimatedDuration,
      researchIntensity: analysis.researchIntensity,
      adaptationTriggers: analysis.adaptationTriggers,
      createdAt: now,
      lastUpdated: now,
    };
  }

  /**
   * Update agent configuration for specific scenarios
   */
  updateConfig(updates: { reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high'; verbosity?: 'low' | 'medium' | 'high' }): void {
    this.agent.updateConfig(updates);
  }

  /**
   * Get current agent configuration
   */
  getConfig() {
    return this.agent.getConfig();
  }
}

/**
 * Factory function for creating Planning Agent
 */
export function createPlanningAgent(): PlanningAgent {
  return new PlanningAgent();
}

/**
 * Singleton planning agent instance
 */
export const planningAgent = createPlanningAgent();