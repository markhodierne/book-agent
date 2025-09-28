// Planning Agent Module Exports
// Central export point for all planning agent functionality
// Follows CLAUDE.md standards: clear exports, type safety, documentation

// Core Planning Agent
export {
  PlanningAgent,
  createPlanningAgent,
  planningAgent,
  type PlanningAnalysis,
  type PlanningRequest,
} from './PlanningAgent';

// Complexity Analysis Functions
export {
  analyzeComplexity,
  quickComplexityCheck,
  type ContentMetrics,
  type ComplexityAnalysisResult,
} from './complexityAnalysis';

// Strategy Selection Logic
export {
  selectExecutionStrategy,
  validateStrategyRecommendation,
  strategyToPlanningContext,
  type StrategySelectionCriteria,
  type StrategyRecommendation,
} from './strategySelection';

// Planning State Persistence
export {
  planningStateTool,
  PlanningStateOperations,
  type PlanningOperation,
  type PlanningStateParams,
  type PlanningStateResult,
} from '../../tools/planningStateTool';

// Re-export relevant types from main types module
export type {
  PlanningContext,
  ContentComplexity,
  ExecutionStrategy,
  ContentApproach,
  ResearchIntensity,
} from '@/types';

/**
 * Planning Agent Factory with default configuration
 * For use in workflow nodes and other components
 */
export function createDefaultPlanningAgent(): PlanningAgent {
  return createPlanningAgent();
}

/**
 * Complete planning workflow helper
 * Combines analysis, strategy selection, and state persistence
 */
export async function executeCompletePlanningWorkflow(
  sessionId: string,
  userPrompt: string,
  baseContent?: string,
  targetWordCount?: number
): Promise<{
  analysis: PlanningAnalysis;
  planningContext: PlanningContext;
  saved: boolean;
}> {
  // Create planning agent
  const agent = createPlanningAgent();

  // Perform analysis
  const analysis = await agent.createPlan({
    userPrompt,
    baseContent,
    targetWordCount,
  });

  // Convert to planning context
  const planningContext = PlanningAgent.toPlanningContext(analysis);

  // Save to state
  let saved = false;
  try {
    await PlanningStateOperations.save(sessionId, planningContext, {
      agentName: 'PlanningAgent',
      confidence: 0.8, // Could be calculated from analysis
      reasoning: analysis.reasoning ? [analysis.reasoning] : [],
    });
    saved = true;
  } catch (error) {
    // Log error but don't fail the entire workflow
    console.error('Failed to save planning state:', error);
  }

  return {
    analysis,
    planningContext,
    saved,
  };
}