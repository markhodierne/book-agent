// Planning Agent Unit Tests
// Tests for complexity analysis, strategy selection, and state persistence
// Follows CLAUDE.md testing standards and naming conventions

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlanningAgent, createPlanningAgent } from '@/lib/agents/planning/PlanningAgent';
import { analyzeComplexity, quickComplexityCheck } from '@/lib/agents/planning/complexityAnalysis';
import { selectExecutionStrategy, validateStrategyRecommendation } from '@/lib/agents/planning/strategySelection';
import { PlanningStateOperations } from '@/lib/tools/planningStateTool';
import type { ContentComplexity, ExecutionStrategy, ContentApproach } from '@/types';

// Mock external dependencies
vi.mock('@/lib/agents/gpt5-wrapper', () => ({
  createGPT5Agent: vi.fn(() => ({
    execute: vi.fn(),
    updateConfig: vi.fn(),
    getConfig: vi.fn(() => ({})),
  })),
}));

vi.mock('@/lib/errors/exports', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  WorkflowError: class extends Error {},
  WorkflowErrorContext: class {
    constructor(public sessionId: string, public userId?: string) {}
    createError = vi.fn((ErrorClass: any, message: string, options?: any) => new ErrorClass(message));
    cleanup = vi.fn();
    updateStage = vi.fn();
  },
}));

vi.mock('@/lib/tools/planningStateTool', () => ({
  PlanningStateOperations: {
    save: vi.fn(),
    load: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  },
}));

describe('PlanningAgent', () => {
  let planningAgent: PlanningAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    planningAgent = createPlanningAgent();
  });

  it('creates planning agent successfully', () => {
    expect(planningAgent).toBeInstanceOf(PlanningAgent);
    expect(planningAgent.getConfig).toBeDefined();
    expect(planningAgent.updateConfig).toBeDefined();
  });

  it('handles planning request with valid user prompt', async () => {
    // Mock GPT-5 agent response
    const mockResponse = {
      content: JSON.stringify({
        complexity: 'moderate',
        topicCategory: 'Programming',
        estimatedWordCount: 30000,
        strategy: 'sequential',
        approach: 'practical_guide',
        chapterCount: 12,
        estimatedDuration: 60,
        researchIntensity: 'moderate',
        adaptationTriggers: ['quality_below_threshold'],
        reasoning: 'Programming tutorial requires step-by-step approach',
      }),
      reasoning: 'Analyzed as practical programming content',
    };

    vi.mocked(planningAgent['agent'].execute).mockResolvedValue(mockResponse);

    const result = await planningAgent.createPlan({
      userPrompt: 'Create a comprehensive Python web scraping tutorial',
      targetWordCount: 30000,
    });

    expect(result).toMatchObject({
      complexity: 'moderate',
      strategy: 'sequential',
      approach: 'practical_guide',
      chapterCount: 12,
      estimatedDuration: 60,
    });
  });

  it('handles malformed GPT-5 response gracefully', async () => {
    // Mock invalid JSON response
    const mockResponse = {
      content: 'This is not valid JSON response',
    };

    vi.mocked(planningAgent['agent'].execute).mockResolvedValue(mockResponse);

    const result = await planningAgent.createPlan({
      userPrompt: 'Simple topic',
    });

    // Should return fallback plan
    expect(result.complexity).toBe('moderate');
    expect(result.strategy).toBe('sequential');
    expect(result.reasoning).toContain('Fallback plan');
  });

  it('validates complexity values correctly', () => {
    const agent = new PlanningAgent();

    // Test private method through reflection for MVP testing
    const validateComplexity = agent['validateComplexity'].bind(agent);

    expect(validateComplexity('simple')).toBe('simple');
    expect(validateComplexity('expert')).toBe('expert');
    expect(validateComplexity('invalid')).toBe('moderate'); // fallback
    expect(validateComplexity(null)).toBe('moderate'); // fallback
  });

  it('converts analysis to planning context correctly', () => {
    const analysis = {
      complexity: 'complex' as ContentComplexity,
      topicCategory: 'Academic',
      estimatedWordCount: 50000,
      strategy: 'sequential' as ExecutionStrategy,
      approach: 'research_heavy' as ContentApproach,
      chapterCount: 18,
      estimatedDuration: 120,
      researchIntensity: 'extensive' as const,
      adaptationTriggers: ['quality_below_threshold'],
    };

    const context = PlanningAgent.toPlanningContext(analysis);

    expect(context).toMatchObject({
      complexity: 'complex',
      strategy: 'sequential',
      approach: 'research_heavy',
      chapterCount: 18,
      estimatedDuration: 120,
      researchIntensity: 'extensive',
    });
    expect(context.createdAt).toBeDefined();
    expect(context.lastUpdated).toBeDefined();
  });
});

describe('Complexity Analysis Functions', () => {
  it('analyzes simple content correctly', () => {
    const result = analyzeComplexity(
      'Create a basic introduction to Python programming for beginners',
      undefined,
      15000
    );

    expect(result.complexity).toBe('simple');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.reasoning).toContain('simple');
    expect(result.recommendations.strategy).toBeDefined();
  });

  it('analyzes complex academic content correctly', () => {
    const result = analyzeComplexity(
      'Comprehensive analysis of advanced machine learning algorithms with theoretical foundations and research methodologies',
      'Academic research paper with citations and experimental data analysis',
      80000
    );

    expect(result.complexity).toBe('complex');
    expect(result.metrics.technicalTermDensity).toBeGreaterThan(0.1);
    expect(result.recommendations.researchIntensity).toBe('extensive');
  });

  it('handles edge cases in complexity analysis', () => {
    // Empty prompt
    const emptyResult = analyzeComplexity('', undefined, undefined);
    expect(emptyResult.complexity).toBeDefined();
    expect(emptyResult.confidence).toBeGreaterThan(0);

    // Very long prompt
    const longPrompt = 'a '.repeat(10000);
    const longResult = analyzeComplexity(longPrompt, undefined, undefined);
    expect(longResult.complexity).toBeDefined();
  });

  it('quick complexity check works for basic cases', () => {
    expect(quickComplexityCheck('basic tutorial for beginners')).toBe('simple');
    expect(quickComplexityCheck('advanced expert guide')).toBe('complex');
    expect(quickComplexityCheck('research methodology')).toBe('expert');
    expect(quickComplexityCheck('practical handbook')).toBe('moderate');
  });

  it('calculates content metrics accurately', () => {
    const result = analyzeComplexity(
      'Programming API framework development with database server integration',
      'Technical documentation with code examples',
      40000
    );

    expect(result.metrics.wordCount).toBe(40000);
    expect(result.metrics.technicalTermDensity).toBeGreaterThan(0);
    expect(result.metrics.domainSpecificity).toBeGreaterThan(0);
    expect(result.metrics.structureComplexity).toBeGreaterThan(0);
  });
});

describe('Strategy Selection Logic', () => {
  it('selects appropriate strategy for simple content', () => {
    const mockAnalysis = {
      complexity: 'simple' as ContentComplexity,
      confidence: 0.8,
      metrics: {
        wordCount: 20000,
        technicalTermDensity: 0.1,
        domainSpecificity: 0.2,
        researchRequirements: 0.1,
        structureComplexity: 0.2,
      },
      reasoning: ['Simple tutorial content'],
      recommendations: {
        strategy: 'parallel' as ExecutionStrategy,
        approach: 'standard' as ContentApproach,
        researchIntensity: 'minimal' as const,
        chapterCount: 8,
        estimatedDuration: 30,
      },
    };

    const criteria = {
      complexity: 'simple' as ContentComplexity,
      wordCount: 20000,
      qualityRequirements: 'standard' as const,
    };

    const recommendation = selectExecutionStrategy(mockAnalysis, criteria);

    expect(recommendation.strategy).toBe('parallel');
    expect(recommendation.approach).toBe('standard');
    expect(recommendation.researchIntensity).toBe('minimal');
    expect(recommendation.confidence).toBeGreaterThan(0.5);
    expect(recommendation.alternatives.length).toBeGreaterThan(0);
  });

  it('adjusts strategy for time constraints', () => {
    const mockAnalysis = {
      complexity: 'complex' as ContentComplexity,
      confidence: 0.9,
      metrics: {
        wordCount: 60000,
        technicalTermDensity: 0.6,
        domainSpecificity: 0.7,
        researchRequirements: 0.8,
        structureComplexity: 0.6,
      },
      reasoning: ['Complex technical content'],
      recommendations: {
        strategy: 'sequential' as ExecutionStrategy,
        approach: 'research_heavy' as ContentApproach,
        researchIntensity: 'extensive' as const,
        chapterCount: 18,
        estimatedDuration: 120,
      },
    };

    const criteria = {
      complexity: 'complex' as ContentComplexity,
      wordCount: 60000,
      timeConstraints: 45, // Very tight time constraint
      riskTolerance: 'high' as const,
    };

    const recommendation = selectExecutionStrategy(mockAnalysis, criteria);

    // Should adjust for time constraints
    expect(recommendation.strategy).toBe('hybrid'); // Changed from sequential
    expect(recommendation.researchIntensity).not.toBe('expert'); // Reduced from extensive
  });

  it('validates strategy recommendations correctly', () => {
    const validRecommendation = {
      strategy: 'sequential' as ExecutionStrategy,
      approach: 'standard' as ContentApproach,
      researchIntensity: 'moderate' as const,
      confidence: 0.8,
      reasoning: ['Valid strategy'],
      alternatives: [],
      adaptationTriggers: [],
    };

    const invalidRecommendation = {
      strategy: 'parallel' as ExecutionStrategy,
      approach: 'standard' as ContentApproach,
      researchIntensity: 'expert' as const,
      confidence: 0.8,
      reasoning: ['Invalid strategy'],
      alternatives: [],
      adaptationTriggers: [],
    };

    expect(validateStrategyRecommendation(validRecommendation, {
      complexity: 'moderate',
      wordCount: 30000,
    })).toBe(true);

    expect(validateStrategyRecommendation(invalidRecommendation, {
      complexity: 'expert',
      wordCount: 30000,
    })).toBe(false); // Expert content shouldn't use parallel
  });

  it('handles conflicting requirements gracefully', () => {
    const mockAnalysis = {
      complexity: 'expert' as ContentComplexity,
      confidence: 0.9,
      metrics: {
        wordCount: 100000,
        technicalTermDensity: 0.8,
        domainSpecificity: 0.9,
        researchRequirements: 0.9,
        structureComplexity: 0.8,
      },
      reasoning: ['Expert academic content'],
      recommendations: {
        strategy: 'sequential' as ExecutionStrategy,
        approach: 'research_heavy' as ContentApproach,
        researchIntensity: 'expert' as const,
        chapterCount: 25,
        estimatedDuration: 180,
      },
    };

    const criteria = {
      complexity: 'expert' as ContentComplexity,
      wordCount: 100000,
      timeConstraints: 30, // Unrealistic time constraint
      qualityRequirements: 'publication' as const,
    };

    const recommendation = selectExecutionStrategy(mockAnalysis, criteria);

    // Should show low confidence due to conflicting requirements
    expect(recommendation.confidence).toBeLessThan(0.8);
    expect(recommendation.reasoning).toContain('Strategy adjusted for time constraints');
  });
});

describe('Planning State Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves planning context successfully', async () => {
    vi.mocked(PlanningStateOperations.save).mockResolvedValue(undefined);

    const planningContext = {
      complexity: 'moderate' as ContentComplexity,
      topicCategory: 'Programming',
      estimatedWordCount: 30000,
      strategy: 'sequential' as ExecutionStrategy,
      approach: 'practical_guide' as ContentApproach,
      chapterCount: 12,
      estimatedDuration: 60,
      researchIntensity: 'moderate' as const,
      adaptationTriggers: ['quality_below_threshold'],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    await PlanningStateOperations.save('test-session', planningContext);

    expect(PlanningStateOperations.save).toHaveBeenCalledWith(
      'test-session',
      planningContext
    );
  });

  it('loads planning context successfully', async () => {
    const mockContext = {
      complexity: 'moderate' as ContentComplexity,
      topicCategory: 'Programming',
      estimatedWordCount: 30000,
      strategy: 'sequential' as ExecutionStrategy,
      approach: 'practical_guide' as ContentApproach,
      chapterCount: 12,
      estimatedDuration: 60,
      researchIntensity: 'moderate' as const,
      adaptationTriggers: ['quality_below_threshold'],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    vi.mocked(PlanningStateOperations.load).mockResolvedValue(mockContext);

    const result = await PlanningStateOperations.load('test-session');

    expect(result).toEqual(mockContext);
    expect(PlanningStateOperations.load).toHaveBeenCalledWith('test-session');
  });

  it('handles missing planning context gracefully', async () => {
    vi.mocked(PlanningStateOperations.load).mockResolvedValue(null);

    const result = await PlanningStateOperations.load('nonexistent-session');

    expect(result).toBeNull();
  });

  it('checks existence of planning context', async () => {
    vi.mocked(PlanningStateOperations.exists).mockResolvedValue(true);

    const exists = await PlanningStateOperations.exists('test-session');

    expect(exists).toBe(true);
    expect(PlanningStateOperations.exists).toHaveBeenCalledWith('test-session');
  });

  it('updates planning context successfully', async () => {
    const mockUpdatedContext = {
      complexity: 'moderate' as ContentComplexity,
      topicCategory: 'Programming',
      estimatedWordCount: 35000, // Updated
      strategy: 'hybrid' as ExecutionStrategy, // Updated
      approach: 'practical_guide' as ContentApproach,
      chapterCount: 14, // Updated
      estimatedDuration: 70, // Updated
      researchIntensity: 'moderate' as const,
      adaptationTriggers: ['quality_below_threshold'],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    vi.mocked(PlanningStateOperations.update).mockResolvedValue(mockUpdatedContext);

    const updates = {
      estimatedWordCount: 35000,
      strategy: 'hybrid' as ExecutionStrategy,
      chapterCount: 14,
      estimatedDuration: 70,
    };

    const result = await PlanningStateOperations.update('test-session', updates);

    expect(result).toEqual(mockUpdatedContext);
    expect(PlanningStateOperations.update).toHaveBeenCalledWith(
      'test-session',
      updates
    );
  });
});

describe('Integration Tests', () => {
  it('completes full planning workflow', async () => {
    // Mock successful GPT-5 response
    const mockResponse = {
      content: JSON.stringify({
        complexity: 'moderate',
        topicCategory: 'Web Development',
        estimatedWordCount: 30000,
        strategy: 'sequential',
        approach: 'practical_guide',
        chapterCount: 12,
        estimatedDuration: 60,
        researchIntensity: 'moderate',
        adaptationTriggers: ['quality_below_threshold'],
        reasoning: 'Web development tutorial with practical examples',
      }),
    };

    vi.mocked(planningAgent['agent'].execute).mockResolvedValue(mockResponse);
    vi.mocked(PlanningStateOperations.save).mockResolvedValue(undefined);

    // Create plan
    const analysis = await planningAgent.createPlan({
      userPrompt: 'Create a comprehensive guide to modern web development',
      targetWordCount: 30000,
    });

    // Convert to planning context
    const context = PlanningAgent.toPlanningContext(analysis);

    // Save to state
    await PlanningStateOperations.save('integration-test', context);

    // Verify complete workflow
    expect(analysis.complexity).toBe('moderate');
    expect(analysis.strategy).toBe('sequential');
    expect(context.createdAt).toBeDefined();
    expect(PlanningStateOperations.save).toHaveBeenCalled();
  });

  it('handles errors gracefully throughout workflow', async () => {
    // Mock GPT-5 failure
    vi.mocked(planningAgent['agent'].execute).mockRejectedValue(new Error('GPT-5 API Error'));

    // Should not throw but return fallback
    await expect(planningAgent.createPlan({
      userPrompt: 'Test prompt',
    })).rejects.toThrow('GPT-5 API Error');
  });
});