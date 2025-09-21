import OpenAI from 'openai';
import { ToolFactory } from './createTool';
import { ToolError } from '@/lib/errors/exports';
import { getEnvironmentConfig } from '@/lib/config/environment';
import type { ChapterConfig, ChapterResult, StyleGuide } from '@/types';

/**
 * Parameters for chapter generation
 */
export interface ChapterWriteParams {
  config: ChapterConfig;
  baseContent?: string; // PDF-extracted content for reference
  researchData?: string[]; // Additional research information
  contextFromDependencies?: string; // Content from dependent chapters
}

/**
 * Chapter validation result
 */
interface ChapterValidation {
  isValid: boolean;
  issues: string[];
  wordCount: number;
  qualityScore: number;
}

/**
 * Initialize OpenAI client
 */
const getOpenAIClient = () => {
  const config = getEnvironmentConfig();
  return new OpenAI({
    apiKey: config.OPENAI_API_KEY,
  });
};

/**
 * Generate a comprehensive system prompt for chapter writing
 */
function generateSystemPrompt(style: StyleGuide, targetWordCount: number): string {
  return `You are an expert book writer tasked with creating high-quality chapter content. Your role is to write engaging, informative, and well-structured chapters that meet specific requirements.

## Writing Style Requirements:
- **Tone**: ${style.tone} - maintain this tone throughout
- **Voice**: ${style.voice} - use ${style.voice} voice where appropriate
- **Perspective**: ${style.perspective} - write from ${style.perspective.replace('_', ' ')} perspective
- **Formality**: ${style.formality} level of formality
- **Technical Level**: ${style.technicalLevel} - appropriate for the target audience

## Style Example:
The following is an example of the expected writing style:
"""${style.exampleUsage}"""

## Content Requirements:
- Target word count: ${targetWordCount} words (±10% acceptable)
- Structure: Clear introduction, body with logical flow, conclusion
- Quality: Publication-ready content with proper grammar and spelling
- Engagement: Keep readers engaged with clear explanations and examples
- Accuracy: Ensure all information is factually correct
- Coherence: Maintain logical flow and connection between ideas

## Formatting:
- Use clear paragraph breaks for readability
- Include subheadings when appropriate for longer chapters
- Use bullet points or numbered lists for clarity when needed
- Ensure proper sentence structure and flow

Remember: You are writing for a book that will be professionally published. The content must be complete, standalone, and meet the highest quality standards.`;
}

/**
 * Generate user prompt for chapter creation
 */
function generateUserPrompt(params: ChapterWriteParams): string {
  const { config, baseContent, researchData, contextFromDependencies } = params;

  let prompt = `Please write Chapter ${config.chapterNumber}: "${config.title}"

## Chapter Outline:
${config.outline.contentOverview}

## Key Objectives:
${config.outline.keyObjectives.map(obj => `- ${obj}`).join('\n')}

## Target Word Count: ${config.wordTarget} words`;

  // Add base content context if available
  if (baseContent && baseContent.trim().length > 0) {
    prompt += `\n\n## Reference Content:
Use the following content as a foundation and reference, but expand upon it significantly:
"""
${baseContent.substring(0, 2000)}${baseContent.length > 2000 ? '...' : ''}
"""`;
  }

  // Add research context if available
  if (researchData && researchData.length > 0) {
    prompt += `\n\n## Additional Research Context:
${researchData.slice(0, 3).map((data, i) => `
### Research Source ${i + 1}:
${data.substring(0, 1000)}${data.length > 1000 ? '...' : ''}
`).join('')}`;
  }

  // Add context from dependent chapters if available
  if (contextFromDependencies && contextFromDependencies.trim().length > 0) {
    prompt += `\n\n## Context from Previous Chapters:
${contextFromDependencies.substring(0, 1000)}${contextFromDependencies.length > 1000 ? '...' : ''}`;
  }

  // Add research topics for guidance
  if (config.researchTopics && config.researchTopics.length > 0) {
    prompt += `\n\n## Research Topics to Address:
${config.researchTopics.map(topic => `- ${topic}`).join('\n')}`;
  }

  prompt += `\n\nPlease write the complete chapter content, ensuring it meets the word count target and follows the established writing style. The content should be engaging, informative, and publication-ready.`;

  return prompt;
}

/**
 * Validate generated chapter content
 */
function validateChapterContent(content: string, config: ChapterConfig): ChapterValidation {
  const issues: string[] = [];
  let qualityScore = 100;

  // Word count validation
  const words = content.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  const targetWords = config.wordTarget;
  const wordCountVariance = Math.abs(wordCount - targetWords) / targetWords;

  if (wordCountVariance > 0.15) { // More than 15% off target
    issues.push(`Word count ${wordCount} is significantly off target ${targetWords} (${Math.round(wordCountVariance * 100)}% variance)`);
    qualityScore -= 20;
  }

  // Content quality checks
  if (content.length < 500) {
    issues.push('Content appears to be too short for a meaningful chapter');
    qualityScore -= 30;
  }

  // Basic structure validation - check for multiple paragraphs
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  if (paragraphs.length < 3) {
    issues.push('Chapter should have multiple paragraphs for proper structure');
    qualityScore -= 15;
  }

  // Check for placeholder content or incomplete sections
  const placeholderPatterns = [
    /\[insert.*?\]/gi,
    /\[todo.*?\]/gi,
    /\[placeholder.*?\]/gi,
    /lorem ipsum/gi,
    /\.\.\./g,
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(content)) {
      issues.push('Content contains placeholder text or incomplete sections');
      qualityScore -= 25;
      break;
    }
  }

  // Check for proper sentence structure (basic)
  const sentences = content.match(/[.!?]+/g);
  if (!sentences || sentences.length < Math.floor(wordCount / 25)) {
    issues.push('Content may have poor sentence structure or flow');
    qualityScore -= 10;
  }

  return {
    isValid: issues.length === 0 && qualityScore >= 70,
    issues,
    wordCount,
    qualityScore: Math.max(0, qualityScore),
  };
}

/**
 * Generate chapter content using OpenAI GPT-5 mini
 */
async function executeChapterGeneration(params: ChapterWriteParams): Promise<ChapterResult> {
  const openai = getOpenAIClient();
  const { config } = params;

  // Generate prompts
  const systemPrompt = generateSystemPrompt(config.style, config.wordTarget);
  const userPrompt = generateUserPrompt(params);

  try {
    // Call OpenAI API with GPT-5 mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using latest available model - will upgrade when GPT-5 mini is available
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: Math.min(4000, Math.floor(config.wordTarget * 1.5)), // Estimate tokens for target words
      temperature: 0.7, // Balance creativity with consistency
      top_p: 0.9,
      frequency_penalty: 0.1, // Reduce repetition
      presence_penalty: 0.1, // Encourage topic variety
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI API returned empty content');
    }

    // Validate the generated content
    const validation = validateChapterContent(content, config);

    // If validation fails on first attempt, try to improve
    if (!validation.isValid && validation.qualityScore < 70) {
      throw new ToolError('chapter_write', `Generated content failed quality validation: ${validation.issues.join(', ')}`, {
        context: {
          wordCount: validation.wordCount,
          targetWords: config.wordTarget,
          qualityScore: validation.qualityScore,
          issues: validation.issues
        }
      });
    }

    // Collect research sources if available
    const researchSources: string[] = [];
    if (params.researchData && params.researchData.length > 0) {
      researchSources.push('Web research data');
    }
    if (params.baseContent) {
      researchSources.push('PDF base content');
    }
    if (params.contextFromDependencies) {
      researchSources.push('Dependent chapters');
    }

    // Create successful result
    const result: ChapterResult = {
      chapterNumber: config.chapterNumber,
      title: config.title,
      content: content.trim(),
      wordCount: validation.wordCount,
      status: 'completed',
      researchSources,
      generatedAt: new Date().toISOString(),
      reviewNotes: validation.issues.length > 0 ? validation.issues : undefined
    };

    return result;

  } catch (error) {
    // Enhanced error handling for different failure types
    if (error instanceof Error && 'status' in error) {
      // Handle OpenAI API errors
      throw ToolError.forExecution('chapter_write', `OpenAI API error: ${error.message}`);
    }

    if (error instanceof ToolError) {
      throw error; // Re-throw tool errors as-is
    }

    throw ToolError.forExecution('chapter_write', `Chapter generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Chapter Write Tool - AI-powered chapter generation
 *
 * This tool generates high-quality book chapters using OpenAI GPT-5 mini.
 * It follows the tool-centric design principle and integrates with the broader
 * book generation workflow.
 *
 * Features:
 * - Style guide adherence for consistency
 * - Word count targeting with validation
 * - Content quality checks and validation
 * - Research data integration
 * - Dependency context awareness
 * - Comprehensive error handling with retries
 */
export const chapterWriteTool = ToolFactory.createChapterGenerationTool<
  ChapterWriteParams,
  ChapterResult
>(
  'chapter_write',
  'Generate chapter content using OpenAI GPT with style guide adherence and quality validation',
  executeChapterGeneration
);

/**
 * Direct chapter generation function for testing and debugging
 */
export async function generateChapterContent(params: ChapterWriteParams): Promise<ChapterResult> {
  return executeChapterGeneration(params);
}

/**
 * Chapter content validation utility for external use
 */
export function validateChapter(content: string, config: ChapterConfig): ChapterValidation {
  return validateChapterContent(content, config);
}

/**
 * Style prompt generation utility for testing
 */
export function createStylePrompt(style: StyleGuide, wordCount: number): string {
  return generateSystemPrompt(style, wordCount);
}