// Complexity Analysis Functions for Planning Agent
// Provides rule-based complexity assessment alongside AI planning
// Follows CLAUDE.md standards: type safety, error handling, performance optimization

import {
  ContentComplexity,
  ExecutionStrategy,
  ContentApproach,
  ResearchIntensity,
} from '@/types';
import { logger } from '@/lib/errors/exports';

/**
 * Content analysis metrics
 */
export interface ContentMetrics {
  wordCount: number;
  technicalTermDensity: number;
  domainSpecificity: number;
  researchRequirements: number;
  structureComplexity: number;
}

/**
 * Complexity analysis result
 */
export interface ComplexityAnalysisResult {
  complexity: ContentComplexity;
  confidence: number;
  metrics: ContentMetrics;
  reasoning: string[];
  recommendations: {
    strategy: ExecutionStrategy;
    approach: ContentApproach;
    researchIntensity: ResearchIntensity;
    chapterCount: number;
    estimatedDuration: number;
  };
}

/**
 * Technical keywords for domain assessment
 */
const TECHNICAL_KEYWORDS = {
  programming: ['api', 'algorithm', 'framework', 'library', 'code', 'function', 'database', 'server'],
  scientific: ['research', 'methodology', 'hypothesis', 'analysis', 'data', 'study', 'experiment'],
  business: ['strategy', 'revenue', 'market', 'competition', 'customer', 'profit', 'analytics'],
  academic: ['theory', 'concept', 'principle', 'literature', 'academic', 'scholarly', 'citation'],
  medical: ['patient', 'treatment', 'diagnosis', 'clinical', 'medical', 'health', 'therapy'],
  legal: ['law', 'regulation', 'compliance', 'legal', 'court', 'contract', 'rights'],
  financial: ['investment', 'portfolio', 'risk', 'return', 'financial', 'economics', 'trading'],
};

/**
 * Complexity indicators based on content patterns
 */
const COMPLEXITY_INDICATORS = {
  simple: {
    keywords: ['basic', 'beginner', 'introduction', 'simple', 'easy', 'guide', 'tutorial'],
    maxTechnicalDensity: 0.1,
    maxWordTarget: 20000,
  },
  moderate: {
    keywords: ['intermediate', 'practical', 'professional', 'guide', 'handbook', 'manual'],
    maxTechnicalDensity: 0.3,
    maxWordTarget: 40000,
  },
  complex: {
    keywords: ['advanced', 'comprehensive', 'detailed', 'expert', 'master', 'complete'],
    maxTechnicalDensity: 0.5,
    maxWordTarget: 80000,
  },
  expert: {
    keywords: ['research', 'academic', 'scholarly', 'theoretical', 'cutting-edge', 'specialized'],
    maxTechnicalDensity: 1.0,
    maxWordTarget: 150000,
  },
};

/**
 * Analyze content complexity using rule-based assessment
 * Provides fast, deterministic analysis to complement AI planning
 */
export function analyzeComplexity(
  userPrompt: string,
  baseContent?: string,
  targetWordCount?: number
): ComplexityAnalysisResult {
  const startTime = Date.now();

  try {
    // Combine all content for analysis
    const content = `${userPrompt} ${baseContent || ''}`.toLowerCase();
    const metrics = calculateContentMetrics(content, targetWordCount);

    // Determine complexity level
    const complexity = determineComplexityLevel(metrics, content);
    const confidence = calculateConfidence(metrics, complexity);
    const reasoning = generateReasoning(metrics, complexity);
    const recommendations = generateRecommendations(complexity, metrics);

    const result: ComplexityAnalysisResult = {
      complexity,
      confidence,
      metrics,
      reasoning,
      recommendations,
    };

    logger.info('Complexity analysis completed', {
      complexity,
      confidence,
      duration: Date.now() - startTime,
      wordCount: metrics.wordCount,
    });

    return result;

  } catch (error) {
    logger.error('Complexity analysis failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    });

    // Return safe fallback
    return createFallbackAnalysis();
  }
}

/**
 * Calculate quantitative content metrics
 */
function calculateContentMetrics(
  content: string,
  targetWordCount?: number
): ContentMetrics {
  const words = content.split(/\s+/).filter(word => word.length > 0);
  const wordCount = targetWordCount || Math.max(words.length * 100, 30000); // Estimate book length

  // Calculate technical term density
  const technicalTerms = countTechnicalTerms(content);
  const technicalTermDensity = words.length > 0 ? technicalTerms / words.length : 0;

  // Assess domain specificity
  const domainSpecificity = calculateDomainSpecificity(content);

  // Estimate research requirements
  const researchRequirements = estimateResearchRequirements(content, technicalTermDensity);

  // Assess structural complexity
  const structureComplexity = estimateStructureComplexity(content, wordCount);

  return {
    wordCount,
    technicalTermDensity,
    domainSpecificity,
    researchRequirements,
    structureComplexity,
  };
}

/**
 * Count technical terms across all domains
 */
function countTechnicalTerms(content: string): number {
  let count = 0;

  Object.values(TECHNICAL_KEYWORDS).forEach(keywords => {
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) count += matches.length;
    });
  });

  return count;
}

/**
 * Calculate domain specificity score (0-1)
 */
function calculateDomainSpecificity(content: string): number {
  const domainScores: Record<string, number> = {};

  Object.entries(TECHNICAL_KEYWORDS).forEach(([domain, keywords]) => {
    let score = 0;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) score += matches.length;
    });
    domainScores[domain] = score;
  });

  const maxScore = Math.max(...Object.values(domainScores));
  const totalWords = content.split(/\s+/).length;

  return totalWords > 0 ? Math.min(maxScore / totalWords, 1) : 0;
}

/**
 * Estimate research requirements (0-1)
 */
function estimateResearchRequirements(content: string, technicalDensity: number): number {
  const researchIndicators = [
    'research', 'study', 'analysis', 'data', 'evidence', 'source',
    'reference', 'citation', 'current', 'latest', 'trends', 'statistics'
  ];

  let researchScore = 0;
  researchIndicators.forEach(indicator => {
    const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
    const matches = content.match(regex);
    if (matches) researchScore += matches.length;
  });

  const words = content.split(/\s+/).length;
  const normalizedScore = words > 0 ? researchScore / words : 0;

  // Combine with technical density for final score
  return Math.min((normalizedScore + technicalDensity) / 2, 1);
}

/**
 * Estimate structural complexity (0-1)
 */
function estimateStructureComplexity(content: string, wordCount: number): number {
  // Base complexity on word count
  let complexity = 0;

  if (wordCount < 20000) complexity = 0.2;
  else if (wordCount < 40000) complexity = 0.4;
  else if (wordCount < 80000) complexity = 0.6;
  else complexity = 0.8;

  // Adjust for structure indicators
  const structureIndicators = [
    'chapter', 'section', 'part', 'appendix', 'index', 'reference',
    'table', 'figure', 'diagram', 'example', 'case study'
  ];

  let structureScore = 0;
  structureIndicators.forEach(indicator => {
    const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
    if (content.match(regex)) structureScore += 0.05;
  });

  return Math.min(complexity + structureScore, 1);
}

/**
 * Determine complexity level based on metrics
 */
function determineComplexityLevel(
  metrics: ContentMetrics,
  content: string
): ContentComplexity {
  // Check for explicit complexity indicators
  for (const [level, indicators] of Object.entries(COMPLEXITY_INDICATORS)) {
    if (indicators.keywords.some(keyword => content.includes(keyword))) {
      // Verify with metrics
      if (metrics.technicalTermDensity <= indicators.maxTechnicalDensity &&
          metrics.wordCount <= indicators.maxWordTarget) {
        return level as ContentComplexity;
      }
    }
  }

  // Use metrics-based classification
  const complexityScore = (
    metrics.technicalTermDensity * 0.3 +
    metrics.domainSpecificity * 0.25 +
    metrics.researchRequirements * 0.25 +
    metrics.structureComplexity * 0.2
  );

  if (complexityScore < 0.25) return 'simple';
  if (complexityScore < 0.5) return 'moderate';
  if (complexityScore < 0.75) return 'complex';
  return 'expert';
}

/**
 * Calculate confidence in complexity assessment (0-1)
 */
function calculateConfidence(
  metrics: ContentMetrics,
  complexity: ContentComplexity
): number {
  // Base confidence on metric consistency
  const scores = [
    metrics.technicalTermDensity,
    metrics.domainSpecificity,
    metrics.researchRequirements,
    metrics.structureComplexity,
  ];

  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const standardDeviation = Math.sqrt(variance);

  // Lower variance = higher confidence
  const confidence = Math.max(0.5, 1 - (standardDeviation * 2));

  return Math.min(confidence, 1);
}

/**
 * Generate human-readable reasoning for complexity assessment
 */
function generateReasoning(
  metrics: ContentMetrics,
  complexity: ContentComplexity
): string[] {
  const reasoning: string[] = [];

  reasoning.push(`Assessed as ${complexity} complexity based on content analysis`);

  if (metrics.technicalTermDensity > 0.3) {
    reasoning.push('High technical term density indicates specialized knowledge required');
  }

  if (metrics.domainSpecificity > 0.4) {
    reasoning.push('Content shows strong domain specialization');
  }

  if (metrics.researchRequirements > 0.5) {
    reasoning.push('Significant research requirements identified');
  }

  if (metrics.wordCount > 50000) {
    reasoning.push('Large word count indicates comprehensive coverage needed');
  }

  return reasoning;
}

/**
 * Generate recommendations based on complexity
 */
function generateRecommendations(
  complexity: ContentComplexity,
  metrics: ContentMetrics
): ComplexityAnalysisResult['recommendations'] {
  const baseRecommendations = {
    simple: {
      strategy: 'parallel' as ExecutionStrategy,
      approach: 'standard' as ContentApproach,
      researchIntensity: 'minimal' as ResearchIntensity,
      chapterCount: 8,
      estimatedDuration: 30,
    },
    moderate: {
      strategy: 'sequential' as ExecutionStrategy,
      approach: 'standard' as ContentApproach,
      researchIntensity: 'moderate' as ResearchIntensity,
      chapterCount: 12,
      estimatedDuration: 60,
    },
    complex: {
      strategy: 'sequential' as ExecutionStrategy,
      approach: 'research_heavy' as ContentApproach,
      researchIntensity: 'extensive' as ResearchIntensity,
      chapterCount: 18,
      estimatedDuration: 120,
    },
    expert: {
      strategy: 'sequential' as ExecutionStrategy,
      approach: 'research_heavy' as ContentApproach,
      researchIntensity: 'expert' as ResearchIntensity,
      chapterCount: 25,
      estimatedDuration: 180,
    },
  };

  const base = baseRecommendations[complexity];

  // Adjust based on metrics
  if (metrics.domainSpecificity > 0.6) {
    base.approach = 'technical_deep';
  }

  if (metrics.wordCount > 80000) {
    base.chapterCount = Math.min(base.chapterCount + 5, 25);
    base.estimatedDuration += 30;
  }

  return base;
}

/**
 * Create fallback analysis for error scenarios
 */
function createFallbackAnalysis(): ComplexityAnalysisResult {
  return {
    complexity: 'moderate',
    confidence: 0.5,
    metrics: {
      wordCount: 30000,
      technicalTermDensity: 0.2,
      domainSpecificity: 0.3,
      researchRequirements: 0.4,
      structureComplexity: 0.3,
    },
    reasoning: ['Fallback analysis due to processing error'],
    recommendations: {
      strategy: 'sequential',
      approach: 'standard',
      researchIntensity: 'moderate',
      chapterCount: 12,
      estimatedDuration: 60,
    },
  };
}

/**
 * Quick complexity check for simple use cases
 */
export function quickComplexityCheck(prompt: string): ContentComplexity {
  const content = prompt.toLowerCase();

  // Simple keyword checks
  if (COMPLEXITY_INDICATORS.simple.keywords.some(k => content.includes(k))) {
    return 'simple';
  }

  if (COMPLEXITY_INDICATORS.expert.keywords.some(k => content.includes(k))) {
    return 'expert';
  }

  if (COMPLEXITY_INDICATORS.complex.keywords.some(k => content.includes(k))) {
    return 'complex';
  }

  return 'moderate';
}