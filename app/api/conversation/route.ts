import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { planningAgent, PlanningAgent } from '@/lib/agents/planning/PlanningAgent';
import { PlanningStateOperations } from '@/lib/tools/planningStateTool';
import { createServiceClient } from '@/lib/database/supabaseClient';
import { createGPT5Agent } from '@/lib/agents/gpt5-wrapper';
import { logger } from '@/lib/errors/exports';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userMessage, conversationHistory, userPrompt, sessionId: providedSessionId } = body;

    // Validate required fields
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length < 1) {
      return NextResponse.json(
        { error: 'userMessage is required' },
        { status: 400 }
      );
    }

    // Generate or use provided session ID
    const sessionId = providedSessionId || randomUUID();

    // Create book session if new
    const supabase = createServiceClient();
    const { error: sessionError } = await supabase
      .from('book_sessions')
      .upsert({
        id: sessionId,
        user_id: null,
        requirements: {
          userPrompt: userPrompt || 'Conversation in progress',
          conversationStarted: new Date().toISOString()
        }
      }, {
        onConflict: 'id'
      });

    if (sessionError) {
      logger.error('Failed to create/update book session', {
        sessionId,
        error: sessionError.message
      });
    }

    // Create intelligent conversational agent
    const conversationAgent = createGPT5Agent({
      name: 'Book Planning Conversation Agent',
      instructions: `You are an expert book planning assistant having a natural conversation with the user to understand their book requirements. Your goal is to gather enough information to create a comprehensive book plan.

CONVERSATION FLOW:
1. Start by understanding their book topic and goals
2. Naturally explore: target audience, writing style, scope, special features
3. When you have sufficient information, provide a comprehensive analysis and plan

INFORMATION TO GATHER:
- Book topic and main goals
- Target audience (experience level, demographics)
- Writing style preference (conversational, academic, practical, etc.)
- Scope and depth (quick guide vs comprehensive reference)
- Special features (tutorials, exercises, case studies, etc.)
- Any constraints or specific requirements

WHEN TO PROVIDE PLANNING ANALYSIS:
When you have gathered sufficient information about the above areas, provide a structured planning analysis in this EXACT format:

**PLANNING_ANALYSIS_READY**
{
  "complexity": "simple|moderate|complex|expert",
  "topicCategory": "brief description",
  "estimatedWordCount": number,
  "strategy": "sequential|parallel|hybrid",
  "approach": "standard|research_heavy|narrative_focused|technical_deep|practical_guide",
  "chapterCount": number,
  "estimatedDuration": number,
  "researchIntensity": "minimal|moderate|extensive|expert",
  "adaptationTriggers": ["trigger1", "trigger2"],
  "reasoning": "explanation of decisions"
}

CONVERSATION GUIDELINES:
- Be natural and conversational
- Ask clarifying questions when needed
- Build on previous conversation context
- Don't rush - gather quality information
- Only provide analysis when you have sufficient information
- Use the user's initial prompt: "${userPrompt || 'their book idea'}" as context

CURRENT CONVERSATION CONTEXT:
${conversationHistory ? conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n') : 'This is the start of the conversation.'}

USER'S INITIAL BOOK IDEA: ${userPrompt || 'Not specified yet'}

Respond naturally to help plan their book!`,
      reasoning_effort: 'medium',
      verbosity: 'medium'
    });

    // Get conversational response
    const response = await conversationAgent.execute(userMessage);
    let responseContent = response.content;
    let planningAnalysis = null;
    let conversationComplete = false;

    // Check if the agent provided a planning analysis
    if (responseContent.includes('**PLANNING_ANALYSIS_READY**')) {
      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          planningAnalysis = JSON.parse(jsonMatch[0]);
          conversationComplete = true;

          // Convert to PlanningContext and save to database
          const planningContext = PlanningAgent.toPlanningContext(planningAnalysis);

          await PlanningStateOperations.save(sessionId, planningContext, {
            agentName: 'ConversationalPlanningAgent',
            confidence: 0.85,
            reasoning: [planningAnalysis.reasoning || 'Conversational planning completed'],
            conversationBased: true
          });

          // Clean up response to remove the JSON
          responseContent = responseContent.replace(/\*\*PLANNING_ANALYSIS_READY\*\*[\s\S]*?\}/, '').trim();

          // Add a natural conclusion
          responseContent += `\n\n🎯 **Perfect! I now have everything needed to create your book plan.**

Based on our conversation, here's your optimized book strategy:

**📊 Analysis Results:**
• **Complexity Level**: ${planningAnalysis.complexity.toUpperCase()}
• **Generation Strategy**: ${planningAnalysis.strategy.toUpperCase()}
• **Content Approach**: ${planningAnalysis.approach.replace('_', ' ').toUpperCase()}
• **Recommended Scope**: ${planningAnalysis.estimatedWordCount.toLocaleString()} words across ${planningAnalysis.chapterCount} chapters
• **Research Level**: ${planningAnalysis.researchIntensity.toUpperCase()}
• **Time Estimate**: ~${planningAnalysis.estimatedDuration} minutes

Your requirements are complete! Ready to proceed to the outline phase?`;

          logger.info('Conversational planning completed', {
            sessionId,
            complexity: planningAnalysis.complexity,
            strategy: planningAnalysis.strategy,
            chapterCount: planningAnalysis.chapterCount
          });
        }
      } catch (error) {
        logger.error('Failed to parse planning analysis from conversation', {
          sessionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      content: responseContent,
      planningAnalysis,
      conversationComplete,
      requirementsGathered: !!planningAnalysis
    });

  } catch (error) {
    logger.error('Conversation API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Internal server error during conversation' },
      { status: 500 }
    );
  }
}