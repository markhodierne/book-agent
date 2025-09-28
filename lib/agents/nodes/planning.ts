// Planning Node Implementation
// Stage 0: Adaptive strategy and complexity analysis
// Following ARCHITECTURE.md Planning Node specification

import { WorkflowState, PlanningContext } from '@/types';
import { BaseWorkflowNode } from './base';
import { planningAgent } from '@/lib/agents/planning/PlanningAgent';
import { PlanningStateOperations } from '@/lib/tools/planningStateTool';
import {
  WorkflowError,
  WorkflowErrorContext,
  logger,
} from '@/lib/errors/exports';

/**
 * Planning Node for Stage 0: Adaptive Strategy Creation
 * Implements complexity analysis and execution strategy selection
 */
export class PlanningNode extends BaseWorkflowNode {
  constructor() {
    super('planning', 'Analyze complexity and create adaptive execution strategy');
  }

  /**
   * Execute the planning node workflow
   */
  protected async executeNode(state: WorkflowState): Promise<WorkflowState> {
    const errorContext = new WorkflowErrorContext(state.sessionId, state.userId);
    errorContext.updateStage('planning');

    try {
      logger.info('Starting planning analysis', {
        sessionId: state.sessionId,
        userPrompt: state.userPrompt,
        hasPdfFile: !!state.pdfFile
      });

      // Phase 1: Extract base content if PDF provided
      let baseContent = '';
      if (state.pdfFile) {
        // TODO: Implement PDF extraction when needed
        // For now, just note that PDF was provided
        baseContent = `[PDF file provided: ${state.pdfFile.length} bytes]`;
      }

      // Phase 2: Create planning request
      const planningRequest = {
        userPrompt: state.userPrompt,
        baseContent: baseContent || undefined,
      };

      // Phase 3: Execute Planning Agent for complexity analysis and strategy selection
      const planningAnalysis = await planningAgent.createPlan(planningRequest);

      logger.info('Planning analysis completed', {
        sessionId: state.sessionId,
        complexity: planningAnalysis.complexity,
        strategy: planningAnalysis.strategy,
        approach: planningAnalysis.approach,
        chapterCount: planningAnalysis.chapterCount,
        estimatedDuration: planningAnalysis.estimatedDuration
      });

      // Phase 4: Convert to PlanningContext for workflow state
      const planningContext: PlanningContext = {
        complexity: planningAnalysis.complexity,
        topicCategory: planningAnalysis.topicCategory,
        estimatedWordCount: planningAnalysis.estimatedWordCount,
        strategy: planningAnalysis.strategy,
        approach: planningAnalysis.approach,
        chapterCount: planningAnalysis.chapterCount,
        estimatedDuration: planningAnalysis.estimatedDuration,
        researchIntensity: planningAnalysis.researchIntensity,
        adaptationTriggers: planningAnalysis.adaptationTriggers,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      // Phase 5: Save planning state for workflow coordination
      await PlanningStateOperations.save(state.sessionId, planningContext, {
        agentName: 'PlanningAgent',
        confidence: 0.85,
        reasoning: [planningAnalysis.reasoning || 'Planning analysis completed'],
        apiRequest: false,
        workflowIntegration: true
      });

      logger.info('Planning state persisted', {
        sessionId: state.sessionId,
        strategy: planningContext.strategy,
        complexity: planningContext.complexity
      });

      // Phase 6: Update workflow state with planning results
      const updatedState = this.updateProgress(state, 100, 'Planning analysis completed');

      const stateWithPlan = {
        ...updatedState,
        planningContext,
        planningAnalysis,
        baseContent
      };

      // Phase 7: Determine next stage based on strategy
      const nextStage = this.determineNextStage(planningContext);

      return this.transitionToStage(stateWithPlan, nextStage);

    } catch (error) {
      const workflowError = error instanceof WorkflowError
        ? error
        : errorContext.createError(WorkflowError, error instanceof Error ? error.message : 'Planning node failed', {
            recoverable: true,
            cause: error instanceof Error ? error : undefined,
          });

      logger.error('Planning node execution failed', {
        sessionId: state.sessionId,
        error: workflowError.message,
      });

      throw workflowError;
    } finally {
      errorContext.cleanup();
    }
  }

  /**
   * Determine next workflow stage based on planning strategy
   */
  private determineNextStage(planningContext: PlanningContext): 'conversation' | 'outline' | 'chapter_spawning' {
    // According to architecture: planning can route adaptively
    switch (planningContext.strategy) {
      case 'sequential':
        // Standard flow: planning -> conversation -> outline -> chapter_spawning
        return 'conversation';

      case 'parallel':
        // For parallel processing, we still need requirements gathering
        return 'conversation';

      case 'hybrid':
        // Hybrid can skip detailed conversation if prompt is comprehensive
        if (planningContext.complexity === 'simple' && planningContext.estimatedWordCount < 40000) {
          // Skip detailed conversation for simple, short books
          return 'outline';
        }
        return 'conversation';

      default:
        return 'conversation';
    }
  }

  /**
   * Validate planning node input
   */
  validate(state: WorkflowState): boolean {
    return !!state.userPrompt && state.userPrompt.length >= 3;
  }

  /**
   * Recover from planning errors
   */
  async recover(state: WorkflowState, error: WorkflowError): Promise<WorkflowState> {
    logger.info('Recovering planning node with simplified analysis', {
      sessionId: state.sessionId,
      error: error.message
    });

    // Create fallback planning context
    const fallbackPlanningContext: PlanningContext = {
      complexity: 'moderate',
      topicCategory: 'General guide',
      estimatedWordCount: 35000,
      strategy: 'sequential',
      approach: 'standard',
      chapterCount: 8,
      estimatedDuration: 45,
      researchIntensity: 'moderate',
      adaptationTriggers: ['quality_score_below_80'],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    // Save fallback state
    try {
      await PlanningStateOperations.save(state.sessionId, fallbackPlanningContext, {
        agentName: 'PlanningAgent',
        confidence: 0.6,
        reasoning: ['Fallback planning due to error'],
        fallback: true
      });
    } catch (saveError) {
      logger.warn('Failed to save fallback planning state', {
        sessionId: state.sessionId,
        error: saveError instanceof Error ? saveError.message : 'Unknown error'
      });
    }

    const stateWithFallback = {
      ...state,
      planningContext: fallbackPlanningContext,
      baseContent: ''
    };

    return this.transitionToStage(stateWithFallback, 'conversation');
  }
}

/**
 * Factory function to create planning node
 */
export function createPlanningNode(): PlanningNode {
  return new PlanningNode();
}