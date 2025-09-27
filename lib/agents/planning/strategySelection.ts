// Strategy Selection Logic for Planning Agent
// Provides rule-based strategy selection for execution approaches
// Follows CLAUDE.md standards: type safety, performance optimization, error handling

import {
  ExecutionStrategy,
  ContentApproach,
  ContentComplexity,
  ResearchIntensity,
  PlanningContext,
} from '@/types';
import { ComplexityAnalysisResult } from './complexityAnalysis';
import { logger } from '@/lib/errors/exports';

/**
 * Strategy selection criteria
 */
export interface StrategySelectionCriteria {
  complexity: ContentComplexity;
  wordCount: number;
  timeConstraints?: number; // minutes
  qualityRequirements?: 'standard' | 'high' | 'publication';
  riskTolerance?: 'low' | 'medium' | 'high';
  resourceAvailability?: 'limited' | 'standard' | 'extensive';
}

/**
 * Strategy recommendation with confidence
 */
export interface StrategyRecommendation {
  strategy: ExecutionStrategy;
  approach: ContentApproach;
  researchIntensity: ResearchIntensity;
  confidence: number;
  reasoning: string[];
  alternatives: Array<{
    strategy: ExecutionStrategy;
    approach: ContentApproach;
    tradeoffs: string[];
  }>;
  adaptationTriggers: string[];
}

/**
 * Strategy selection configuration matrix
 */
const STRATEGY_MATRIX: Record<ContentComplexity, {
  preferredStrategy: ExecutionStrategy;
  approach: ContentApproach;
  researchIntensity: ResearchIntensity;
  parallelThreshold: number; // chapters
  qualityMultiplier: number;
}> = {
  simple: {
    preferredStrategy: 'parallel',
    approach: 'standard',
    researchIntensity: 'minimal',
    parallelThreshold: 6,
    qualityMultiplier: 1.0,
  },
  moderate: {
    preferredStrategy: 'hybrid',
    approach: 'standard',
    researchIntensity: 'moderate',
    parallelThreshold: 8,
    qualityMultiplier: 1.2,
  },
  complex: {
    preferredStrategy: 'sequential',
    approach: 'research_heavy',
    researchIntensity: 'extensive',
    parallelThreshold: 12,
    qualityMultiplier: 1.5,
  },
  expert: {
    preferredStrategy: 'sequential',
    approach: 'research_heavy',
    researchIntensity: 'expert',
    parallelThreshold: 15,
    qualityMultiplier: 2.0,
  },
};

/**
 * Content approach modifiers based on domain
 */
const APPROACH_MODIFIERS: Record<string, {
  technicalDensity: number;
  preferredApproach: ContentApproach;
  researchBonus: number;
}> = {
  programming: {
    technicalDensity: 0.8,
    preferredApproach: 'technical_deep',
    researchBonus: 0.2,
  },
  tutorial: {
    technicalDensity: 0.4,
    preferredApproach: 'practical_guide',
    researchBonus: 0.1,
  },
  academic: {
    technicalDensity: 0.9,
    preferredApproach: 'research_heavy',
    researchBonus: 0.4,
  },
  business: {
    technicalDensity: 0.3,
    preferredApproach: 'standard',
    researchBonus: 0.2,
  },
  creative: {
    technicalDensity: 0.1,
    preferredApproach: 'narrative_focused',
    researchBonus: 0.0,
  },
};

/**
 * Select optimal execution strategy based on analysis and criteria
 */
export function selectExecutionStrategy(
  complexityAnalysis: ComplexityAnalysisResult,
  criteria: StrategySelectionCriteria
): StrategyRecommendation {
  const startTime = Date.now();

  try {
    logger.info('Selecting execution strategy', {
      complexity: criteria.complexity,
      wordCount: criteria.wordCount,
      timeConstraints: criteria.timeConstraints,
    });

    // Get base strategy from matrix
    const baseStrategy = STRATEGY_MATRIX[criteria.complexity];

    // Apply criteria modifiers
    const modifiedStrategy = applySelectionCriteria(baseStrategy, criteria, complexityAnalysis);

    // Generate alternatives and reasoning
    const alternatives = generateStrategyAlternatives(modifiedStrategy, criteria);
    const reasoning = generateSelectionReasoning(modifiedStrategy, criteria, complexityAnalysis);
    const adaptationTriggers = generateAdaptationTriggers(modifiedStrategy, criteria);

    // Calculate confidence
    const confidence = calculateStrategyConfidence(modifiedStrategy, criteria, complexityAnalysis);

    const recommendation: StrategyRecommendation = {
      strategy: modifiedStrategy.preferredStrategy,
      approach: modifiedStrategy.approach,
      researchIntensity: modifiedStrategy.researchIntensity,
      confidence,
      reasoning,
      alternatives,
      adaptationTriggers,
    };

    logger.info('Strategy selection completed', {
      strategy: recommendation.strategy,
      approach: recommendation.approach,
      confidence,
      duration: Date.now() - startTime,
    });

    return recommendation;

  } catch (error) {
    logger.error('Strategy selection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    });

    return createFallbackStrategy(criteria.complexity);
  }
}

/**
 * Apply selection criteria to modify base strategy
 */
function applySelectionCriteria(
  baseStrategy: typeof STRATEGY_MATRIX[ContentComplexity],
  criteria: StrategySelectionCriteria,
  analysis: ComplexityAnalysisResult
): typeof STRATEGY_MATRIX[ContentComplexity] {
  const modifiedStrategy = { ...baseStrategy };

  // Time constraint adjustments
  if (criteria.timeConstraints && criteria.timeConstraints < 60) {
    // Tight time constraints - favor parallel
    if (modifiedStrategy.preferredStrategy === 'sequential') {
      modifiedStrategy.preferredStrategy = 'hybrid';
    }
    modifiedStrategy.researchIntensity = reduceResearchIntensity(modifiedStrategy.researchIntensity);
  }

  // Quality requirement adjustments
  if (criteria.qualityRequirements === 'publication') {
    modifiedStrategy.preferredStrategy = 'sequential'; // More careful approach
    modifiedStrategy.researchIntensity = increaseResearchIntensity(modifiedStrategy.researchIntensity);
  }

  // Risk tolerance adjustments
  if (criteria.riskTolerance === 'low') {
    modifiedStrategy.preferredStrategy = 'sequential'; // Safer approach
  } else if (criteria.riskTolerance === 'high' && criteria.complexity !== 'expert') {
    modifiedStrategy.preferredStrategy = 'parallel'; // More aggressive
  }

  // Resource availability adjustments
  if (criteria.resourceAvailability === 'limited') {
    modifiedStrategy.researchIntensity = reduceResearchIntensity(modifiedStrategy.researchIntensity);
    modifiedStrategy.approach = 'standard';
  } else if (criteria.resourceAvailability === 'extensive') {
    modifiedStrategy.researchIntensity = increaseResearchIntensity(modifiedStrategy.researchIntensity);
  }

  // Content-specific approach selection
  const contentApproach = detectContentApproach(analysis);
  if (contentApproach && modifiedStrategy.approach === 'standard') {
    modifiedStrategy.approach = contentApproach;
  }

  return modifiedStrategy;
}

/**
 * Detect content-specific approach from analysis
 */
function detectContentApproach(analysis: ComplexityAnalysisResult): ContentApproach | null {
  // This would ideally analyze the content for domain-specific patterns
  // For MVP, we'll use metrics-based heuristics

  if (analysis.metrics.technicalTermDensity > 0.5) {
    return 'technical_deep';
  }

  if (analysis.metrics.researchRequirements > 0.6) {
    return 'research_heavy';
  }

  if (analysis.reasoning.some(r => r.includes('tutorial') || r.includes('guide'))) {
    return 'practical_guide';
  }

  return null;
}

/**
 * Reduce research intensity by one level
 */
function reduceResearchIntensity(intensity: ResearchIntensity): ResearchIntensity {
  const levels: ResearchIntensity[] = ['minimal', 'moderate', 'extensive', 'expert'];
  const currentIndex = levels.indexOf(intensity);
  return levels[Math.max(0, currentIndex - 1)];
}

/**
 * Increase research intensity by one level
 */
function increaseResearchIntensity(intensity: ResearchIntensity): ResearchIntensity {
  const levels: ResearchIntensity[] = ['minimal', 'moderate', 'extensive', 'expert'];
  const currentIndex = levels.indexOf(intensity);
  return levels[Math.min(levels.length - 1, currentIndex + 1)];
}

/**
 * Generate alternative strategies with tradeoffs
 */
function generateStrategyAlternatives(
  selectedStrategy: typeof STRATEGY_MATRIX[ContentComplexity],
  criteria: StrategySelectionCriteria
): StrategyRecommendation['alternatives'] {
  const alternatives: StrategyRecommendation['alternatives'] = [];

  // Sequential alternative
  if (selectedStrategy.preferredStrategy !== 'sequential') {
    alternatives.push({
      strategy: 'sequential',
      approach: selectedStrategy.approach,
      tradeoffs: [
        'Slower execution but higher quality control',
        'Better chapter consistency and flow',
        'Easier debugging and recovery',
      ],
    });
  }

  // Parallel alternative
  if (selectedStrategy.preferredStrategy !== 'parallel' && criteria.complexity !== 'expert') {
    alternatives.push({
      strategy: 'parallel',
      approach: selectedStrategy.approach,
      tradeoffs: [
        'Faster execution but requires careful coordination',
        'Risk of inconsistencies between chapters',
        'More complex error handling',
      ],
    });
  }

  // Hybrid alternative
  if (selectedStrategy.preferredStrategy !== 'hybrid') {
    alternatives.push({
      strategy: 'hybrid',
      approach: selectedStrategy.approach,
      tradeoffs: [
        'Balanced speed and quality',
        'Adaptive to chapter dependencies',
        'Moderate complexity in execution',
      ],
    });
  }

  return alternatives;
}

/**
 * Generate reasoning for strategy selection
 */
function generateSelectionReasoning(
  strategy: typeof STRATEGY_MATRIX[ContentComplexity],
  criteria: StrategySelectionCriteria,
  analysis: ComplexityAnalysisResult
): string[] {
  const reasoning: string[] = [];

  reasoning.push(`Selected ${strategy.preferredStrategy} strategy for ${criteria.complexity} complexity content`);

  if (strategy.preferredStrategy === 'sequential') {
    reasoning.push('Sequential approach chosen for careful dependency management and quality control');
  } else if (strategy.preferredStrategy === 'parallel') {
    reasoning.push('Parallel approach chosen for faster execution with independent chapters');
  } else {
    reasoning.push('Hybrid approach chosen to balance speed and quality based on chapter dependencies');
  }

  if (strategy.approach !== 'standard') {
    reasoning.push(`${strategy.approach} approach selected based on content characteristics`);
  }

  if (strategy.researchIntensity === 'expert') {
    reasoning.push('Expert-level research required due to high complexity and specialization');
  } else if (strategy.researchIntensity === 'extensive') {
    reasoning.push('Extensive research needed for comprehensive coverage');
  }

  if (criteria.timeConstraints && criteria.timeConstraints < 90) {
    reasoning.push('Strategy adjusted for time constraints');
  }

  if (criteria.qualityRequirements === 'publication') {
    reasoning.push('Strategy enhanced for publication-quality requirements');
  }

  return reasoning;
}

/**
 * Generate adaptation triggers for strategy adjustment
 */
function generateAdaptationTriggers(
  strategy: typeof STRATEGY_MATRIX[ContentComplexity],
  criteria: StrategySelectionCriteria
): string[] {
  const triggers: string[] = [];

  // Quality-based triggers
  triggers.push('quality_score_below_80');
  triggers.push('consistency_issues_detected');

  // Performance-based triggers
  if (strategy.preferredStrategy === 'parallel') {
    triggers.push('chapter_dependency_conflicts');
    triggers.push('coordination_overhead_too_high');
  }

  // Time-based triggers
  if (criteria.timeConstraints) {
    triggers.push('execution_time_exceeds_budget');
  }

  // Resource-based triggers
  triggers.push('research_quota_exceeded');
  triggers.push('token_budget_at_80_percent');

  // Content-based triggers
  if (strategy.researchIntensity === 'minimal') {
    triggers.push('accuracy_concerns_raised');
  }

  return triggers;
}

/**
 * Calculate confidence in strategy selection
 */
function calculateStrategyConfidence(
  strategy: typeof STRATEGY_MATRIX[ContentComplexity],
  criteria: StrategySelectionCriteria,
  analysis: ComplexityAnalysisResult
): number {
  let confidence = 0.8; // Base confidence

  // Increase confidence for clear complexity indicators
  if (analysis.confidence > 0.8) {
    confidence += 0.1;
  }

  // Decrease confidence for conflicting criteria
  if (criteria.timeConstraints && criteria.timeConstraints < 45 && criteria.qualityRequirements === 'publication') {
    confidence -= 0.2; // Conflicting requirements
  }

  // Increase confidence for well-matched strategies
  if (strategy.preferredStrategy === 'sequential' && criteria.complexity === 'expert') {
    confidence += 0.1; // Perfect match
  }

  return Math.min(Math.max(confidence, 0.5), 1.0);
}

/**
 * Create fallback strategy for error scenarios
 */
function createFallbackStrategy(complexity: ContentComplexity): StrategyRecommendation {
  const baseStrategy = STRATEGY_MATRIX[complexity] || STRATEGY_MATRIX.moderate;

  return {
    strategy: baseStrategy.preferredStrategy,
    approach: baseStrategy.approach,
    researchIntensity: baseStrategy.researchIntensity,
    confidence: 0.6,
    reasoning: ['Fallback strategy due to selection error'],
    alternatives: [],
    adaptationTriggers: ['quality_score_below_70', 'execution_time_exceeds_budget'],
  };
}

/**
 * Validate strategy recommendation for consistency
 */
export function validateStrategyRecommendation(
  recommendation: StrategyRecommendation,
  criteria: StrategySelectionCriteria
): boolean {
  // Check basic consistency
  if (!recommendation.strategy || !recommendation.approach || !recommendation.researchIntensity) {
    return false;
  }

  // Check complexity alignment
  if (criteria.complexity === 'expert' && recommendation.strategy === 'parallel') {
    return false; // Expert content shouldn't use parallel
  }

  // Check time constraint alignment
  if (criteria.timeConstraints && criteria.timeConstraints < 30 && recommendation.researchIntensity === 'expert') {
    return false; // Can't do expert research in 30 minutes
  }

  return true;
}

/**
 * Convert strategy recommendation to planning context
 */
export function strategyToPlanningContext(
  recommendation: StrategyRecommendation,
  analysis: ComplexityAnalysisResult
): Partial<PlanningContext> {
  return {
    complexity: analysis.complexity,
    strategy: recommendation.strategy,
    approach: recommendation.approach,
    researchIntensity: recommendation.researchIntensity,
    adaptationTriggers: recommendation.adaptationTriggers,
    estimatedDuration: analysis.recommendations.estimatedDuration,
    chapterCount: analysis.recommendations.chapterCount,
  };
}