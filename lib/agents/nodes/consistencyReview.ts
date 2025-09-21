// Consistency Review Node Implementation
// Analyzes chapters for consistency, style, and quality using GPT-5 mini
// Following CLAUDE.md standards and BaseWorkflowNode pattern

import { WorkflowState, ChapterResult, BookRequirements, StyleGuide } from '@/types';
import { BaseWorkflowNode } from './base';
import { BookGenerationAgents } from '../gpt5-wrapper';
import {
  WorkflowError,
  WorkflowErrorContext,
  logger,
} from '@/lib/errors/exports';

/**
 * Consistency analysis result for a single chapter
 */
export interface ChapterConsistencyResult {
  chapterNumber: number;
  title: string;
  consistencyScore: number; // 0-100
  issues: ConsistencyIssue[];
  suggestions: string[];
  wordCount: number;
}

/**
 * Individual consistency issue found in content
 */
export interface ConsistencyIssue {
  type: 'terminology' | 'style' | 'cross-reference' | 'tone' | 'structure';
  severity: 'low' | 'medium' | 'high';
  description: string;
  chapterNumber: number;
  suggestion?: string;
  relatedChapters?: number[];
}

/**
 * Overall consistency review result
 */
export interface ConsistencyReviewResult {
  overallConsistencyScore: number; // 0-100
  totalIssuesFound: number;
  chapterResults: ChapterConsistencyResult[];
  globalIssues: ConsistencyIssue[];
  recommendedActions: string[];
  terminologyMap: Record<string, string>; // Term standardization
}

/**
 * GPT-5 prompts for consistency analysis
 */
const CONSISTENCY_ANALYSIS_PROMPTS = {
  systemPrompt: `You are an expert book editor specializing in consistency analysis and quality assurance. Your role is to:

1. Analyze chapters for terminology consistency across the entire book
2. Identify style and tone variations that disrupt reading flow
3. Check cross-references and chapter dependencies for accuracy
4. Evaluate structural consistency in presentation and formatting
5. Provide actionable feedback for improvement

Focus on publication-quality standards and provide specific, constructive suggestions.`,

  chapterAnalysisPrompt: (
    chapter: ChapterResult,
    requirements: BookRequirements,
    styleGuide: StyleGuide,
    allChapters: ChapterResult[]
  ) => `Analyze this chapter for consistency issues within the context of the complete book.

**Chapter to Analyze:**
Title: ${chapter.title}
Number: ${chapter.chapterNumber}
Word Count: ${chapter.wordCount}
Content: ${chapter.content}

**Book Context:**
Topic: ${requirements.topic}
Target Audience: ${requirements.audience.demographic} (${requirements.audience.expertiseLevel})
Style Requirements: ${styleGuide.tone}, ${styleGuide.voice}, ${styleGuide.perspective}

**Other Chapters for Reference:**
${allChapters
  .filter(ch => ch.chapterNumber !== chapter.chapterNumber)
  .map(ch => `Chapter ${ch.chapterNumber}: ${ch.title} (${ch.wordCount} words)`)
  .join('\n')}

**Analysis Required:**
1. **Terminology Consistency**: Identify technical terms, concepts, or phrases that should be standardized
2. **Style Adherence**: Check if tone, voice, and writing style match the style guide and other chapters
3. **Cross-Reference Accuracy**: Verify any references to other chapters or concepts
4. **Structural Consistency**: Evaluate chapter organization, heading usage, and formatting
5. **Quality Assessment**: Overall readability, flow, and professional quality

**Response Format (JSON):**
{
  "consistencyScore": number (0-100),
  "issues": [
    {
      "type": "terminology|style|cross-reference|tone|structure",
      "severity": "low|medium|high",
      "description": "specific issue description",
      "suggestion": "actionable improvement suggestion"
    }
  ],
  "suggestions": ["general improvement suggestions"],
  "terminologyFindings": {
    "term": "standardized version"
  }
}`,

  globalAnalysisPrompt: (
    chapterResults: ChapterConsistencyResult[],
    requirements: BookRequirements,
    styleGuide: StyleGuide
  ) => `Perform a global consistency analysis across all chapters to identify book-wide issues.

**Chapter Consistency Results:**
${chapterResults.map(result => `
Chapter ${result.chapterNumber}: ${result.title}
- Consistency Score: ${result.consistencyScore}/100
- Issues Found: ${result.issues.length}
- Key Terms: ${result.issues.filter(i => i.type === 'terminology').map(i => i.description).join(', ')}
`).join('\n')}

**Book Requirements:**
Topic: ${requirements.topic}
Target Audience: ${requirements.audience.demographic}
Style: ${styleGuide.tone}, ${styleGuide.voice}

**Global Analysis Required:**
1. **Cross-Chapter Terminology**: Identify terms used inconsistently across chapters
2. **Style Drift**: Detect chapters that deviate from the established style
3. **Structural Inconsistencies**: Find formatting or organizational inconsistencies
4. **Flow Issues**: Identify choppy transitions between chapters
5. **Overall Quality**: Assess publication readiness

**Response Format (JSON):**
{
  "overallConsistencyScore": number (0-100),
  "globalIssues": [
    {
      "type": "terminology|style|cross-reference|tone|structure",
      "severity": "low|medium|high",
      "description": "issue affecting multiple chapters",
      "relatedChapters": [chapter numbers],
      "suggestion": "book-wide improvement suggestion"
    }
  ],
  "recommendedActions": ["prioritized action items"],
  "terminologyMap": {
    "inconsistent_term": "standardized_version"
  }
}`
};

/**
 * Consistency Review Node
 * Analyzes all chapters for consistency, style adherence, and quality
 */
export class ConsistencyReviewNode extends BaseWorkflowNode {
  private consistencyAgent: ReturnType<typeof BookGenerationAgents.consistencyReviewer>;

  constructor() {
    super('consistency_review', 'Analyze chapters for consistency, style, and quality');

    // Initialize GPT-5 mini consistency reviewer agent
    this.consistencyAgent = BookGenerationAgents.consistencyReviewer();
  }

  /**
   * Execute consistency review analysis
   */
  protected async executeNode(state: WorkflowState): Promise<WorkflowState> {
    const errorContext = new WorkflowErrorContext(state.sessionId, state.userId);

    try {
      // Validate required state
      if (!state.chapters || state.chapters.length === 0) {
        throw new WorkflowError(
          state.sessionId,
          state.currentStage,
          'No chapters available for consistency review',
          {
            code: 'missing_chapters',
            recoverable: false,
            context: { chaptersCount: state.chapters?.length || 0 },
          }
        );
      }

      if (!state.requirements || !state.styleGuide) {
        throw new WorkflowError(
          state.sessionId,
          state.currentStage,
          'Missing requirements or style guide for consistency analysis',
          {
            code: 'missing_requirements',
            recoverable: false,
            context: {
              hasRequirements: !!state.requirements,
              hasStyleGuide: !!state.styleGuide,
            },
          }
        );
      }

      logger.info('Starting consistency review', {
        sessionId: state.sessionId,
        chaptersCount: state.chapters.length,
        stage: state.currentStage,
      });

      // Phase 1: Individual chapter analysis
      let progress = this.updateProgress(state, 20, 'Analyzing individual chapters');
      const chapterResults = await this.analyzeIndividualChapters(
        state.chapters,
        state.requirements,
        state.styleGuide,
        errorContext
      );

      // Phase 2: Global consistency analysis
      progress = this.updateProgress(progress, 60, 'Performing global consistency analysis');
      const globalResults = await this.performGlobalAnalysis(
        chapterResults,
        state.requirements,
        state.styleGuide,
        errorContext
      );

      // Phase 3: Compile final results
      progress = this.updateProgress(progress, 90, 'Compiling consistency report');
      const consistencyReview = this.compileConsistencyReport(chapterResults, globalResults);

      logger.info('Consistency review completed', {
        sessionId: state.sessionId,
        overallScore: consistencyReview.overallConsistencyScore,
        totalIssues: consistencyReview.totalIssuesFound,
        highSeverityIssues: consistencyReview.globalIssues.filter(i => i.severity === 'high').length,
      });

      // Add consistency review results to state before transition
      const stateWithResults = {
        ...progress,
        consistencyReview,
        updatedAt: new Date().toISOString(),
      };

      // Transition to quality review stage
      return this.transitionToStage(stateWithResults, 'quality_review');

    } catch (error) {
      logger.error('Consistency review failed', {
        sessionId: state.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error instanceof WorkflowError
        ? error
        : new WorkflowError(
            state.sessionId,
            state.currentStage,
            `Consistency review failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            {
              code: 'consistency_review_failure',
              recoverable: true,
              cause: error instanceof Error ? error : undefined,
            }
          );
    } finally {
      errorContext.cleanup();
    }
  }

  /**
   * Analyze each chapter individually for consistency issues
   */
  private async analyzeIndividualChapters(
    chapters: ChapterResult[],
    requirements: BookRequirements,
    styleGuide: StyleGuide,
    errorContext: WorkflowErrorContext
  ): Promise<ChapterConsistencyResult[]> {
    const results: ChapterConsistencyResult[] = [];

    // Analyze chapters sequentially to provide detailed context
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];

      logger.info('Analyzing chapter consistency', {
        sessionId: errorContext.sessionId,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        wordCount: chapter.wordCount,
      });

      try {
        const prompt = CONSISTENCY_ANALYSIS_PROMPTS.chapterAnalysisPrompt(
          chapter,
          requirements,
          styleGuide,
          chapters
        );

        const response = await this.consistencyAgent.execute(
          prompt,
          errorContext
        );

        // Parse GPT-5 response
        const analysis = this.parseChapterAnalysis(response.content, chapter);
        results.push(analysis);

        logger.info('Chapter analysis completed', {
          sessionId: errorContext.sessionId,
          chapterNumber: chapter.chapterNumber,
          consistencyScore: analysis.consistencyScore,
          issuesFound: analysis.issues.length,
        });

      } catch (error) {
        logger.warn('Chapter analysis failed, using fallback', {
          sessionId: errorContext.sessionId,
          chapterNumber: chapter.chapterNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Fallback analysis
        results.push(this.createFallbackChapterAnalysis(chapter));
      }
    }

    return results;
  }

  /**
   * Perform global consistency analysis across all chapters
   */
  private async performGlobalAnalysis(
    chapterResults: ChapterConsistencyResult[],
    requirements: BookRequirements,
    styleGuide: StyleGuide,
    errorContext: WorkflowErrorContext
  ): Promise<Partial<ConsistencyReviewResult>> {
    try {
      const prompt = CONSISTENCY_ANALYSIS_PROMPTS.globalAnalysisPrompt(
        chapterResults,
        requirements,
        styleGuide
      );

      const response = await this.consistencyAgent.execute(
        prompt,
        errorContext
      );

      return this.parseGlobalAnalysis(response.content);

    } catch (error) {
      logger.warn('Global analysis failed, using fallback', {
        sessionId: errorContext.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.createFallbackGlobalAnalysis(chapterResults);
    }
  }

  /**
   * Parse GPT-5 chapter analysis response
   */
  private parseChapterAnalysis(content: string, chapter: ChapterResult): ChapterConsistencyResult {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        consistencyScore: Math.min(100, Math.max(0, analysis.consistencyScore || 75)),
        issues: (analysis.issues || []).map((issue: unknown) => {
          const issueObj = issue as Record<string, unknown>;
          return {
            type: (issueObj.type as string) || 'style',
            severity: (issueObj.severity as string) || 'medium',
            description: (issueObj.description as string) || 'Analysis issue detected',
            chapterNumber: chapter.chapterNumber,
            suggestion: issueObj.suggestion as string,
          };
        }),
        suggestions: analysis.suggestions || [],
        wordCount: chapter.wordCount,
      };

    } catch (error) {
      logger.warn('Failed to parse chapter analysis, using fallback', {
        chapterNumber: chapter.chapterNumber,
        error: error instanceof Error ? error.message : 'Parse error',
      });

      return this.createFallbackChapterAnalysis(chapter);
    }
  }

  /**
   * Parse GPT-5 global analysis response
   */
  private parseGlobalAnalysis(content: string): Partial<ConsistencyReviewResult> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        overallConsistencyScore: Math.min(100, Math.max(0, analysis.overallConsistencyScore || 80)),
        globalIssues: (analysis.globalIssues || []).map((issue: unknown) => {
          const issueObj = issue as Record<string, unknown>;
          return {
            type: (issueObj.type as string) || 'style',
            severity: (issueObj.severity as string) || 'medium',
            description: (issueObj.description as string) || 'Global consistency issue detected',
            chapterNumber: 0, // Global issues don't belong to specific chapters
            suggestion: issueObj.suggestion as string,
            relatedChapters: (issueObj.relatedChapters as number[]) || [],
          };
        }),
        recommendedActions: analysis.recommendedActions || [],
        terminologyMap: analysis.terminologyMap || {},
      };

    } catch (error) {
      logger.warn('Failed to parse global analysis, using fallback', {
        error: error instanceof Error ? error.message : 'Parse error',
      });

      return {
        overallConsistencyScore: 80,
        globalIssues: [],
        recommendedActions: ['Review chapters for consistency manually'],
        terminologyMap: {},
      };
    }
  }

  /**
   * Create fallback chapter analysis when GPT-5 fails
   */
  private createFallbackChapterAnalysis(chapter: ChapterResult): ChapterConsistencyResult {
    return {
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      consistencyScore: 75, // Moderate fallback score
      issues: [
        {
          type: 'style',
          severity: 'low',
          description: 'Automated analysis unavailable, manual review recommended',
          chapterNumber: chapter.chapterNumber,
          suggestion: 'Review chapter manually for consistency issues',
        },
      ],
      suggestions: ['Manual review recommended for quality assurance'],
      wordCount: chapter.wordCount,
    };
  }

  /**
   * Create fallback global analysis when GPT-5 fails
   */
  private createFallbackGlobalAnalysis(chapterResults: ChapterConsistencyResult[]): Partial<ConsistencyReviewResult> {
    const averageScore = chapterResults.reduce((sum, ch) => sum + ch.consistencyScore, 0) / chapterResults.length;

    return {
      overallConsistencyScore: Math.round(averageScore),
      globalIssues: [
        {
          type: 'style',
          severity: 'medium',
          description: 'Automated global analysis unavailable, manual review recommended',
          chapterNumber: 0,
          suggestion: 'Perform manual review of all chapters for consistency',
          relatedChapters: chapterResults.map(ch => ch.chapterNumber),
        },
      ],
      recommendedActions: [
        'Perform manual consistency review',
        'Check terminology usage across chapters',
        'Verify style consistency',
      ],
      terminologyMap: {},
    };
  }

  /**
   * Compile final consistency review report
   */
  private compileConsistencyReport(
    chapterResults: ChapterConsistencyResult[],
    globalResults: Partial<ConsistencyReviewResult>
  ): ConsistencyReviewResult {
    const totalIssues = chapterResults.reduce((sum, ch) => sum + ch.issues.length, 0) +
                       (globalResults.globalIssues?.length || 0);

    return {
      overallConsistencyScore: globalResults.overallConsistencyScore || 80,
      totalIssuesFound: totalIssues,
      chapterResults,
      globalIssues: globalResults.globalIssues || [],
      recommendedActions: globalResults.recommendedActions || [],
      terminologyMap: globalResults.terminologyMap || {},
    };
  }

  /**
   * Validate workflow state for consistency review
   */
  validate(state: WorkflowState): boolean {
    return !!(
      state.chapters &&
      state.chapters.length > 0 &&
      state.requirements &&
      state.styleGuide &&
      state.sessionId
    );
  }

  /**
   * Recovery mechanism for consistency review failures
   */
  async recover(state: WorkflowState, error: WorkflowError): Promise<WorkflowState> {
    const retryState = { ...state, retryCount: (state.retryCount || 0) + 1 };

    if (retryState.retryCount > 2) {
      throw new WorkflowError(
        state.sessionId,
        state.currentStage,
        `Maximum retries exceeded for consistency review`,
        {
          code: 'max_retries_exceeded',
          recoverable: false,
          context: { nodeName: this.name },
        }
      );
    }

    logger.info('Attempting consistency review recovery', {
      sessionId: state.sessionId,
      retryCount: retryState.retryCount,
      errorCode: error.code,
    });

    // Create simplified consistency review using fallback methods
    const chapterResults = state.chapters.map(chapter => this.createFallbackChapterAnalysis(chapter));
    const globalResults = this.createFallbackGlobalAnalysis(chapterResults);
    const consistencyReview = this.compileConsistencyReport(chapterResults, globalResults);

    const stateWithResults = {
      ...retryState,
      consistencyReview,
      updatedAt: new Date().toISOString(),
    };

    return this.transitionToStage(stateWithResults, 'quality_review');
  }
}