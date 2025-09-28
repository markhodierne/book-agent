import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { bookWorkflowGraph, createInitialState } from '@/lib/agents/workflow';
import { createPlanningNode } from '@/lib/agents/nodes/planning';
import { createConversationNode } from '@/lib/agents/nodes/conversation';
import { createServiceClient } from '@/lib/database/supabaseClient';
import { logger } from '@/lib/errors/exports';

/**
 * LangGraph Workflow Execution API
 * Executes the complete book generation workflow with state persistence
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPrompt, action, sessionId: providedSessionId, pdfFile, userId } = body;

    // Validate required fields
    if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'userPrompt is required and must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Generate or use provided session ID
    const sessionId = providedSessionId || randomUUID();

    logger.info('Workflow API request', {
      sessionId,
      action: action || 'start',
      promptLength: userPrompt.length,
      hasPdfFile: !!pdfFile,
      userId
    });

    // Create Supabase client for session management
    const supabase = createServiceClient();

    // Create or update book session
    const { error: sessionError } = await supabase
      .from('book_sessions')
      .upsert({
        id: sessionId,
        user_id: userId || null,
        status: 'active',
        current_stage: 'planning',
        adaptive_plan: {},
        collaboration_summary: {},
        learning_insights: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (sessionError) {
      logger.error('Failed to create/update book session', {
        sessionId,
        error: sessionError?.message || sessionError,
        errorCode: sessionError?.code,
        errorDetails: sessionError?.details
      });
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Handle different workflow actions
    switch (action) {
      case 'start':
      case 'planning':
        return await executePlanningStage(sessionId, userPrompt, pdfFile, userId);

      case 'conversation':
        return await executeConversationStage(sessionId);

      case 'status':
        return await getWorkflowStatus(sessionId);

      default:
        return await executePlanningStage(sessionId, userPrompt, pdfFile, userId);
    }

  } catch (error) {
    logger.error('Workflow API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Internal server error during workflow execution' },
      { status: 500 }
    );
  }
}

/**
 * Execute Planning Stage (Stage 0)
 */
async function executePlanningStage(
  sessionId: string,
  userPrompt: string,
  pdfFile?: string,
  userId?: string
): Promise<NextResponse> {
  try {
    logger.info('Executing planning stage', { sessionId, userPrompt });

    // Create initial workflow state
    const initialState = createInitialState(
      sessionId,
      userPrompt,
      userId,
      pdfFile ? Buffer.from(pdfFile, 'base64') : undefined
    );

    // Create and execute planning node
    const planningNode = createPlanningNode();

    // Validate input
    if (!planningNode.validate(initialState)) {
      throw new Error('Planning node validation failed');
    }

    // Execute planning node
    const planningResult = await planningNode.execute(initialState);

    logger.info('Planning stage completed', {
      sessionId,
      nextStage: planningResult.currentStage,
      complexity: planningResult.planningContext?.complexity,
      strategy: planningResult.planningContext?.strategy
    });

    // Return planning results with next steps
    return NextResponse.json({
      success: true,
      sessionId,
      stage: 'planning',
      nextStage: planningResult.currentStage,
      planningContext: planningResult.planningContext,
      planningAnalysis: planningResult.planningAnalysis,
      progress: planningResult.progress,
      message: 'Planning analysis completed successfully',
      canProceed: true
    });

  } catch (error) {
    logger.error('Planning stage execution failed', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: `Planning stage failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sessionId,
      stage: 'planning',
      canRetry: true
    }, { status: 500 });
  }
}

/**
 * Execute Conversation Stage (Stage 1)
 */
async function executeConversationStage(sessionId: string): Promise<NextResponse> {
  try {
    logger.info('Executing conversation stage', { sessionId });

    // Load current workflow state from planning stage
    const supabase = createServiceClient();
    const { data: planningState, error: planningError } = await supabase
      .from('workflow_states')
      .select('*')
      .eq('session_id', sessionId)
      .eq('node_name', 'planning')
      .single();

    if (planningError || !planningState) {
      throw new Error('Planning state not found. Must complete planning stage first.');
    }

    // Reconstruct workflow state from planning results
    const workflowState = {
      sessionId,
      currentStage: 'conversation' as const,
      userPrompt: planningState.state_data?.userPrompt || '',
      planningContext: planningState.state_data?.planningContext,
      planningAnalysis: planningState.state_data?.planningAnalysis,
      baseContent: planningState.state_data?.baseContent || '',
      progress: {
        currentStageProgress: 0,
        overallProgress: 15,
        chaptersCompleted: 0,
        totalChapters: planningState.state_data?.planningContext?.chapterCount || 8,
      },
      createdAt: planningState.timestamp,
      updatedAt: new Date().toISOString(),
      status: 'active',
      chapters: [],
    };

    // Create and execute conversation node
    const conversationNode = createConversationNode();

    // Validate input
    if (!conversationNode.validate(workflowState)) {
      throw new Error('Conversation node validation failed');
    }

    // Execute conversation node
    const conversationResult = await conversationNode.execute(workflowState);

    logger.info('Conversation stage completed', {
      sessionId,
      nextStage: conversationResult.currentStage,
      hasRequirements: !!conversationResult.requirements,
      hasStyleGuide: !!conversationResult.styleGuide
    });

    // Save conversation results to workflow state
    await supabase
      .from('workflow_states')
      .upsert({
        session_id: sessionId,
        node_name: 'conversation',
        state_data: {
          requirements: conversationResult.requirements,
          styleGuide: conversationResult.styleGuide,
          baseContent: conversationResult.baseContent,
          conversationHistory: conversationResult.conversationHistory
        },
        timestamp: new Date().toISOString()
      });

    // Return conversation results
    return NextResponse.json({
      success: true,
      sessionId,
      stage: 'conversation',
      nextStage: conversationResult.currentStage,
      requirements: conversationResult.requirements,
      styleGuide: conversationResult.styleGuide,
      conversationHistory: conversationResult.conversationHistory,
      progress: conversationResult.progress,
      message: 'Requirements gathering completed successfully',
      canProceed: true
    });

  } catch (error) {
    logger.error('Conversation stage execution failed', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: `Conversation stage failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sessionId,
      stage: 'conversation',
      canRetry: true
    }, { status: 500 });
  }
}

/**
 * Get Workflow Status
 */
async function getWorkflowStatus(sessionId: string): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();

    // Get session info
    const { data: session, error: sessionError } = await supabase
      .from('book_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 });
    }

    // Get all workflow states
    const { data: workflowStates, error: statesError } = await supabase
      .from('workflow_states')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false });

    if (statesError) {
      throw new Error(`Failed to load workflow states: ${statesError.message}`);
    }

    return NextResponse.json({
      success: true,
      sessionId,
      session,
      workflowStates: workflowStates || [],
      currentStage: session.current_stage,
      status: session.status
    });

  } catch (error) {
    logger.error('Failed to get workflow status', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json({
      success: false,
      error: `Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}