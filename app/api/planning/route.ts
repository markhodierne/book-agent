import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { planningAgent, PlanningAgent } from '@/lib/agents/planning/PlanningAgent';
import { PlanningStateOperations } from '@/lib/tools/planningStateTool';
import { createServiceClient } from '@/lib/database/supabaseClient';
import { logger } from '@/lib/errors/exports';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPrompt, baseContent, sessionId: providedSessionId } = body;

    // Validate required fields
    if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'userPrompt is required and must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Generate or use provided session ID
    const sessionId = providedSessionId || randomUUID();

    logger.info('Planning Agent API request', {
      sessionId,
      promptLength: userPrompt.length,
      hasBaseContent: !!baseContent
    });

    // Create book session in database first (required for foreign key)
    const supabase = createServiceClient();
    const { error: sessionError } = await supabase
      .from('book_sessions')
      .upsert({
        id: sessionId,
        user_id: null, // Anonymous user for now
        requirements: {
          userPrompt,
          hasBaseContent: !!baseContent,
          createdAt: new Date().toISOString()
        }
      }, {
        onConflict: 'id'
      });

    if (sessionError) {
      logger.error('Failed to create book session', {
        sessionId,
        error: sessionError.message
      });
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Call Planning Agent
    const planningRequest = {
      userPrompt: userPrompt.trim(),
      baseContent: baseContent || undefined,
    };

    const analysis = await planningAgent.createPlan(planningRequest);

    // Convert to PlanningContext for storage
    const planningContext = PlanningAgent.toPlanningContext(analysis);

    // Save planning state to database
    await PlanningStateOperations.save(sessionId, planningContext, {
      agentName: 'PlanningAgent',
      confidence: 0.85,
      reasoning: [analysis.reasoning || 'Planning analysis completed'],
      apiRequest: true
    });

    logger.info('Planning Agent completed successfully', {
      sessionId,
      complexity: analysis.complexity,
      strategy: analysis.strategy,
      chapterCount: analysis.chapterCount
    });

    // Return the analysis with session info
    return NextResponse.json({
      success: true,
      sessionId,
      analysis,
      planningContext
    });

  } catch (error) {
    logger.error('Planning Agent API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Internal server error during planning analysis' },
      { status: 500 }
    );
  }
}