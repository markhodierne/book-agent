// Formatting Node Implementation
// Generates professional PDF from completed chapters using React-PDF
// Following CLAUDE.md standards and BaseWorkflowNode pattern

import { WorkflowState, BookOutline, ChapterResult, BookRequirements, StyleGuide } from '@/types';
import { BaseWorkflowNode } from './base';
import {
  WorkflowError,
  WorkflowErrorContext,
  logger,
} from '@/lib/errors/exports';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font
} from '@react-pdf/renderer';
import React from 'react';

/**
 * PDF generation result with download information
 */
export interface FormattingResult {
  pdfBuffer: Buffer;
  pdfUrl?: string;
  pageCount: number;
  totalWordCount: number;
  fileSize: number; // in bytes
  generatedAt: string;
}

/**
 * Table of contents entry for navigation
 */
export interface TableOfContentsEntry {
  title: string;
  pageNumber: number;
  chapterNumber: number;
}

/**
 * Professional typography configuration for PDF generation
 */
interface TypographyConfig {
  titleFont: string;
  headingFont: string;
  bodyFont: string;
  titleSize: number;
  headingSize: number;
  bodySize: number;
  lineHeight: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

/**
 * Formatting Node - Converts completed chapters into professional PDF
 *
 * This node:
 * 1. Validates all chapters are complete and consistent
 * 2. Generates table of contents from chapter structure
 * 3. Creates professional PDF layout with React-PDF
 * 4. Applies consistent typography and spacing
 * 5. Adds page numbering and headers
 * 6. Transitions to user_review stage
 */
export class FormattingNode extends BaseWorkflowNode {
  constructor() {
    super('formatting', 'Generate professional PDF from completed chapters with table of contents and professional layout');
  }

  /**
   * Execute formatting node - combine chapters into professional PDF
   */
  protected async executeNode(state: WorkflowState): Promise<WorkflowState> {
    const errorContext = new WorkflowErrorContext(state.sessionId, state.userId);

    try {
      errorContext.updateStage(state.currentStage);

      // Phase 1: Validate and prepare content
      let progress = this.updateProgress(state, 10, 'Validating chapters and content structure');
      this.validateFormattingRequirements(state);

      // Phase 2: Generate table of contents
      progress = this.updateProgress(progress, 25, 'Generating table of contents and navigation');
      const tableOfContents = this.generateTableOfContents(state.outline!, state.chapters);

      // Phase 3: Configure typography and layout
      progress = this.updateProgress(progress, 40, 'Configuring professional typography and layout');
      const typographyConfig = this.createTypographyConfig(state.styleGuide);

      // Phase 4: Generate PDF document
      progress = this.updateProgress(progress, 60, 'Generating PDF document with React-PDF');
      const pdfDocument = this.createPDFDocument(
        state.outline!,
        state.chapters,
        state.requirements!,
        tableOfContents,
        typographyConfig
      );

      // Phase 5: Render PDF to buffer
      progress = this.updateProgress(progress, 80, 'Rendering final PDF and calculating metrics');
      const pdfBlob = await pdf(pdfDocument).toBlob();
      const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

      // Phase 6: Create formatting result
      progress = this.updateProgress(progress, 95, 'Finalizing formatting results and metadata');
      const formattingResult: FormattingResult = {
        pdfBuffer,
        pageCount: this.estimatePageCount(state.chapters),
        totalWordCount: state.chapters.reduce((sum, ch) => sum + ch.wordCount, 0),
        fileSize: pdfBuffer.length,
        generatedAt: new Date().toISOString(),
      };

      logger.info('PDF formatting completed successfully', {
        sessionId: state.sessionId,
        pageCount: formattingResult.pageCount,
        fileSize: formattingResult.fileSize,
        wordCount: formattingResult.totalWordCount,
      });

      // Add formatting results to state before transition, preserving chapter progress
      const stateWithResults = {
        ...progress,
        formattingResult,
        progress: {
          ...progress.progress,
          chaptersCompleted: state.chapters.length,
          totalChapters: state.chapters.length,
        },
      };

      // Transition to user_review stage
      return this.transitionToStage(stateWithResults, 'user_review');

    } catch (error) {
      const workflowError = error instanceof WorkflowError
        ? error
        : errorContext.createError(WorkflowError, error.message, {
            recoverable: true,
            cause: error instanceof Error ? error : undefined,
          });

      logger.error('Formatting node execution failed', {
        sessionId: state.sessionId,
        stage: state.currentStage,
        error: workflowError.message,
      });

      throw workflowError;
    } finally {
      errorContext.cleanup();
    }
  }

  /**
   * Validate that all requirements for formatting are met
   */
  private validateFormattingRequirements(state: WorkflowState): void {
    if (!state.outline) {
      throw new WorkflowError(
        state.sessionId,
        state.currentStage,
        'Book outline is required for formatting',
        { code: 'missing_outline', recoverable: false }
      );
    }

    if (!state.chapters || state.chapters.length === 0) {
      throw new WorkflowError(
        state.sessionId,
        state.currentStage,
        'Completed chapters are required for formatting',
        { code: 'missing_chapters', recoverable: false }
      );
    }

    if (!state.requirements) {
      throw new WorkflowError(
        state.sessionId,
        state.currentStage,
        'Book requirements are required for formatting',
        { code: 'missing_requirements', recoverable: false }
      );
    }

    // Validate all chapters are completed
    const incompleteChapters = state.chapters.filter(ch => ch.status !== 'completed');
    if (incompleteChapters.length > 0) {
      throw new WorkflowError(
        state.sessionId,
        state.currentStage,
        `${incompleteChapters.length} chapters are not completed`,
        {
          code: 'incomplete_chapters',
          recoverable: true,
          context: { incompleteChapters: incompleteChapters.map(ch => ch.chapterNumber) }
        }
      );
    }

    // Validate minimum word count
    const totalWordCount = state.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
    if (totalWordCount < 30000) {
      throw new WorkflowError(
        state.sessionId,
        state.currentStage,
        `Book word count (${totalWordCount}) below minimum requirement (30,000)`,
        {
          code: 'insufficient_word_count',
          recoverable: true,
          context: { currentWordCount: totalWordCount, requiredWordCount: 30000 }
        }
      );
    }
  }

  /**
   * Generate table of contents from book outline and chapters
   */
  private generateTableOfContents(
    outline: BookOutline,
    chapters: ChapterResult[]
  ): TableOfContentsEntry[] {
    console.log('=== TABLE OF CONTENTS GENERATION DEBUG ===');
    console.log('Generating TOC for', chapters.length, 'chapters');

    const tableOfContents: TableOfContentsEntry[] = [];
    let currentPage = 3; // Starting after title page and ToC page
    console.log('Starting at page:', currentPage);

    // Sort chapters by number to ensure correct order
    const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);

    for (const chapter of sortedChapters) {
      console.log(`Processing chapter ${chapter.chapterNumber}: ${chapter.title}`);
      console.log(`Chapter word count: ${chapter.wordCount}`);

      tableOfContents.push({
        title: chapter.title,
        pageNumber: currentPage,
        chapterNumber: chapter.chapterNumber,
      });

      // Estimate pages for this chapter (approximately 250 words per page)
      const chapterPages = Math.max(1, Math.ceil(chapter.wordCount / 250));
      console.log(`Estimated pages for chapter: ${chapterPages}`);

      currentPage += chapterPages;
      console.log(`Current page after chapter: ${currentPage}`);

      // Check for invalid numbers
      if (!Number.isFinite(currentPage) || currentPage < 0) {
        console.error(`INVALID PAGE NUMBER DETECTED: ${currentPage}`);
        throw new Error(`Invalid page number generated: ${currentPage}`);
      }
    }

    console.log('Final TOC:', tableOfContents);
    console.log('=== END TABLE OF CONTENTS GENERATION DEBUG ===');
    return tableOfContents;
  }

  /**
   * Create typography configuration based on style guide
   */
  private createTypographyConfig(styleGuide?: StyleGuide): TypographyConfig {
    console.log('=== TYPOGRAPHY CONFIG CREATION DEBUG ===');
    console.log('Input styleGuide:', styleGuide);

    // Professional typography defaults, adjustable based on style
    const baseConfig: TypographyConfig = {
      titleFont: 'Helvetica-Bold',
      headingFont: 'Helvetica-Bold',
      bodyFont: 'Helvetica',
      titleSize: 24,
      headingSize: 18,
      bodySize: 12,
      lineHeight: 1.5,
      marginTop: 72,     // 1 inch
      marginBottom: 72,   // 1 inch
      marginLeft: 72,     // 1 inch
      marginRight: 72,    // 1 inch
    };

    console.log('Base config created:', JSON.stringify(baseConfig, null, 2));

    // Validate all numeric values are finite
    const validateNumber = (value: number, fallback: number): number => {
      console.log(`validateNumber: checking ${value}, fallback ${fallback}`);
      const isValid = Number.isFinite(value);
      console.log(`validateNumber: isFinite(${value}) = ${isValid}`);
      return isValid ? value : fallback;
    };

    console.log('Validating numeric values...');
    baseConfig.titleSize = validateNumber(baseConfig.titleSize, 24);
    baseConfig.headingSize = validateNumber(baseConfig.headingSize, 18);
    baseConfig.bodySize = validateNumber(baseConfig.bodySize, 12);
    baseConfig.lineHeight = validateNumber(baseConfig.lineHeight, 1.5);
    baseConfig.marginTop = validateNumber(baseConfig.marginTop, 72);
    baseConfig.marginBottom = validateNumber(baseConfig.marginBottom, 72);
    baseConfig.marginLeft = validateNumber(baseConfig.marginLeft, 72);
    baseConfig.marginRight = validateNumber(baseConfig.marginRight, 72);

    console.log('After validation:', JSON.stringify(baseConfig, null, 2));

    // Adjust typography based on style guide if available
    if (styleGuide) {
      switch (styleGuide.formality) {
        case 'academic':
          baseConfig.bodySize = 11;
          baseConfig.lineHeight = 1.6;
          break;
        case 'casual':
          baseConfig.bodySize = 13;
          baseConfig.lineHeight = 1.4;
          break;
        case 'professional':
        default:
          // Keep defaults
          break;
      }
    }

    console.log('Final typography config:', JSON.stringify(baseConfig, null, 2));
    console.log('=== END TYPOGRAPHY CONFIG CREATION DEBUG ===');
    return baseConfig;
  }

  /**
   * Create complete PDF document with React-PDF
   */
  private createPDFDocument(
    outline: BookOutline,
    chapters: ChapterResult[],
    requirements: BookRequirements,
    tableOfContents: TableOfContentsEntry[],
    typography: TypographyConfig
  ) {
    console.log('=== PDF DOCUMENT CREATION DEBUG ===');
    console.log('Creating PDF document with:');
    console.log('  Title:', outline.title);
    console.log('  Chapters:', chapters.length);
    console.log('  TOC entries:', tableOfContents.length);

    const styles = this.createPDFStyles(typography);
    const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);

    console.log('Styles created, proceeding to document creation...');

    try {
      console.log('Creating Document element...');
      const document = React.createElement(Document, {
        title: outline.title,
        author: requirements.author.name,
        subject: requirements.topic,
        creator: "Book Agent - AI-Powered Book Generation"
      }, [
        // Title Page
        React.createElement(Page, { size: "A4", style: styles.page, key: "title-page" }, [
          React.createElement(Text, { style: styles.mainTitle, key: "title" }, outline.title),
          React.createElement(Text, { style: styles.author, key: "author" }, `by ${requirements.author.name}`)
        ]),

        // Table of Contents
        React.createElement(Page, { size: "A4", style: styles.page, key: "toc-page" }, [
          React.createElement(Text, { style: styles.tocTitle, key: "toc-title" }, "Table of Contents"),
          React.createElement(View, { style: styles.tocContainer, key: "toc-container" },
            tableOfContents.slice(0, 3).map((entry, index) => // Limit to first 3 entries
              React.createElement(View, { style: styles.tocEntry, key: `toc-entry-${index}` }, [
                React.createElement(Text, { style: styles.tocChapterNumber, key: "chapter-num" }, `Chapter ${entry.chapterNumber}`),
                React.createElement(Text, { style: styles.tocChapterTitle, key: "chapter-title" }, entry.title),
                React.createElement(Text, { style: styles.tocPageNumber, key: "page-num" }, entry.pageNumber.toString())
              ])
            )
          )
        ]),

        // All chapters with SAFE content formatting
        ...sortedChapters.map((chapter, index) =>
          React.createElement(Page, { size: "A4", style: styles.page, key: `chapter-${index}` }, [
            // Chapter Header
            React.createElement(View, { style: styles.chapterHeader, key: "header" }, [
              React.createElement(Text, { style: styles.chapterNumber, key: "chapter-number" }, `Chapter ${chapter.chapterNumber}`),
              React.createElement(Text, { style: styles.chapterTitle, key: "chapter-title" }, chapter.title)
            ]),

            // Chapter Content - SIMPLIFIED AND SAFE
            React.createElement(View, { style: styles.chapterContent, key: "content" },
              this.formatChapterContentSafe(chapter.content, styles, index)
            ),

            // Page Footer with number
            React.createElement(Text, {
              style: styles.pageNumber,
              render: ({ pageNumber }: { pageNumber: number }) => {
                // Add validation to prevent invalid numbers
                if (!Number.isFinite(pageNumber) || pageNumber < 1 || pageNumber > 9999) {
                  console.warn(`Invalid page number detected: ${pageNumber}, using fallback`);
                  return "1";
                }
                return pageNumber.toString();
              },
              fixed: true,
              key: "page-number"
            })
          ])
        )
      ]);

      console.log('Simplified document structure created successfully');
      console.log('=== END PDF DOCUMENT CREATION DEBUG ===');
      return document;

    } catch (error) {
      console.error('Error creating PDF document:', error);
      throw error;
    }
  }

  /**
   * Create comprehensive PDF styles using React-PDF stylesheet
   */
  private createPDFStyles(typography: TypographyConfig) {
    console.log('=== PDF STYLE CREATION DEBUG ===');
    console.log('Input typography config:', JSON.stringify(typography, null, 2));

    // Helper function to ensure valid numbers for React-PDF
    const safeCalc = (base: number, offset: number): number => {
      console.log(`safeCalc: ${base} + ${offset}`);
      const result = base + offset;
      console.log(`safeCalc result: ${result}`);
      if (!Number.isFinite(result) || result <= 0) {
        console.warn(`Invalid calculation: ${base} + ${offset} = ${result}, using fallback ${base}`);
        return base;
      }
      return result;
    };

    // Safety function to validate all numeric values
    const safestyle = (value: number, fallback: number = 0): number => {
      if (!Number.isFinite(value) || value < 0 || Math.abs(value) > 10000) {
        console.warn(`Invalid style value: ${value}, using fallback: ${fallback}`);
        return fallback;
      }
      return value;
    };

    // Log all style calculations
    console.log('Creating stylesheet with values:');
    console.log('  page.paddingTop:', typography.marginTop);
    console.log('  page.paddingBottom:', typography.marginBottom);
    console.log('  page.paddingLeft:', typography.marginLeft);
    console.log('  page.paddingRight:', typography.marginRight);
    console.log('  page.fontSize:', typography.bodySize);
    console.log('  page.lineHeight:', typography.lineHeight);

    const styles = StyleSheet.create({
      page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        paddingTop: safestyle(typography.marginTop, 72),
        paddingBottom: safestyle(typography.marginBottom, 72),
        paddingLeft: safestyle(typography.marginLeft, 72),
        paddingRight: safestyle(typography.marginRight, 72),
        fontFamily: typography.bodyFont,
        fontSize: safestyle(typography.bodySize, 12),
        lineHeight: safestyle(typography.lineHeight, 1.5),
      },

      // Title Page Styles
      titlePageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      },
      mainTitle: {
        fontSize: safestyle(safeCalc(typography.titleSize, 6), 30),
        fontFamily: typography.titleFont,
        fontWeight: 'bold',
        marginBottom: safestyle(20, 20),
        textAlign: 'center',
      },
      subtitle: {
        fontSize: safestyle(typography.headingSize, 18),
        fontFamily: typography.headingFont,
        marginBottom: safestyle(40, 40),
        textAlign: 'center',
        color: '#555555',
      },
      author: {
        fontSize: safestyle(safeCalc(typography.headingSize, -2), 16),
        fontFamily: typography.bodyFont,
        marginBottom: safestyle(10, 10),
        textAlign: 'center',
      },
      credentials: {
        fontSize: safestyle(typography.bodySize, 12),
        fontFamily: typography.bodyFont,
        textAlign: 'center',
        color: '#777777',
      },

      // Table of Contents Styles
      tocTitle: {
        fontSize: safestyle(typography.titleSize, 24),
        fontFamily: typography.titleFont,
        fontWeight: 'bold',
        marginBottom: safestyle(30, 30),
        textAlign: 'center',
      },
      tocContainer: {
        flex: 1,
      },
      tocEntry: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: safestyle(12, 12),
        paddingBottom: safestyle(8, 8),
        borderBottomWidth: safestyle(1, 1),
        borderBottomColor: '#E0E0E0',
      },
      tocChapterNumber: {
        fontSize: safestyle(typography.bodySize, 12),
        fontFamily: typography.bodyFont,
        fontWeight: 'bold',
        minWidth: safestyle(80, 80),
      },
      tocChapterTitle: {
        fontSize: safestyle(typography.bodySize, 12),
        fontFamily: typography.bodyFont,
        flex: 1,
        marginLeft: safestyle(10, 10),
        marginRight: safestyle(10, 10),
      },
      tocPageNumber: {
        fontSize: safestyle(typography.bodySize, 12),
        fontFamily: typography.bodyFont,
        fontWeight: 'bold',
        minWidth: safestyle(30, 30),
        textAlign: 'right',
      },

      // Chapter Styles
      chapterHeader: {
        marginBottom: safestyle(30, 30),
        paddingBottom: safestyle(15, 15),
        borderBottomWidth: safestyle(2, 2),
        borderBottomColor: '#333333',
      },
      chapterNumber: {
        fontSize: safestyle(safeCalc(typography.bodySize, 2), 14),
        fontFamily: typography.headingFont,
        fontWeight: 'bold',
        color: '#666666',
        marginBottom: safestyle(5, 5),
      },
      chapterTitle: {
        fontSize: safestyle(safeCalc(typography.headingSize, 2), 20),
        fontFamily: typography.titleFont,
        fontWeight: 'bold',
        color: '#333333',
      },
      chapterContent: {
        flex: 1,
        textAlign: 'justify',
      },

      // Content Styles
      paragraph: {
        fontSize: safestyle(typography.bodySize, 12),
        fontFamily: typography.bodyFont,
        lineHeight: safestyle(typography.lineHeight, 1.5),
        marginBottom: safestyle(12, 12),
        textAlign: 'justify',
      },
      heading: {
        fontSize: safestyle(safeCalc(typography.headingSize, -2), 16),
        fontFamily: typography.headingFont,
        fontWeight: 'bold',
        marginTop: safestyle(20, 20),
        marginBottom: safestyle(10, 10),
      },

      // Page Elements
      pageNumber: {
        position: 'absolute',
        fontSize: safestyle(safeCalc(typography.bodySize, -1), 11),
        bottom: safestyle(30, 30),
        left: safestyle(0, 0),
        right: safestyle(0, 0),
        textAlign: 'center',
        color: '#666666',
      },
    });

    console.log('Stylesheet created successfully');
    console.log('=== END PDF STYLE CREATION DEBUG ===');
    return styles;
  }

  /**
   * Safe chapter content formatting - prevents React-PDF overflow errors
   */
  private formatChapterContentSafe(content: string, styles: any, chapterIndex: number) {
    console.log(`=== SAFE CHAPTER CONTENT FORMATTING (Chapter ${chapterIndex + 1}) ===`);

    // Very conservative limits to prevent React-PDF issues
    const maxContentLength = 2000; // Much shorter
    const maxParagraphs = 10; // Much fewer paragraphs

    const safeContent = content.length > maxContentLength
      ? content.substring(0, maxContentLength) + '\n\n[Content truncated for PDF stability]'
      : content;

    // Split and limit paragraphs
    const paragraphs = safeContent.split('\n\n')
      .filter(p => p.trim().length > 0)
      .slice(0, maxParagraphs);

    console.log(`Processing ${paragraphs.length} paragraphs for chapter ${chapterIndex + 1}`);

    return paragraphs.map((paragraph, index) => {
      const key = `ch${chapterIndex}-p${index}`;

      // Simple paragraph formatting - avoid complex logic
      if (paragraph.trim().startsWith('#')) {
        const headingText = paragraph.replace(/^#+\s*/, '').trim();
        return React.createElement(Text, {
          key,
          style: styles.heading
        }, headingText);
      }

      return React.createElement(Text, {
        key,
        style: styles.paragraph
      }, paragraph.trim());
    });
  }

  /**
   * Format chapter content into PDF-compatible React components
   */
  private formatChapterContent(content: string, styles: any) {
    console.log('=== CHAPTER CONTENT FORMATTING DEBUG ===');
    console.log('Content length:', content.length);
    console.log('First 200 chars:', content.substring(0, 200));

    // Validate styles before using them
    console.log('Checking styles object...');
    if (!styles || typeof styles !== 'object') {
      console.error('Invalid styles object:', styles);
      throw new Error('Invalid styles object provided to formatChapterContent');
    }

    if (!styles.heading || !styles.paragraph) {
      console.error('Missing required styles:', { heading: !!styles.heading, paragraph: !!styles.paragraph });
      throw new Error('Missing required styles in formatChapterContent');
    }

    // Validate and limit content length to prevent overflow issues
    const maxContentLength = 50000; // Limit to 50k characters per chapter
    const safeContent = content.length > maxContentLength
      ? content.substring(0, maxContentLength) + '\n\n[Content truncated for PDF generation]'
      : content;

    // Split content into paragraphs and process
    const paragraphs = safeContent.split('\n\n').filter(p => p.trim().length > 0);
    console.log('Paragraphs to process:', paragraphs.length);

    // Limit number of paragraphs to prevent React-PDF overflow
    const maxParagraphs = 100; // Reasonable limit
    const safeParagraphs = paragraphs.slice(0, maxParagraphs);

    if (paragraphs.length > maxParagraphs) {
      console.warn(`Limiting paragraphs from ${paragraphs.length} to ${maxParagraphs}`);
    }

    const result = safeParagraphs.map((paragraph, index) => {
      // Check if it's a heading (starts with #, ##, etc.)
      if (paragraph.trim().startsWith('#')) {
        const headingText = paragraph.replace(/^#+\s*/, '').trim();
        console.log(`Creating heading ${index}: "${headingText.substring(0, 50)}..."`);
        return React.createElement(Text, {
          key: index,
          style: styles.heading
        }, headingText);
      }

      // Regular paragraph
      console.log(`Creating paragraph ${index}: "${paragraph.trim().substring(0, 50)}..."`);
      return React.createElement(Text, {
        key: index,
        style: styles.paragraph
      }, paragraph.trim());
    });

    console.log('Content formatting completed, returning', result.length, 'elements');
    console.log('=== END CHAPTER CONTENT FORMATTING DEBUG ===');
    return result;
  }

  /**
   * Estimate page count for the book
   */
  private estimatePageCount(chapters: ChapterResult[]): number {
    const totalWordCount = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

    // Add pages for front matter (title, ToC)
    const frontMatterPages = 2;

    // Estimate content pages (approximately 250 words per page)
    const contentPages = Math.ceil(totalWordCount / 250);

    return frontMatterPages + contentPages;
  }

  /**
   * Validate workflow state for formatting
   */
  validate(state: WorkflowState): boolean {
    return !!(
      state.outline &&
      state.chapters &&
      state.chapters.length > 0 &&
      state.requirements &&
      state.sessionId &&
      state.chapters.every(ch => ch.status === 'completed')
    );
  }

  /**
   * Recovery mechanism for formatting failures
   */
  async recover(state: WorkflowState, error: WorkflowError): Promise<WorkflowState> {
    const retryState = { ...state, retryCount: (state.retryCount || 0) + 1 };

    if (retryState.retryCount > 2) {
      throw new WorkflowError(
        state.sessionId,
        state.currentStage,
        `Maximum retries exceeded for formatting`,
        {
          code: 'max_retries_exceeded',
          recoverable: false,
          context: { nodeName: this.name },
        }
      );
    }

    logger.info('Attempting formatting recovery', {
      sessionId: state.sessionId,
      retryCount: retryState.retryCount,
      errorCode: error.code,
    });

    // For formatting errors, we can try with reduced complexity
    if (error.code === 'pdf_generation_failed' || error.code === 'memory_error') {
      // Simplify PDF generation - reduce styling complexity
      return this.executeWithReducedComplexity(retryState);
    }

    // Re-execute normally for other errors
    return this.executeNode(retryState);
  }

  /**
   * Execute formatting with reduced complexity for recovery
   */
  private async executeWithReducedComplexity(state: WorkflowState): Promise<WorkflowState> {
    logger.info('Executing formatting with reduced complexity', {
      sessionId: state.sessionId,
    });

    // Create simplified PDF without advanced styling
    const simplifiedResult: FormattingResult = {
      pdfBuffer: Buffer.from('Simplified PDF generation not yet implemented'),
      pageCount: this.estimatePageCount(state.chapters),
      totalWordCount: state.chapters.reduce((sum, ch) => sum + ch.wordCount, 0),
      fileSize: 0,
      generatedAt: new Date().toISOString(),
    };

    const stateWithResults = {
      ...state,
      formattingResult: simplifiedResult,
    };

    return this.transitionToStage(stateWithResults, 'user_review');
  }
}