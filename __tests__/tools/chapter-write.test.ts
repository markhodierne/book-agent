import { describe, it, expect, vi, beforeEach } from 'vitest';
import OpenAI from 'openai';
import {
  chapterWriteTool,
  generateChapterContent,
  validateChapter,
  createStylePrompt,
  type ChapterWriteParams,
} from '@/lib/tools/chapterWriteTool';
import type { ChapterConfig, StyleGuide, ChapterResult } from '@/types';

// Mock OpenAI
vi.mock('openai', () => {
  const APIError = class extends Error {
    status?: number;
    type?: string;
    code?: string;
    constructor(message: string, status?: number, type?: string, code?: string) {
      super(message);
      this.status = status;
      this.type = type;
      this.code = code;
    }
  };

  return {
    default: vi.fn(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
    APIError,
  };
});

// Mock environment config
vi.mock('@/lib/config/environment', () => ({
  getEnvironmentConfig: vi.fn(() => ({
    OPENAI_API_KEY: 'test-api-key',
    SUPABASE_URL: 'test-url',
    SUPABASE_ANON_KEY: 'test-key',
    FIRECRAWL_API_KEY: 'test-key',
    NODE_ENV: 'test'
  })),
}));

describe('chapterWriteTool', () => {
  const mockOpenAI = vi.mocked(OpenAI);
  let mockCompletion: ReturnType<typeof vi.fn>;

  const sampleStyleGuide: StyleGuide = {
    tone: 'professional',
    voice: 'active',
    perspective: 'third_person',
    formality: 'formal',
    technicalLevel: 'intermediate',
    exampleUsage: 'This is a sample writing style that demonstrates professional tone with active voice. The content should be informative and engaging while maintaining clarity.'
  };

  const sampleChapterConfig: ChapterConfig = {
    chapterNumber: 1,
    title: 'Introduction to AI',
    outline: {
      overview: 'An introduction to artificial intelligence concepts',
      objectives: [
        'Define artificial intelligence and its scope',
        'Explain key AI concepts and terminology',
        'Provide historical context and evolution'
      ],
      keyTopics: [
        'Machine Learning basics',
        'Neural Networks overview',
        'AI applications in industry'
      ],
      wordCount: 2000
    },
    wordTarget: 2000,
    dependencies: [],
    style: sampleStyleGuide,
    researchTopics: ['machine learning', 'neural networks', 'AI history']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCompletion = vi.fn();
    (mockOpenAI as any).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCompletion,
        },
      },
    }));
  });

  describe('Chapter Generation', () => {
    it('should generate a complete chapter successfully', async () => {
      const sampleContent = `# Introduction to AI

Artificial Intelligence (AI) represents one of the most transformative technologies of our time. This field encompasses a wide range of techniques and approaches designed to create systems that can perform tasks typically requiring human intelligence.

## What is Artificial Intelligence?

At its core, AI involves creating computer systems capable of performing tasks that normally require human intelligence. This includes learning, reasoning, problem-solving, perception, and language understanding. The field has evolved significantly since its inception in the 1950s, moving from theoretical concepts to practical applications that impact our daily lives.

## Machine Learning Fundamentals

Machine learning, a subset of AI, enables systems to automatically learn and improve from experience without being explicitly programmed. This approach has proven particularly effective in pattern recognition, data analysis, and predictive modeling.

### Types of Machine Learning

There are three primary categories of machine learning:
- Supervised learning: Uses labeled data to train models
- Unsupervised learning: Finds patterns in unlabeled data
- Reinforcement learning: Learns through interaction and feedback

## Neural Networks Overview

Neural networks represent a computational approach inspired by biological neural networks. These systems consist of interconnected nodes that process information in parallel, making them particularly effective for complex pattern recognition tasks.

## AI Applications in Industry

Today's AI applications span numerous industries:
- Healthcare: Medical diagnosis and drug discovery
- Finance: Fraud detection and algorithmic trading
- Transportation: Autonomous vehicles and route optimization
- Manufacturing: Quality control and predictive maintenance

The continued advancement of AI technologies promises to revolutionize how we work, communicate, and solve complex global challenges. Understanding these foundational concepts provides the groundwork for exploring more specialized AI applications and techniques.`;

      mockCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: sampleContent
          }
        }]
      });

      const params: ChapterWriteParams = {
        config: sampleChapterConfig
      };

      const result = await chapterWriteTool.invoke(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.chapterNumber).toBe(1);
        expect(result.data.title).toBe('Introduction to AI');
        expect(result.data.content).toContain('Artificial Intelligence');
        expect(result.data.wordCount).toBeGreaterThan(250); // Lower threshold for test content
        expect(result.data.status).toBe('completed');
        expect(result.data.generatedAt).toBeDefined();
      }

      // Verify OpenAI was called correctly
      expect(mockCompletion).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('professional')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Introduction to AI')
          })
        ]),
        max_tokens: expect.any(Number),
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      });
    });

    it('should incorporate base content from PDF extraction', async () => {
      const baseContent = 'AI systems are computational models designed to simulate intelligent behavior. Machine learning algorithms enable these systems to learn from data.';

      mockCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: 'Generated chapter content incorporating the base material about AI systems and machine learning algorithms...'
          }
        }]
      });

      const params: ChapterWriteParams = {
        config: sampleChapterConfig,
        baseContent
      };

      await chapterWriteTool.invoke(params);

      // Verify the user prompt includes base content
      const userPrompt = mockCompletion.mock.calls[0][0].messages.find(
        (msg: any) => msg.role === 'user'
      ).content;

      expect(userPrompt).toContain('Reference Content');
      expect(userPrompt).toContain('AI systems are computational models');
    });

    it('should include research data when provided', async () => {
      const researchData = [
        'Research shows that neural networks have improved accuracy by 40% in image recognition tasks.',
        'Industry reports indicate AI adoption has increased by 60% in financial services.'
      ];

      mockCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: 'Chapter content incorporating research findings about neural networks and AI adoption...'
          }
        }]
      });

      const params: ChapterWriteParams = {
        config: sampleChapterConfig,
        researchData
      };

      const result = await chapterWriteTool.invoke(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.researchSources).toContain('Web research data');
      }

      // Verify research data is included in prompt
      const userPrompt = mockCompletion.mock.calls[0][0].messages.find(
        (msg: any) => msg.role === 'user'
      ).content;

      expect(userPrompt).toContain('Additional Research Context');
      expect(userPrompt).toContain('neural networks have improved accuracy');
    });

    it('should handle context from dependent chapters', async () => {
      const contextFromDependencies = 'Previous chapters established the fundamental concepts of computational thinking and data structures.';

      mockCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: 'Chapter content building on previous concepts of computational thinking...'
          }
        }]
      });

      const params: ChapterWriteParams = {
        config: sampleChapterConfig,
        contextFromDependencies
      };

      await chapterWriteTool.invoke(params);

      const userPrompt = mockCompletion.mock.calls[0][0].messages.find(
        (msg: any) => msg.role === 'user'
      ).content;

      expect(userPrompt).toContain('Context from Previous Chapters');
      expect(userPrompt).toContain('computational thinking');
    });
  });

  describe('Content Validation', () => {
    it('should validate word count within acceptable range', () => {
      const content = `This is a test chapter with proper structure.

This is the second paragraph that provides additional content and structure for validation purposes.

This is the third paragraph that ensures we meet the minimum paragraph requirements for proper chapter structure.

${('This is content for word count purposes. '.repeat(50))}`;
      const validation = validateChapter(content, { ...sampleChapterConfig, wordTarget: 400 });

      expect(validation.isValid).toBe(true);
      expect(validation.wordCount).toBeCloseTo(400, -1);
      expect(validation.qualityScore).toBeGreaterThan(70);
    });

    it('should flag content with word count too far from target', () => {
      const shortContent = 'Very short content.';
      const validation = validateChapter(shortContent, sampleChapterConfig);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain(
        expect.stringContaining('Word count')
      );
    });

    it('should detect placeholder content', () => {
      const placeholderContent = 'This chapter will cover [insert topics here] and explain [TODO: add explanation].';
      const validation = validateChapter(placeholderContent, sampleChapterConfig);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain(
        expect.stringContaining('placeholder text')
      );
    });

    it('should require minimum paragraph structure', () => {
      const singleParagraphContent = 'This is a single very long paragraph that goes on and on without proper breaks which makes for poor chapter structure and readability issues for the reader.';
      const validation = validateChapter(singleParagraphContent, sampleChapterConfig);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain(
        expect.stringContaining('multiple paragraphs')
      );
    });
  });

  describe('Style Prompt Generation', () => {
    it('should generate appropriate system prompt with style guide', () => {
      const prompt = createStylePrompt(sampleStyleGuide, 2000);

      expect(prompt).toContain('professional');
      expect(prompt).toContain('active');
      expect(prompt).toContain('third person');
      expect(prompt).toContain('formal');
      expect(prompt).toContain('intermediate');
      expect(prompt).toContain('Target word count: 2000');
      expect(prompt).toContain(sampleStyleGuide.exampleUsage);
    });

    it('should adapt prompt for different styles', () => {
      const casualStyle: StyleGuide = {
        tone: 'conversational',
        voice: 'active',
        perspective: 'second_person',
        formality: 'casual',
        technicalLevel: 'beginner',
        exampleUsage: 'Hey there! Let\'s dive into this topic together.'
      };

      const prompt = createStylePrompt(casualStyle, 1500);

      expect(prompt).toContain('conversational');
      expect(prompt).toContain('second person');
      expect(prompt).toContain('casual');
      expect(prompt).toContain('beginner');
      expect(prompt).toContain('Target word count: 1500');
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      const apiError = new Error('Rate limit exceeded');
      (apiError as any).status = 429;
      (apiError as any).type = 'rate_limit';
      (apiError as any).code = 'rate_limit_exceeded';
      mockCompletion.mockRejectedValue(apiError);

      const params: ChapterWriteParams = {
        config: sampleChapterConfig
      };

      const result = await chapterWriteTool.invoke(params);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Rate limit exceeded');
      }
    });

    it('should handle empty response from OpenAI', async () => {
      mockCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: null
          }
        }]
      });

      const params: ChapterWriteParams = {
        config: sampleChapterConfig
      };

      const result = await chapterWriteTool.invoke(params);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('empty');
      }
    });

    it('should handle network errors', async () => {
      mockCompletion.mockRejectedValue(new Error('Network connection failed'));

      const params: ChapterWriteParams = {
        config: sampleChapterConfig
      };

      const result = await chapterWriteTool.invoke(params);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Network connection failed');
      }
    });

    it('should handle content quality validation failures', async () => {
      // Return content that will fail validation
      mockCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: 'Too short.'
          }
        }]
      });

      const params: ChapterWriteParams = {
        config: sampleChapterConfig
      };

      const result = await chapterWriteTool.invoke(params);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('validation');
      }
    });
  });

  describe('Tool Integration', () => {
    it('should have correct tool configuration', () => {
      expect(chapterWriteTool.name).toBe('chapter_write');
      expect(chapterWriteTool.description).toContain('Generate chapter content');
      expect(chapterWriteTool.config.retryConfig?.maxRetries).toBe(1);
      expect(chapterWriteTool.config.timeout).toBe(300000); // 5 minutes
    });

    it('should support raw invocation for testing', async () => {
      mockCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: 'Test chapter content with proper length and structure. This paragraph provides enough content to meet basic validation requirements for testing purposes.'
          }
        }]
      });

      const params: ChapterWriteParams = {
        config: sampleChapterConfig
      };

      const result = await generateChapterContent(params);

      expect(result.chapterNumber).toBe(1);
      expect(result.title).toBe('Introduction to AI');
      expect(result.content).toContain('Test chapter content');
      expect(result.status).toBe('completed');
    });

    it('should track execution metrics', async () => {
      mockCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: 'Chapter content for metrics testing. This needs to be long enough to pass validation checks and demonstrate proper tool functionality.'
          }
        }]
      });

      const params: ChapterWriteParams = {
        config: sampleChapterConfig
      };

      const result = await chapterWriteTool.invoke(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.executionTime).toBeGreaterThan(0);
        expect(result.retryCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Chapter Result Structure', () => {
    it('should return properly structured chapter result', async () => {
      const sampleContent = 'Complete chapter content with multiple paragraphs and proper structure for testing validation requirements.';

      mockCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: sampleContent
          }
        }]
      });

      const params: ChapterWriteParams = {
        config: sampleChapterConfig,
        baseContent: 'Some base content',
        researchData: ['Research finding 1'],
        contextFromDependencies: 'Previous chapter context'
      };

      const result = await chapterWriteTool.invoke(params);

      expect(result.success).toBe(true);
      if (result.success) {
        const chapter = result.data;

        // Check all required properties
        expect(chapter.chapterNumber).toBe(sampleChapterConfig.chapterNumber);
        expect(chapter.title).toBe(sampleChapterConfig.title);
        expect(chapter.content).toBe(sampleContent);
        expect(chapter.wordCount).toBeGreaterThan(0);
        expect(chapter.status).toBe('completed');
        expect(chapter.researchSources).toEqual(['Web research data', 'PDF base content', 'Dependent chapters']);
        expect(chapter.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      }
    });
  });
});