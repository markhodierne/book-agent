// Outline Generation Node Implementation
// Stage 2: Create comprehensive book structure enabling independent chapter development
// Following FUNCTIONAL.md Stage 2 specification and CLAUDE.md standards

import { WorkflowState, BookOutline, ChapterOutline, BookRequirements } from '@/types';
import { BaseWorkflowNode } from './base';
import {
  WorkflowError,
  WorkflowErrorContext,
  logger,
  executeWithToolContext,
} from '@/lib/errors/exports';
import { BookGenerationAgents } from '../gpt5-wrapper';
import { z } from 'zod';


/**
 * Schema validation for book outline structure
 */
const BookOutlineSchema = z.object({
  title: z.string().min(5).max(200),
  subtitle: z.string().max(300).optional(),
  chapters: z.array(z.object({
    chapterNumber: z.number().int().positive(),
    title: z.string().min(3).max(150),
    contentOverview: z.string().min(50).max(500),
    keyObjectives: z.array(z.string()).min(3).max(8),
    wordCount: z.number().int().min(800).max(4000),
    dependencies: z.array(z.number().int().nonnegative()).default([]),
    researchRequirements: z.array(z.string()).default([]),
  })).min(8).max(25),
  totalWordCount: z.number().int().min(30000),
  estimatedPages: z.number().int().positive(),
});

/**
 * Outline Generation Node
 *
 * Processes requirements from conversation node to create:
 * - Book title selection (3-5 options)
 * - Chapter structure planning (8-25 chapters)
 * - Word count distribution (30,000+ total)
 * - Chapter dependencies and research requirements
 */
export class OutlineNode extends BaseWorkflowNode {
  constructor() {
    super('outline', 'Generate comprehensive book outline with chapter structure');
  }

  protected async executeNode(state: WorkflowState): Promise<WorkflowState> {
    const errorContext = new WorkflowErrorContext(state.sessionId, state.userId);

    try {
      if (!state.requirements) {
        throw new WorkflowError('missing_requirements', 'Requirements not found in workflow state', {
          recoverable: false,
        });
      }

      logger.info('Starting outline generation', {
        sessionId: state.sessionId,
        topic: state.requirements.topic,
        wordTarget: state.requirements.wordCountTarget,
      });

      // Phase 1: Title Generation
      let progress = this.updateProgress(state, 20, 'Generating book title options');
      const titleOptions = await this.generateTitleOptions(state.requirements, errorContext);

      // Phase 2: Structure Planning
      progress = this.updateProgress(progress, 40, 'Planning chapter structure');
      const chapterStructure = await this.planChapterStructure(state.requirements, titleOptions[0], errorContext);

      // Phase 3: Detailed Chapter Outlines
      progress = this.updateProgress(progress, 70, 'Creating detailed chapter outlines');
      const detailedOutlines = await this.createDetailedOutlines(
        state.requirements,
        chapterStructure,
        errorContext
      );

      // Phase 4: Validation and Finalization
      progress = this.updateProgress(progress, 90, 'Validating outline structure');
      const finalOutline = await this.validateAndFinalizeOutline({
        title: titleOptions[0],
        chapters: detailedOutlines,
        totalWordCount: detailedOutlines.reduce((sum, ch) => sum + ch.wordCount, 0),
        estimatedPages: Math.ceil(detailedOutlines.reduce((sum, ch) => sum + ch.wordCount, 0) / 250), // ~250 words per page
      }, errorContext);

      // Add data to state before transition (transitionToStage only accepts 3 params)
      const stateWithResults = {
        ...progress,
        outline: finalOutline,
        titleOptions,
      };

      logger.info('Outline generation completed', {
        sessionId: state.sessionId,
        title: finalOutline.title,
        chapterCount: finalOutline.chapters.length,
        totalWords: finalOutline.totalWordCount,
      });

      // Transition to next stage
      return this.transitionToStage(stateWithResults, 'chapter_spawning');

    } catch (error) {
      errorContext.updateStage('outline');
      const workflowError = error instanceof WorkflowError
        ? error
        : errorContext.createError(WorkflowError, error instanceof Error ? error.message : 'Unknown error in outline generation', {
            recoverable: true,
            cause: error instanceof Error ? error : undefined,
          });

      logger.error('Outline generation failed', {
        sessionId: state.sessionId,
        error: workflowError.message,
        stage: 'outline',
      });

      return {
        ...state,
        error: workflowError.message,
        needsRetry: workflowError.recoverable,
        lastError: workflowError,
      };
    } finally {
      errorContext.cleanup();
    }
  }

  /**
   * Generate 3-5 title options based on requirements using GPT-5 agent
   */
  private async generateTitleOptions(requirements: BookRequirements, errorContext: WorkflowErrorContext): Promise<string[]> {
    const userPrompt = this.generateTitleUserPrompt(requirements);

    try {
      const titleAgent = BookGenerationAgents.titleGenerator();

      const response = await executeWithToolContext(
        'title_generation',
        { requirements },
        async () => {
          return await titleAgent.execute(userPrompt, errorContext);
        },
        errorContext.sessionId
      );

      if (!response.content) {
        throw new WorkflowError('empty_response', 'Empty response from title generation');
      }

      // Parse title options from response
      const titleOptions = this.parseTitleOptions(response.content);

      if (titleOptions.length < 3) {
        logger.warn('Insufficient title options generated, using fallback', {
          sessionId: errorContext.sessionId,
          generatedCount: titleOptions.length,
        });

        // Add fallback titles if needed
        while (titleOptions.length < 3) {
          titleOptions.push(`The Complete Guide to ${requirements.topic}`);
        }
      }

      return titleOptions.slice(0, 5); // Maximum 5 options

    } catch (error) {
      logger.error('Title generation failed', {
        sessionId: errorContext.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback title generation
      return [
        `The Complete Guide to ${requirements.topic}`,
        `Mastering ${requirements.topic}`,
        `${requirements.topic}: A Comprehensive Handbook`,
      ];
    }
  }

  /**
   * Plan overall chapter structure and word distribution using GPT-5 agent
   */
  private async planChapterStructure(
    requirements: BookRequirements,
    selectedTitle: string,
    errorContext: WorkflowErrorContext
  ): Promise<{ totalChapters: number; wordDistribution: number[]; chapterTitles: string[] }> {
    const userPrompt = this.generateStructureUserPrompt(requirements, selectedTitle);

    try {
      const structureAgent = BookGenerationAgents.structurePlanner();

      const response = await executeWithToolContext(
        'chapter_structure_planning',
        { requirements, selectedTitle },
        async () => {
          return await structureAgent.execute(userPrompt, errorContext);
        },
        errorContext.sessionId
      );

      if (!response.content) {
        throw new WorkflowError('empty_response', 'Empty response from structure planning');
      }

      return this.parseChapterStructure(response.content, requirements.wordCountTarget);

    } catch (error) {
      logger.error('Chapter structure planning failed', {
        sessionId: errorContext.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback structure generation
      return this.generateFallbackStructure(requirements);
    }
  }

  /**
   * Create detailed outlines for each chapter using GPT-5 agent
   */
  private async createDetailedOutlines(
    requirements: BookRequirements,
    structure: { totalChapters: number; wordDistribution: number[]; chapterTitles: string[] },
    errorContext: WorkflowErrorContext
  ): Promise<ChapterOutline[]> {
    try {
      const outlinePromises = structure.chapterTitles.map(async (title, index) => {
        const chapterNumber = index + 1;
        const wordCount = structure.wordDistribution[index] || 1500;

        const userPrompt = this.generateChapterOutlineUserPrompt(
          requirements,
          title,
          chapterNumber,
          wordCount,
          structure.chapterTitles
        );

        const outlineAgent = BookGenerationAgents.outlineCreator();

        const response = await executeWithToolContext(
          `chapter_outline_${chapterNumber}`,
          { chapterNumber, title, wordCount },
          async () => {
            return await outlineAgent.execute(userPrompt, errorContext);
          },
          errorContext.sessionId
        );

        if (!response.content) {
          throw new WorkflowError('empty_response', `Empty response for chapter ${chapterNumber} outline`);
        }

        return this.parseChapterOutline(response.content, chapterNumber, title, wordCount);
      });

      const outlines = await Promise.all(outlinePromises);

      // Add dependencies based on logical chapter flow
      return this.addChapterDependencies(outlines);

    } catch (error) {
      logger.error('Detailed outline creation failed', {
        sessionId: errorContext.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback outline generation
      return this.generateFallbackOutlines(requirements, structure);
    }
  }

  /**
   * Validate and finalize the complete book outline
   */
  private async validateAndFinalizeOutline(
    outline: BookOutline,
    errorContext: WorkflowErrorContext
  ): Promise<BookOutline> {
    try {
      // Business logic validation and adjustment BEFORE schema validation
      const adjustedOutline = { ...outline };

      if (adjustedOutline.totalWordCount < 30000) {
        logger.warn('Word count below minimum, adjusting', {
          sessionId: errorContext.sessionId,
          currentCount: adjustedOutline.totalWordCount,
          target: 30000,
        });

        // Increase word counts proportionally to reach minimum
        const multiplier = 30000 / adjustedOutline.totalWordCount;
        adjustedOutline.chapters = adjustedOutline.chapters.map(chapter => ({
          ...chapter,
          wordCount: Math.ceil(chapter.wordCount * multiplier),
        }));
        adjustedOutline.totalWordCount = adjustedOutline.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
        adjustedOutline.estimatedPages = Math.ceil(adjustedOutline.totalWordCount / 250);
      }

      // Schema validation after adjustment
      const validatedOutline = BookOutlineSchema.parse(adjustedOutline);

      // Validate chapter dependencies don't create cycles
      this.validateDependencies(validatedOutline.chapters);

      return validatedOutline;

    } catch (error) {
      logger.error('Outline validation failed', {
        sessionId: errorContext.sessionId,
        error: error instanceof Error ? error.message : 'Unknown validation error',
        outline: outline,
      });

      throw new WorkflowError('outline_validation_failed', 'Generated outline failed validation', {
        recoverable: true,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  // ============================================================================
  // PROMPT GENERATION METHODS
  // ============================================================================

  private generateTitleSystemPrompt(requirements: BookRequirements): string {
    return `You are an expert book title generator with extensive experience in publishing and marketing. Your task is to create compelling, marketable book titles that accurately reflect the content and appeal to the target audience.

Guidelines:
- Generate exactly 5 title options
- Titles should be specific, memorable, and engaging
- Consider the target audience: ${requirements.audience.demographics} with ${requirements.audience.expertiseLevel} expertise level
- Match the tone: ${requirements.scope.approach} approach with ${requirements.scope.coverageDepth} coverage
- Each title should be 3-12 words long
- Include subtitles where appropriate to clarify scope or benefits
- Avoid generic terms; be specific to the topic and value proposition

Format your response as a numbered list:
1. [Title]: [Optional Subtitle]
2. [Title]: [Optional Subtitle]
...`;
  }

  private generateTitleUserPrompt(requirements: BookRequirements): string {
    return `Create 5 compelling book titles for a book about "${requirements.topic}".

Book Details:
- Topic: ${requirements.topic}
- Target Word Count: ${requirements.wordCountTarget.toLocaleString()} words
- Audience: ${requirements.audience.demographics}
- Expertise Level: ${requirements.audience.expertiseLevel}
- Context: ${requirements.audience.context}
- Author: ${requirements.author.name}
- Content Approach: ${requirements.scope.approach}
- Coverage Depth: ${requirements.scope.coverageDepth}
- Primary Angle: ${requirements.contentOrientation.primaryAngle}

Generate titles that are:
1. Specific and descriptive of the actual content
2. Appealing to ${requirements.audience.expertiseLevel} readers
3. Professional yet engaging
4. Clearly differentiated from each other
5. Appropriate for the ${requirements.audience.context} context`;
  }

  private generateStructureSystemPrompt(requirements: BookRequirements, title: string): string {
    return `You are a professional book structuring specialist with expertise in creating logical, comprehensive chapter organizations. Your task is to plan the optimal chapter structure for a ${requirements.wordCountTarget.toLocaleString()}-word book.

Guidelines:
- Plan 8-25 chapters based on content complexity and scope
- Distribute word counts logically (1,000-2,500 words per chapter typical)
- Ensure total word count meets the ${requirements.wordCountTarget.toLocaleString()}-word minimum
- Create logical progression from foundational to advanced topics
- Consider the ${requirements.audience.expertiseLevel} expertise level of readers
- Match the ${requirements.scope.approach} approach and ${requirements.scope.coverageDepth} coverage depth

Format your response as:
TOTAL CHAPTERS: [number]
WORD DISTRIBUTION: [comma-separated word counts for each chapter]
CHAPTER TITLES:
1. [Chapter 1 Title]
2. [Chapter 2 Title]
...`;
  }

  private generateStructureUserPrompt(requirements: BookRequirements, title: string): string {
    return `Plan the chapter structure for "${title}".

Requirements:
- Topic: ${requirements.topic}
- Minimum Words: ${requirements.wordCountTarget.toLocaleString()}
- Audience: ${requirements.audience.demographics} (${requirements.audience.expertiseLevel} level)
- Approach: ${requirements.scope.approach}
- Coverage: ${requirements.scope.coverageDepth}
- Primary Focus: ${requirements.contentOrientation.primaryAngle}
- Secondary Aspects: ${requirements.contentOrientation.secondaryAngles.join(', ')}

Create a logical chapter progression that:
1. Starts with foundational concepts appropriate for ${requirements.audience.expertiseLevel} readers
2. Builds complexity gradually
3. Covers all aspects of ${requirements.topic}
4. Matches the ${requirements.scope.approach} approach
5. Provides ${requirements.scope.coverageDepth} coverage depth
6. Totals at least ${requirements.wordCountTarget.toLocaleString()} words

Consider chapter dependencies and logical flow between topics.`;
  }

  private generateOutlineSystemPrompt(requirements: BookRequirements): string {
    return `You are a professional book outline specialist creating detailed chapter specifications for parallel generation. Each chapter outline must be comprehensive and self-contained to enable independent writing.

Guidelines:
- Provide detailed content overview (2-3 sentences)
- List 3-5 specific learning objectives or key points to cover
- Identify research requirements (external sources needed)
- Consider dependencies on other chapters (reference by number)
- Ensure content matches the ${requirements.audience.expertiseLevel} expertise level
- Align with ${requirements.scope.approach} approach and ${requirements.contentOrientation.engagementStrategy} engagement strategy

Format your response as:
CONTENT OVERVIEW: [2-3 sentence description of what this chapter covers]
KEY OBJECTIVES:
- [Objective 1]
- [Objective 2]
- [Objective 3]
RESEARCH REQUIREMENTS:
- [Research need 1]
- [Research need 2]
DEPENDENCIES: [Chapter numbers this depends on, or "None"]`;
  }

  private generateChapterOutlineUserPrompt(
    requirements: BookRequirements,
    title: string,
    chapterNumber: number,
    wordCount: number,
    allChapterTitles: string[]
  ): string {
    return `Create a detailed outline for Chapter ${chapterNumber}: "${title}" (${wordCount.toLocaleString()} words).

Book Context:
- Overall Topic: ${requirements.topic}
- Target Audience: ${requirements.audience.demographics} (${requirements.audience.expertiseLevel} level)
- Book Approach: ${requirements.scope.approach}
- Engagement Strategy: ${requirements.contentOrientation.engagementStrategy}

Chapter Context:
- This is chapter ${chapterNumber} of ${allChapterTitles.length}
- Previous chapters: ${allChapterTitles.slice(0, chapterNumber - 1).join(', ') || 'None'}
- Following chapters: ${allChapterTitles.slice(chapterNumber).join(', ') || 'None'}

Create an outline that:
1. Fits logically in the overall book structure
2. Provides ${wordCount.toLocaleString()} words of valuable content
3. Matches the ${requirements.audience.expertiseLevel} expertise level
4. Uses the ${requirements.contentOrientation.engagementStrategy} engagement approach
5. Builds appropriately on previous chapters
6. Sets up concepts for later chapters`;
  }

  // ============================================================================
  // PARSING AND UTILITY METHODS
  // ============================================================================

  private parseTitleOptions(content: string): string[] {
    const lines = content.split('\n');
    const titles: string[] = [];

    for (const line of lines) {
      // Match numbered list items (1., 2., etc.) or simple titles
      const match = line.match(/^\d+\.\s*(.+)$/) || line.match(/^[-*]\s*(.+)$/) || (line.trim() && !line.includes(':') ? [null, line.trim()] : null);
      if (match && match[1]) {
        const title = match[1].trim();
        if (title.length >= 5 && title.length <= 200) {
          titles.push(title);
        }
      }
    }

    return titles;
  }

  private parseChapterStructure(content: string, targetWords: number): { totalChapters: number; wordDistribution: number[]; chapterTitles: string[] } {
    const lines = content.split('\n');

    let totalChapters = 12; // default
    let wordDistribution: number[] = [];
    const chapterTitles: string[] = [];

    for (const line of lines) {
      // Parse total chapters
      const chaptersMatch = line.match(/TOTAL CHAPTERS:\s*(\d+)/i);
      if (chaptersMatch) {
        totalChapters = parseInt(chaptersMatch[1]);
      }

      // Parse word distribution
      const wordsMatch = line.match(/WORD DISTRIBUTION:\s*(.+)/i);
      if (wordsMatch) {
        const words = wordsMatch[1].split(',').map(w => parseInt(w.trim())).filter(w => !isNaN(w));
        if (words.length > 0) {
          wordDistribution = words;
        }
      }

      // Parse chapter titles
      const titleMatch = line.match(/^\d+\.\s*(.+)$/);
      if (titleMatch && titleMatch[1]) {
        chapterTitles.push(titleMatch[1].trim());
      }
    }

    // Fallback if parsing failed
    if (chapterTitles.length === 0) {
      return this.generateFallbackStructure({ ...requirements, wordCountTarget: targetWords });
    }

    // Ensure word distribution matches chapter count
    if (wordDistribution.length !== chapterTitles.length) {
      const avgWords = Math.floor(targetWords / chapterTitles.length);
      wordDistribution = chapterTitles.map(() => avgWords);
    }

    // Ensure total meets minimum
    const totalWords = wordDistribution.reduce((sum, w) => sum + w, 0);
    if (totalWords < targetWords) {
      const multiplier = targetWords / totalWords;
      wordDistribution = wordDistribution.map(w => Math.ceil(w * multiplier));
    }

    return {
      totalChapters: chapterTitles.length,
      wordDistribution,
      chapterTitles,
    };
  }

  private parseChapterOutline(content: string, chapterNumber: number, title: string, wordCount: number): ChapterOutline {
    const lines = content.split('\n');

    let contentOverview = `Chapter ${chapterNumber} covers key aspects of ${title}.`;
    const keyObjectives: string[] = [];
    const researchRequirements: string[] = [];
    const dependencies: number[] = [];

    let currentSection = '';

    for (const line of lines) {
      const cleanLine = line.trim();

      // Section headers
      if (cleanLine.match(/^(CONTENT OVERVIEW|KEY OBJECTIVES|RESEARCH REQUIREMENTS|DEPENDENCIES):/i)) {
        currentSection = cleanLine.split(':')[0].toLowerCase();
        const content = cleanLine.split(':')[1]?.trim();
        if (content && currentSection === 'content overview') {
          contentOverview = content;
        }
        continue;
      }

      // Content based on current section
      if (currentSection === 'content overview' && cleanLine && !cleanLine.startsWith('-')) {
        contentOverview += ' ' + cleanLine;
      } else if (currentSection === 'key objectives' && cleanLine.startsWith('-')) {
        keyObjectives.push(cleanLine.substring(1).trim());
      } else if (currentSection === 'research requirements' && cleanLine.startsWith('-')) {
        researchRequirements.push(cleanLine.substring(1).trim());
      } else if (currentSection === 'dependencies') {
        const depMatches = cleanLine.match(/\d+/g);
        if (depMatches) {
          dependencies.push(...depMatches.map(d => parseInt(d)).filter(d => d < chapterNumber));
        }
      }
    }

    // Ensure minimum data
    if (keyObjectives.length === 0) {
      keyObjectives.push(
        `Understand the fundamentals of ${title}`,
        `Apply key concepts in practical contexts`,
        `Integrate knowledge with previous chapters`
      );
    }

    return {
      chapterNumber,
      title,
      contentOverview: contentOverview.trim(),
      keyObjectives,
      wordCount,
      dependencies,
      researchRequirements,
    };
  }

  private generateFallbackStructure(...args: [BookRequirements]): { totalChapters: number; wordDistribution: number[]; chapterTitles: string[] } {
    const [requirements] = args;
    const chapterCount = Math.max(8, Math.min(15, Math.floor(requirements.wordCountTarget / 2000)));
    const avgWords = Math.floor(requirements.wordCountTarget / chapterCount);

    const chapterTitles = Array.from({ length: chapterCount }, (_, i) =>
      `Chapter ${i + 1}: ${requirements.topic} Fundamentals ${i + 1}`
    );

    const wordDistribution = Array.from({ length: chapterCount }, () => avgWords);

    // Ensure total meets minimum
    const shortfall = requirements.wordCountTarget - (avgWords * chapterCount);
    if (shortfall > 0) {
      wordDistribution[0] += shortfall;
    }

    return {
      totalChapters: chapterCount,
      wordDistribution,
      chapterTitles,
    };
  }

  private generateFallbackOutlines(
    requirements: BookRequirements,
    structure: { totalChapters: number; wordDistribution: number[]; chapterTitles: string[] }
  ): ChapterOutline[] {
    return structure.chapterTitles.map((title, index) => ({
      chapterNumber: index + 1,
      title,
      contentOverview: `This chapter covers essential aspects of ${title} as it relates to ${requirements.topic}.`,
      keyObjectives: [
        `Understand the core concepts of ${title}`,
        `Apply practical techniques and methods`,
        `Integrate knowledge with overall ${requirements.topic} understanding`
      ],
      wordCount: structure.wordDistribution[index] || 1500,
      dependencies: index > 0 ? [index] : [],
      researchRequirements: [`Current best practices in ${title}`, `Recent developments and trends`],
    }));
  }

  private addChapterDependencies(outlines: ChapterOutline[]): ChapterOutline[] {
    return outlines.map((outline, index) => {
      // Simple dependency logic: later chapters depend on earlier foundational ones
      const dependencies: number[] = [];

      // First 3 chapters are usually foundational
      if (index > 2) {
        dependencies.push(1); // Often depends on introduction
      }

      // Advanced chapters depend on intermediate ones
      if (index > outlines.length / 2) {
        const midChapter = Math.floor(outlines.length / 2);
        if (midChapter !== index + 1) {
          dependencies.push(midChapter);
        }
      }

      // Sequential dependency for closely related chapters
      if (index > 0 && outline.title.toLowerCase().includes(outlines[index - 1].title.toLowerCase().split(' ')[0])) {
        dependencies.push(index);
      }

      return {
        ...outline,
        dependencies: [...new Set(dependencies)], // Remove duplicates
      };
    });
  }

  private validateDependencies(chapters: ChapterOutline[]): void {
    // Check for circular dependencies
    for (const chapter of chapters) {
      const visited = new Set<number>();
      const stack = [...chapter.dependencies];

      while (stack.length > 0) {
        const depNumber = stack.pop();
        if (depNumber === undefined) continue;

        if (depNumber === chapter.chapterNumber) {
          throw new WorkflowError('circular_dependency', `Circular dependency detected for chapter ${chapter.chapterNumber}`);
        }

        if (visited.has(depNumber)) continue;
        visited.add(depNumber);

        const depChapter = chapters.find(c => c.chapterNumber === depNumber);
        if (depChapter) {
          stack.push(...depChapter.dependencies);
        }
      }
    }

    // Check that dependencies reference valid chapters
    for (const chapter of chapters) {
      for (const dep of chapter.dependencies) {
        if (!chapters.find(c => c.chapterNumber === dep)) {
          throw new WorkflowError('invalid_dependency', `Chapter ${chapter.chapterNumber} references non-existent chapter ${dep}`);
        }

        if (dep >= chapter.chapterNumber) {
          throw new WorkflowError('forward_dependency', `Chapter ${chapter.chapterNumber} cannot depend on later chapter ${dep}`);
        }
      }
    }
  }

  // Validation and recovery methods from BaseWorkflowNode
  validate(state: WorkflowState): boolean {
    return !!state.requirements &&
           !!state.requirements.topic &&
           state.requirements.topic.length >= 3 &&
           state.requirements.wordCountTarget >= 30000;
  }

  async recover(state: WorkflowState, error: WorkflowError): Promise<WorkflowState> {
    const retryState = { ...state, retryCount: (state.retryCount || 0) + 1 };

    if (retryState.retryCount > 2) {
      throw new WorkflowError('max_retries_exceeded', 'Maximum retries exceeded for outline generation', {
        recoverable: false,
      });
    }

    logger.info('Attempting outline generation recovery', {
      sessionId: state.sessionId,
      retryCount: retryState.retryCount,
      originalError: error.message,
    });

    // For outline generation, we can try with reduced complexity
    if (state.requirements) {
      const simplifiedRequirements = {
        ...state.requirements,
        wordCountTarget: Math.max(30000, Math.floor(state.requirements.wordCountTarget * 0.8)), // Reduce target by 20%
      };

      return {
        ...retryState,
        requirements: simplifiedRequirements,
      };
    }

    return retryState;
  }
}