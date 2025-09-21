// Workflow State Persistence and Recovery System
// Handles checkpointing and recovery for LangGraph workflow state
// Following CLAUDE.md standards and database architecture

import { WorkflowState } from '@/types';
import { supabase } from '@/lib/database/supabaseClient';
import {
  executeWithDatabaseContext,
  DatabaseError,
  logger,
  withRetry,
  retryDatabase,
} from '@/lib/errors/exports';

/**
 * Save workflow state as checkpoint for recovery
 * Creates or updates workflow state record in database
 */
export async function saveCheckpoint(
  sessionId: string,
  state: WorkflowState
): Promise<void> {
  return executeWithDatabaseContext(
    'saveCheckpoint',
    { sessionId, stage: state.currentStage },
    async () => {
      // Compress state data for storage
      const compressedState = compressStateForStorage(state);

      const { error } = await withRetry(
        () =>
          supabase.from('workflow_states').upsert({
            session_id: sessionId,
            node_name: state.currentStage,
            state_data: compressedState,
            timestamp: new Date().toISOString(),
          }),
        retryDatabase
      );

      if (error) {
        throw new DatabaseError(
          'upsert',
          `Failed to save checkpoint: ${error.message}`,
          {
            table: 'workflow_states',
            sessionId,
            stage: state.currentStage,
          }
        );
      }

      logger.info('Workflow checkpoint saved', {
        sessionId,
        stage: state.currentStage,
        progress: state.progress.overallProgress,
      });
    },
    sessionId
  );
}

/**
 * Recover workflow state from last successful checkpoint
 * Returns the most recent workflow state or initial state if none found
 */
export async function recoverWorkflow(sessionId: string): Promise<WorkflowState> {
  return executeWithDatabaseContext(
    'recoverWorkflow',
    { sessionId },
    async () => {
      const { data, error } = await withRetry(
        () =>
          supabase
            .from('workflow_states')
            .select('*')
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single(),
        retryDatabase
      );

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned", which is acceptable
        throw new DatabaseError(
          'select',
          `Failed to recover workflow state: ${error.message}`,
          {
            table: 'workflow_states',
            sessionId,
          }
        );
      }

      if (!data) {
        logger.info('No checkpoint found, returning initial state', { sessionId });
        return getInitialWorkflowState(sessionId);
      }

      // Decompress and validate state data
      const recoveredState = decompressStateFromStorage(data.state_data, sessionId);

      logger.info('Workflow state recovered from checkpoint', {
        sessionId,
        stage: recoveredState.currentStage,
        progress: recoveredState.progress.overallProgress,
        timestamp: data.timestamp,
      });

      return recoveredState;
    },
    sessionId
  );
}

/**
 * Get all checkpoints for a session (for debugging/admin purposes)
 */
export async function getSessionCheckpoints(sessionId: string): Promise<any[]> {
  return executeWithDatabaseContext(
    'getSessionCheckpoints',
    { sessionId },
    async () => {
      const { data, error } = await withRetry(
        () =>
          supabase
            .from('workflow_states')
            .select('*')
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: false }),
        retryDatabase
      );

      if (error) {
        throw new DatabaseError(
          'select',
          `Failed to fetch session checkpoints: ${error.message}`,
          {
            table: 'workflow_states',
            sessionId,
          }
        );
      }

      return data || [];
    },
    sessionId
  );
}

/**
 * Clear all checkpoints for a session (cleanup after completion)
 */
export async function clearSessionCheckpoints(sessionId: string): Promise<void> {
  return executeWithDatabaseContext(
    'clearSessionCheckpoints',
    { sessionId },
    async () => {
      const { error } = await withRetry(
        () =>
          supabase.from('workflow_states').delete().eq('session_id', sessionId),
        retryDatabase
      );

      if (error) {
        throw new DatabaseError(
          'delete',
          `Failed to clear session checkpoints: ${error.message}`,
          {
            table: 'workflow_states',
            sessionId,
          }
        );
      }

      logger.info('Session checkpoints cleared', { sessionId });
    },
    sessionId
  );
}

/**
 * Update book session status in database
 */
export async function updateSessionStatus(
  sessionId: string,
  status: 'active' | 'completed' | 'failed',
  currentStage?: string
): Promise<void> {
  return executeWithDatabaseContext(
    'updateSessionStatus',
    { sessionId, status },
    async () => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (currentStage) {
        updateData.current_stage = currentStage;
      }

      const { error } = await withRetry(
        () => supabase.from('book_sessions').update(updateData).eq('id', sessionId),
        retryDatabase
      );

      if (error) {
        throw new DatabaseError(
          'update',
          `Failed to update session status: ${error.message}`,
          {
            table: 'book_sessions',
            sessionId,
            status,
          }
        );
      }

      logger.info('Session status updated', { sessionId, status, currentStage });
    },
    sessionId
  );
}

/**
 * Compress workflow state for efficient database storage
 * Removes large temporary data and optimizes for size
 */
function compressStateForStorage(state: WorkflowState): any {
  const compressed = {
    ...state,
    // Remove large binary data
    pdfFile: undefined,
    // Compress chapters to essential data only
    chapters: state.chapters.map((chapter) => ({
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      status: chapter.status,
      wordCount: chapter.wordCount,
      // Keep content if reasonably sized, otherwise just metadata
      content:
        chapter.content && chapter.content.length < 10000
          ? chapter.content
          : undefined,
    })),
  };

  return compressed;
}

/**
 * Decompress and validate workflow state from storage
 * Ensures state data integrity and provides defaults for missing fields
 */
function decompressStateFromStorage(
  stateData: any,
  sessionId: string
): WorkflowState {
  if (!stateData || typeof stateData !== 'object') {
    logger.warn('Invalid state data in checkpoint, using initial state', {
      sessionId,
    });
    return getInitialWorkflowState(sessionId);
  }

  // Validate required fields and provide defaults
  const state: WorkflowState = {
    sessionId: stateData.sessionId || sessionId,
    userId: stateData.userId,
    currentStage: stateData.currentStage || 'conversation',
    status: stateData.status || 'active',
    userPrompt: stateData.userPrompt || '',
    baseContent: stateData.baseContent,
    requirements: stateData.requirements,
    styleGuide: stateData.styleGuide,
    outline: stateData.outline,
    chapters: stateData.chapters || [],
    currentChapter: stateData.currentChapter,
    progress: {
      currentStageProgress: 0,
      overallProgress: 0,
      chaptersCompleted: 0,
      totalChapters: 0,
      ...stateData.progress,
    },
    error: stateData.error,
    needsRetry: stateData.needsRetry || false,
    retryCount: stateData.retryCount || 0,
    createdAt: stateData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return state;
}

/**
 * Create initial workflow state for new sessions
 */
function getInitialWorkflowState(sessionId: string): WorkflowState {
  const now = new Date().toISOString();

  return {
    sessionId,
    currentStage: 'conversation',
    status: 'active',
    userPrompt: '',
    chapters: [],
    progress: {
      currentStageProgress: 0,
      overallProgress: 0,
      chaptersCompleted: 0,
      totalChapters: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Workflow state compression statistics (for monitoring)
 */
export interface StateCompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  largeFieldsRemoved: string[];
}

/**
 * Analyze state compression for monitoring and optimization
 */
export function analyzeStateCompression(
  originalState: WorkflowState
): StateCompressionStats {
  const originalSize = JSON.stringify(originalState).length;
  const compressed = compressStateForStorage(originalState);
  const compressedSize = JSON.stringify(compressed).length;

  const largeFieldsRemoved: string[] = [];
  if (originalState.pdfFile) largeFieldsRemoved.push('pdfFile');

  return {
    originalSize,
    compressedSize,
    compressionRatio: originalSize > 0 ? compressedSize / originalSize : 1,
    largeFieldsRemoved,
  };
}