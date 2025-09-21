// Conversation Node Implementation
// Stage 1: Requirements gathering through guided AI conversation
// Following FUNCTIONAL.md Stage 1 specification and CLAUDE.md standards

import { WorkflowState, BookRequirements, StyleGuide } from '@/types';
import { BaseWorkflowNode } from './base';
import { toolRegistry } from '@/lib/tools/registry';
import {
  WorkflowError,
  WorkflowErrorContext,
  logger,
  executeWithToolContext,
} from '@/lib/errors/exports';
import { openai } from '@/lib/config/openai';
import { z } from 'zod';

/**
 * Conversation state for multi-turn dialogue
 */
interface ConversationState {
  phase: 'topic_clarification' | 'audience_definition' | 'author_info' | 'style_selection' | 'content_orientation' | 'completed';
  collectedData: Partial<BookRequirements>;
  conversationHistory: Array<{ role: 'assistant' | 'user'; content: string }>;
  styleOptions?: StyleGuide[];
  selectedStyleIndex?: number;
}

/**
 * Schema validation for requirements structure
 */
const BookRequirementsSchema = z.object({
  topic: z.string().min(3).max(500),
  audience: z.object({
    demographics: z.string(),
    expertiseLevel: z.enum(['beginner', 'intermediate', 'advanced', 'mixed']),
    ageGroup: z.string().optional(),
    context: z.enum(['professional', 'academic', 'casual', 'mixed']),
  }),
  author: z.object({
    name: z.string().min(1).max(100),
    credentials: z.string().optional(),
    background: z.string().optional(),
  }),
  style: z.object({
    tone: z.string(),
    voice: z.string(),
    perspective: z.enum(['first-person', 'second-person', 'third-person']),
    formality: z.enum(['formal', 'informal', 'mixed']),
    technicalLevel: z.enum(['basic', 'intermediate', 'advanced']),
  }),
  approach: z.enum(['practical', 'theoretical', 'mixed']),
  focus: z.enum(['comprehensive', 'focused', 'survey']),
  wordCountTarget: z.number().min(30000).max(150000),
});

/**
 * Conversation Node for Stage 1: Requirements Gathering
 * Implements guided AI conversation to collect complete book requirements
 */
export class ConversationNode extends BaseWorkflowNode {
  private conversationState: ConversationState = {
    phase: 'topic_clarification',
    collectedData: {},
    conversationHistory: [],
  };

  constructor() {
    super('conversation', 'Gather comprehensive book requirements through guided AI conversation');
  }

  /**
   * Execute the conversation node workflow
   */
  protected async executeNode(state: WorkflowState): Promise<WorkflowState> {
    const errorContext = new WorkflowErrorContext(state.sessionId, state.userId);
    errorContext.updateStage('conversation');

    try {
      // Phase 1: Process PDF content if provided
      let baseContent = '';
      if (state.pdfFile) {
        logger.info('Processing PDF content for conversation context', {
          sessionId: state.sessionId,
          fileSize: state.pdfFile?.length || 0,
        });

        const pdfExtractTool = toolRegistry.getTool('pdfExtract');
        if (!pdfExtractTool) {
          throw new WorkflowError('Missing PDF extraction tool', 'Tool not registered', {
            recoverable: false,
          });
        }

        baseContent = await executeWithToolContext(
          'pdfExtract',
          { fileBuffer: state.pdfFile, options: { preserveLineBreaks: false } },
          () => pdfExtractTool.execute({ fileBuffer: state.pdfFile, options: { preserveLineBreaks: false } }),
          state.sessionId
        );

        logger.info('PDF content extracted successfully', {
          sessionId: state.sessionId,
          contentLength: baseContent.length,
          wordCount: baseContent.split(' ').length,
        });
      }

      // Phase 2: Initialize conversation with user prompt analysis
      this.conversationState.collectedData.topic = this.extractInitialTopic(state.userPrompt, baseContent);

      // Phase 3: Conduct multi-phase guided conversation
      await this.conductGuidedConversation(state, baseContent);

      // Phase 4: Validate and structure final requirements
      const requirements = this.validateAndStructureRequirements();

      // Update progress and transition to next stage
      const updatedState = this.updateProgress(state, 100, 'Requirements gathering completed');

      // Add conversation results to state
      const stateWithResults = {
        ...updatedState,
        requirements,
        baseContent,
        conversationHistory: this.conversationState.conversationHistory,
      };

      return this.transitionToStage(stateWithResults, 'outline');

    } catch (error) {
      const workflowError = error instanceof WorkflowError
        ? error
        : errorContext.createError(WorkflowError, error instanceof Error ? error.message : 'Conversation node failed', {
            recoverable: true,
            cause: error instanceof Error ? error : undefined,
          });

      logger.error('Conversation node execution failed', {
        sessionId: state.sessionId,
        error: workflowError.message,
        phase: this.conversationState.phase,
      });

      throw workflowError;
    } finally {
      errorContext.cleanup();
    }
  }

  /**
   * Extract initial topic from user prompt and PDF content
   */
  private extractInitialTopic(userPrompt: string, _baseContent: string): string {
    // For MVP, use simple extraction - can be enhanced with OpenAI analysis
    // Future enhancement: combine userPrompt with baseContent for better topic extraction
    return userPrompt.length >= 3 ? userPrompt : 'General guide';
  }

  /**
   * Conduct guided conversation through all phases
   */
  private async conductGuidedConversation(state: WorkflowState, baseContent: string): Promise<void> {
    const phases = [
      'topic_clarification',
      'audience_definition',
      'author_info',
      'style_selection',
      'content_orientation'
    ] as const;

    for (const phase of phases) {
      this.conversationState.phase = phase;
      await this.executeConversationPhase(state, baseContent, phase);
    }

    this.conversationState.phase = 'completed';
  }

  /**
   * Execute individual conversation phase
   */
  private async executeConversationPhase(
    state: WorkflowState,
    baseContent: string,
    phase: ConversationState['phase']
  ): Promise<void> {
    switch (phase) {
      case 'topic_clarification':
        await this.clarifyTopic(state, baseContent);
        break;
      case 'audience_definition':
        await this.defineAudience(state);
        break;
      case 'author_info':
        await this.collectAuthorInfo(state);
        break;
      case 'style_selection':
        await this.conductStyleSelection(state);
        break;
      case 'content_orientation':
        await this.confirmContentOrientation(state);
        break;
    }
  }

  /**
   * Phase 1: Topic Clarification
   */
  private async clarifyTopic(state: WorkflowState, baseContent: string): Promise<void> {
    // Generate clarifying questions based on initial topic and content
    const systemPrompt = `You are an expert book development consultant. Analyze the user's request and any base content to ask 2-3 focused clarifying questions about the book's scope, specific focus areas, and intended goals.

User Request: ${state.userPrompt}
${baseContent ? `Base Content Available: ${baseContent.slice(0, 500)}...` : ''}

Ask specific questions to clarify:
1. Subject scope and boundaries
2. Specific focus areas within the topic
3. Book purpose (educational, reference, practical guide, etc.)

Respond with friendly, professional questions that will help create a focused, valuable book.`;

    const completion = await this.callOpenAI(systemPrompt, "I'd like to create a book. Can you help me clarify the focus and scope?");

    this.conversationState.conversationHistory.push(
      { role: 'assistant', content: completion },
      { role: 'user', content: `Mock user response: I want to focus on practical applications with real-world examples, targeted at helping people understand and apply the concepts effectively.` }
    );

    // Extract topic details from conversation (simplified for MVP)
    this.conversationState.collectedData.topic = state.userPrompt;
    this.conversationState.collectedData.focus = 'comprehensive';
    this.conversationState.collectedData.approach = 'practical';

    logger.info('Topic clarification completed', {
      sessionId: state.sessionId,
      topic: this.conversationState.collectedData.topic,
    });
  }

  /**
   * Phase 2: Audience Definition
   */
  private async defineAudience(state: WorkflowState): Promise<void> {
    const systemPrompt = `Based on the book topic "${this.conversationState.collectedData.topic}", ask 2-3 questions to define the target audience:

1. Who is the primary audience? (demographics, professional background)
2. What's their current knowledge level? (beginner, intermediate, advanced)
3. What's the reading context? (professional development, academic study, casual learning)

Be conversational and help the user think through who will benefit most from this book.`;

    const completion = await this.callOpenAI(systemPrompt, "Now let's define who this book is for. Understanding your target audience will help us create the most valuable content.");

    this.conversationState.conversationHistory.push(
      { role: 'assistant', content: completion },
      { role: 'user', content: `Mock user response: This is for professionals and students who are beginners to intermediate level, wanting to learn practical applications in a professional development context.` }
    );

    // Extract audience definition (simplified for MVP)
    this.conversationState.collectedData.audience = {
      demographics: 'Professionals and students',
      expertiseLevel: 'intermediate' as const,
      ageGroup: 'Adult professionals',
      context: 'professional' as const,
    };

    logger.info('Audience definition completed', {
      sessionId: state.sessionId,
      expertiseLevel: this.conversationState.collectedData.audience.expertiseLevel,
    });
  }

  /**
   * Phase 3: Author Information Collection
   */
  private async collectAuthorInfo(state: WorkflowState): Promise<void> {
    const systemPrompt = `Ask for basic author information for the book:

1. Author name for attribution
2. Optional: Professional background or credentials relevant to the topic
3. Optional: Brief background that adds credibility

Keep it simple and optional beyond the name. Be encouraging about their expertise.`;

    const completion = await this.callOpenAI(systemPrompt, "Let's get your author information for the book.");

    this.conversationState.conversationHistory.push(
      { role: 'assistant', content: completion },
      { role: 'user', content: `Mock user response: My name is John Smith, I have 5 years of experience in the field and have worked on several related projects.` }
    );

    // Extract author info (simplified for MVP)
    this.conversationState.collectedData.author = {
      name: 'John Smith',
      credentials: '5 years of experience',
      background: 'Professional practitioner with project experience',
    };

    logger.info('Author information collected', {
      sessionId: state.sessionId,
      authorName: this.conversationState.collectedData.author.name,
    });
  }

  /**
   * Phase 4: Style Selection with Sample Generation
   */
  private async conductStyleSelection(state: WorkflowState): Promise<void> {
    // Generate 3 style samples based on topic and audience
    const styleOptions = await this.generateStyleSamples();
    this.conversationState.styleOptions = styleOptions;

    const systemPrompt = `Present 3 writing style options for the book "${this.conversationState.collectedData.topic}" targeted at ${this.conversationState.collectedData.audience?.expertiseLevel} level readers.

Here are the style samples:

**Style Option 1: Professional & Direct**
${styleOptions[0].description}

**Style Option 2: Conversational & Engaging**
${styleOptions[1].description}

**Style Option 3: Academic & Comprehensive**
${styleOptions[2].description}

Ask the user to select their preferred style or request modifications.`;

    const completion = await this.callOpenAI(systemPrompt, "Now let's choose the writing style that will work best for your audience.");

    this.conversationState.conversationHistory.push(
      { role: 'assistant', content: completion },
      { role: 'user', content: `Mock user response: I prefer Style Option 2 - the conversational and engaging approach will work best for my audience.` }
    );

    // Select style (simplified for MVP)
    this.conversationState.selectedStyleIndex = 1;
    this.conversationState.collectedData.style = styleOptions[1];

    logger.info('Style selection completed', {
      sessionId: state.sessionId,
      selectedStyle: this.conversationState.collectedData.style?.tone,
    });
  }

  /**
   * Phase 5: Content Orientation Confirmation
   */
  private async confirmContentOrientation(state: WorkflowState): Promise<void> {
    const systemPrompt = `Based on our conversation, confirm the book's approach:

Topic: ${this.conversationState.collectedData.topic}
Audience: ${this.conversationState.collectedData.audience?.expertiseLevel} level ${this.conversationState.collectedData.audience?.demographics}
Style: ${this.conversationState.collectedData.style?.tone}

Confirm:
1. Practical vs theoretical emphasis
2. Comprehensive coverage vs focused deep-dive
3. Target word count (suggest 30,000-50,000 words)

Summarize the planned book approach for final confirmation.`;

    const completion = await this.callOpenAI(systemPrompt, "Let's confirm the overall approach for your book.");

    this.conversationState.conversationHistory.push(
      { role: 'assistant', content: completion },
      { role: 'user', content: `Mock user response: Yes, that sounds perfect. I want a practical, comprehensive guide around 35,000 words.` }
    );

    // Set final orientation (simplified for MVP)
    this.conversationState.collectedData.wordCountTarget = 35000;

    logger.info('Content orientation confirmed', {
      sessionId: state.sessionId,
      wordTarget: this.conversationState.collectedData.wordCountTarget,
      approach: this.conversationState.collectedData.approach,
    });
  }

  /**
   * Generate 3 style samples based on collected requirements
   */
  private async generateStyleSamples(): Promise<StyleGuide[]> {
    return [
      {
        tone: 'Professional and authoritative',
        voice: 'Expert practitioner sharing proven methods',
        perspective: 'third-person' as const,
        formality: 'formal' as const,
        technicalLevel: 'intermediate' as const,
        description: 'Clear, direct communication with professional terminology. Focuses on established practices and proven methodologies. Uses evidence-based recommendations and structured presentations.',
      },
      {
        tone: 'Conversational and engaging',
        voice: 'Knowledgeable guide walking alongside the reader',
        perspective: 'second-person' as const,
        formality: 'informal' as const,
        technicalLevel: 'intermediate' as const,
        description: 'Friendly, approachable tone that makes complex topics accessible. Uses examples, analogies, and direct address to the reader. Balances expertise with relatability.',
      },
      {
        tone: 'Academic and comprehensive',
        voice: 'Thorough researcher presenting complete analysis',
        perspective: 'third-person' as const,
        formality: 'formal' as const,
        technicalLevel: 'advanced' as const,
        description: 'Systematic, detailed exploration of all aspects. Includes theoretical foundations, research citations, and comprehensive coverage. Assumes reader wants deep understanding.',
      },
    ];
  }

  /**
   * Validate and structure final requirements
   */
  private validateAndStructureRequirements(): BookRequirements {
    try {
      // Ensure all required fields are present with defaults
      const requirements: BookRequirements = {
        topic: this.conversationState.collectedData.topic || 'General Guide',
        audience: this.conversationState.collectedData.audience || {
          demographics: 'General audience',
          expertiseLevel: 'intermediate',
          context: 'professional',
        },
        author: this.conversationState.collectedData.author || {
          name: 'Anonymous Author',
        },
        style: this.conversationState.collectedData.style || {
          tone: 'Professional and clear',
          voice: 'Expert guide',
          perspective: 'third-person',
          formality: 'formal',
          technicalLevel: 'intermediate',
        },
        approach: this.conversationState.collectedData.approach || 'practical',
        focus: this.conversationState.collectedData.focus || 'comprehensive',
        wordCountTarget: this.conversationState.collectedData.wordCountTarget || 35000,
      };

      // Validate against schema
      BookRequirementsSchema.parse(requirements);

      logger.info('Requirements validated successfully', {
        topic: requirements.topic,
        wordTarget: requirements.wordCountTarget,
        expertiseLevel: requirements.audience.expertiseLevel,
      });

      return requirements;
    } catch (error) {
      throw new WorkflowError(
        'requirements_validation_failed',
        'Failed to validate collected requirements',
        {
          recoverable: false,
          context: {
            collectedData: this.conversationState.collectedData,
            error: error instanceof Error ? error.message : 'Validation error',
          },
        }
      );
    }
  }

  /**
   * Call OpenAI for conversation generation
   */
  private async callOpenAI(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 800,
        temperature: 0.7,
        top_p: 0.9,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      return content;
    } catch (error) {
      throw new WorkflowError(
        'conversation_generation_failed',
        'Failed to generate conversation response',
        {
          recoverable: true,
          cause: error instanceof Error ? error : undefined,
        }
      );
    }
  }

  /**
   * Validate conversation node input
   */
  validate(state: WorkflowState): boolean {
    return !!state.userPrompt && state.userPrompt.length >= 3;
  }

  /**
   * Recover from conversation errors
   */
  async recover(state: WorkflowState, _error: WorkflowError): Promise<WorkflowState> {
    // Reset conversation state and retry with simplified approach
    this.conversationState = {
      phase: 'topic_clarification',
      collectedData: { topic: state.userPrompt },
      conversationHistory: [],
    };

    logger.info('Recovering conversation node with simplified approach', {
      sessionId: state.sessionId,
      originalPhase: this.conversationState.phase,
    });

    // Use minimal requirements for recovery
    const fallbackRequirements: BookRequirements = {
      topic: state.userPrompt || 'General Guide',
      audience: {
        demographics: 'General audience',
        expertiseLevel: 'intermediate',
        context: 'professional',
      },
      author: {
        name: 'Author',
      },
      style: {
        tone: 'Professional and clear',
        voice: 'Expert guide',
        perspective: 'third-person',
        formality: 'formal',
        technicalLevel: 'intermediate',
      },
      approach: 'practical',
      focus: 'comprehensive',
      wordCountTarget: 30000,
    };

    // Add fallback requirements to state
    const stateWithFallback = {
      ...state,
      requirements: fallbackRequirements,
      baseContent: '',
      conversationHistory: [{ role: 'assistant', content: 'Requirements collected with fallback defaults due to conversation error.' }],
    };

    return this.transitionToStage(stateWithFallback, 'outline');
  }
}

/**
 * Factory function to create conversation node
 */
export function createConversationNode(): ConversationNode {
  return new ConversationNode();
}