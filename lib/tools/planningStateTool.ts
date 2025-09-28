// Planning State Persistence Tool
// Manages storage and retrieval of planning decisions and strategies
// Follows CLAUDE.md standards: error handling, database integration, tool patterns

import { createTool } from './createTool';
import { createServiceClient } from '@/lib/database/supabaseClient';
import { PlanningContext } from '@/types';
import {
  executeWithDatabaseContext,
  DatabaseError,
  logger,
  withRetry,
  retryDatabase,
} from '@/lib/errors/exports';

/**
 * Planning state operation types
 */
export type PlanningOperation = 'save' | 'load' | 'update' | 'delete' | 'list';

/**
 * Planning state tool parameters
 */
export interface PlanningStateParams {
  operation: PlanningOperation;
  sessionId: string;
  planningContext?: PlanningContext;
  metadata?: {
    agentName?: string;
    confidence?: number;
    reasoning?: string[];
    alternatives?: any[];
  };
}

/**
 * Planning state result
 */
export interface PlanningStateResult {
  success: boolean;
  planningContext?: PlanningContext;
  metadata?: any;
  timestamp?: string;
  error?: string;
}

/**
 * Save planning context to database
 */
async function savePlanningState(
  sessionId: string,
  planningContext: PlanningContext,
  metadata: any = {}
): Promise<void> {
  return executeWithDatabaseContext(
    'savePlanningState',
    'workflow_states',
    async () => {
      const supabase = createServiceClient();

      const planningData = {
        session_id: sessionId,
        node_name: 'planning',
        state_data: {
          planningContext,
          metadata,
          version: '1.0',
          quality_score: metadata.confidence || null,
        },
        timestamp: new Date().toISOString(),
      };

      const { error } = await withRetry(
        () => supabase.from('workflow_states').upsert(planningData),
        retryDatabase
      );

      if (error) {
        throw new DatabaseError(
          'upsert',
          `Failed to save planning state: ${error.message}`,
          {
            table: 'workflow_states',
            sessionId,
            stateType: 'planning',
          }
        );
      }

      logger.info('Planning state saved', {
        sessionId,
        complexity: planningContext.complexity,
        strategy: planningContext.strategy,
        chapterCount: planningContext.chapterCount,
      });
    },
    sessionId
  );
}

/**
 * Load planning context from database
 */
async function loadPlanningState(sessionId: string): Promise<PlanningStateResult> {
  return executeWithDatabaseContext(
    'loadPlanningState',
    'workflow_states',
    async () => {
      const supabase = createServiceClient();

      const { data, error } = await withRetry(
        () =>
          supabase
            .from('workflow_states')
            .select('*')
            .eq('session_id', sessionId)
            .eq('node_name', 'planning')
            .order('timestamp', { ascending: false })
            .limit(1)
            .single(),
        retryDatabase
      );

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned", which is acceptable
        throw new DatabaseError(
          'select',
          `Failed to load planning state: ${error.message}`,
          {
            table: 'workflow_states',
            sessionId,
            stateType: 'planning',
          }
        );
      }

      if (!data) {
        logger.info('No planning state found', { sessionId });
        return {
          success: false,
          error: 'No planning state found for session',
        };
      }

      // Validate and extract planning data
      const stateData = data.state_data;
      if (!stateData || !stateData.planningContext) {
        logger.warn('Invalid planning state data', { sessionId });
        return {
          success: false,
          error: 'Invalid planning state data',
        };
      }

      logger.info('Planning state loaded', {
        sessionId,
        complexity: stateData.planningContext.complexity,
        strategy: stateData.planningContext.strategy,
        timestamp: data.timestamp,
      });

      return {
        success: true,
        planningContext: stateData.planningContext,
        metadata: stateData.metadata,
        timestamp: data.timestamp,
      };
    },
    sessionId
  );
}

/**
 * Update existing planning context
 */
async function updatePlanningState(
  sessionId: string,
  updates: Partial<PlanningContext>,
  metadata: any = {}
): Promise<void> {
  return executeWithDatabaseContext(
    'updatePlanningState',
    'workflow_states',
    async () => {
      // First load existing state
      const existing = await loadPlanningState(sessionId);
      if (!existing.success || !existing.planningContext) {
        throw new DatabaseError(
          'update',
          'Cannot update planning state: no existing state found',
          {
            table: 'workflow_states',
            sessionId,
            stateType: 'planning',
          }
        );
      }

      // Merge updates
      const updatedContext: PlanningContext = {
        ...existing.planningContext,
        ...updates,
        lastUpdated: new Date().toISOString(),
      };

      const mergedMetadata = {
        ...existing.metadata,
        ...metadata,
        updateHistory: [
          ...(existing.metadata?.updateHistory || []),
          {
            timestamp: new Date().toISOString(),
            updates: Object.keys(updates),
          },
        ],
      };

      // Save updated state
      await savePlanningState(sessionId, updatedContext, mergedMetadata);

      logger.info('Planning state updated', {
        sessionId,
        updatedFields: Object.keys(updates),
      });
    },
    sessionId
  );
}

/**
 * Delete planning state for session
 */
async function deletePlanningState(sessionId: string): Promise<void> {
  return executeWithDatabaseContext(
    'deletePlanningState',
    'workflow_states',
    async () => {
      const supabase = createServiceClient();

      const { error } = await withRetry(
        () =>
          supabase
            .from('workflow_states')
            .delete()
            .eq('session_id', sessionId)
            .eq('node_name', 'planning'),
        retryDatabase
      );

      if (error) {
        throw new DatabaseError(
          'delete',
          `Failed to delete planning state: ${error.message}`,
          {
            table: 'workflow_states',
            sessionId,
            stateType: 'planning',
          }
        );
      }

      logger.info('Planning state deleted', { sessionId });
    },
    sessionId
  );
}

/**
 * List planning states (for debugging/admin)
 */
async function listPlanningStates(sessionId?: string): Promise<any[]> {
  return executeWithDatabaseContext(
    'listPlanningStates',
    'workflow_states',
    async () => {
      const supabase = createServiceClient();

      let query = supabase
        .from('workflow_states')
        .select('session_id, state_data, timestamp')
        .eq('node_name', 'planning')
        .order('timestamp', { ascending: false });

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await withRetry(() => query, retryDatabase);

      if (error) {
        throw new DatabaseError(
          'select',
          `Failed to list planning states: ${error.message}`,
          {
            table: 'workflow_states',
            sessionId,
            stateType: 'planning',
          }
        );
      }

      return data || [];
    },
    sessionId || 'system'
  );
}

/**
 * Planning State Tool implementation
 */
export const planningStateTool = createTool({
  name: 'planning_state',
  description: 'Persist and retrieve planning context and strategy decisions for workflow coordination',
  parameters: {
    operation: 'save | load | update | delete | list',
    sessionId: 'string',
    planningContext: 'PlanningContext (for save/update operations)',
    metadata: 'object (optional metadata for planning decision context)',
  },
  execute: async (params: PlanningStateParams): Promise<PlanningStateResult> => {
    const { operation, sessionId, planningContext, metadata = {} } = params;

    // Validate required parameters
    if (!operation || !sessionId) {
      throw new Error('operation and sessionId are required');
    }

    switch (operation) {
      case 'save':
        if (!planningContext) {
          throw new Error('planningContext is required for save operation');
        }
        await savePlanningState(sessionId, planningContext, metadata);
        return {
          success: true,
          planningContext,
          timestamp: new Date().toISOString(),
        };

      case 'load':
        return await loadPlanningState(sessionId);

      case 'update':
        if (!planningContext) {
          throw new Error('planningContext is required for update operation');
        }
        await updatePlanningState(sessionId, planningContext, metadata);
        const updated = await loadPlanningState(sessionId);
        return updated;

      case 'delete':
        await deletePlanningState(sessionId);
        return {
          success: true,
          timestamp: new Date().toISOString(),
        };

      case 'list':
        const states = await listPlanningStates(sessionId);
        return {
          success: true,
          metadata: { states, count: states.length },
          timestamp: new Date().toISOString(),
        };

      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  },
  validateParams: (params: any) => {
    if (!params.operation || !params.sessionId) {
      throw new Error('operation and sessionId parameters are required');
    }

    const validOperations: PlanningOperation[] = ['save', 'load', 'update', 'delete', 'list'];
    if (!validOperations.includes(params.operation)) {
      throw new Error(`Invalid operation: ${params.operation}. Must be one of: ${validOperations.join(', ')}`);
    }

    if (['save', 'update'].includes(params.operation) && !params.planningContext) {
      throw new Error(`planningContext is required for ${params.operation} operation`);
    }
  },
});

/**
 * Convenience functions for common planning state operations
 */
export const PlanningStateOperations = {
  /**
   * Save planning context
   */
  async save(sessionId: string, planningContext: PlanningContext, metadata?: any): Promise<void> {
    await planningStateTool.invoke({
      operation: 'save',
      sessionId,
      planningContext,
      metadata,
    });
  },

  /**
   * Load planning context
   */
  async load(sessionId: string): Promise<PlanningContext | null> {
    const result = await planningStateTool.invoke({
      operation: 'load',
      sessionId,
    });
    return result.success ? result.planningContext || null : null;
  },

  /**
   * Update planning context
   */
  async update(sessionId: string, updates: Partial<PlanningContext>, metadata?: any): Promise<PlanningContext | null> {
    const result = await planningStateTool.invoke({
      operation: 'update',
      sessionId,
      planningContext: updates as PlanningContext,
      metadata,
    });
    return result.success ? result.planningContext || null : null;
  },

  /**
   * Delete planning context
   */
  async delete(sessionId: string): Promise<void> {
    await planningStateTool.invoke({
      operation: 'delete',
      sessionId,
    });
  },

  /**
   * Check if planning context exists
   */
  async exists(sessionId: string): Promise<boolean> {
    const result = await planningStateTool.invoke({
      operation: 'load',
      sessionId,
    });
    return result.success;
  },
};