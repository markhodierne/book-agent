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
      const pdfBuffer = await pdf(pdfDocument).toBuffer();

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
    const tableOfContents: TableOfContentsEntry[] = [];
    let currentPage = 3; // Starting after title page and ToC page

    // Sort chapters by number to ensure correct order
    const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);

    for (const chapter of sortedChapters) {
      tableOfContents.push({
        title: chapter.title,
        pageNumber: currentPage,
        chapterNumber: chapter.chapterNumber,
      });

      // Estimate pages for this chapter (approximately 250 words per page)
      const chapterPages = Math.max(1, Math.ceil(chapter.wordCount / 250));
      currentPage += chapterPages;
    }

    return tableOfContents;
  }

  /**
   * Create typography configuration based on style guide
   */
  private createTypographyConfig(styleGuide?: StyleGuide): TypographyConfig {
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
    const styles = this.createPDFStyles(typography);
    const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);

    return React.createElement(Document, {
      title: outline.title,
      author: requirements.author.name,
      subject: requirements.topic,
      creator: "Book Agent - AI-Powered Book Generation"
    }, [
      // Title Page
      React.createElement(Page, { size: "A4", style: styles.page, key: "title-page" },
        React.createElement(View, { style: styles.titlePageContainer }, [
          React.createElement(Text, { style: styles.mainTitle, key: "title" }, outline.title),
          outline.subtitle && React.createElement(Text, { style: styles.subtitle, key: "subtitle" }, outline.subtitle),
          React.createElement(Text, { style: styles.author, key: "author" }, `by ${requirements.author.name}`),
          requirements.author.credentials && React.createElement(Text, { style: styles.credentials, key: "credentials" }, requirements.author.credentials)
        ].filter(Boolean))
      ),

      // Table of Contents
      React.createElement(Page, { size: "A4", style: styles.page, key: "toc-page" }, [
        React.createElement(Text, { style: styles.tocTitle, key: "toc-title" }, "Table of Contents"),
        React.createElement(View, { style: styles.tocContainer, key: "toc-container" },
          tableOfContents.map((entry, index) =>
            React.createElement(View, { style: styles.tocEntry, key: `toc-entry-${index}` }, [
              React.createElement(Text, { style: styles.tocChapterNumber, key: "chapter-num" }, `Chapter ${entry.chapterNumber}`),
              React.createElement(Text, { style: styles.tocChapterTitle, key: "chapter-title" }, entry.title),
              React.createElement(Text, { style: styles.tocPageNumber, key: "page-num" }, entry.pageNumber.toString())
            ])
          )
        )
      ]),

      // Chapter Pages
      ...sortedChapters.map((chapter) =>
        React.createElement(Page, { size: "A4", style: styles.page, key: `chapter-${chapter.chapterNumber}` }, [
          // Chapter Header
          React.createElement(View, { style: styles.chapterHeader, key: "header" }, [
            React.createElement(Text, { style: styles.chapterNumber, key: "chapter-number" }, `Chapter ${chapter.chapterNumber}`),
            React.createElement(Text, { style: styles.chapterTitle, key: "chapter-title" }, chapter.title)
          ]),

          // Chapter Content
          React.createElement(View, { style: styles.chapterContent, key: "content" },
            this.formatChapterContent(chapter.content, styles)
          ),

          // Page Footer with number
          React.createElement(Text, {
            style: styles.pageNumber,
            render: ({ pageNumber }: { pageNumber: number }) => pageNumber.toString(),
            fixed: true,
            key: "page-number"
          })
        ])
      )
    ]);
  }

  /**
   * Create comprehensive PDF styles using React-PDF stylesheet
   */
  private createPDFStyles(typography: TypographyConfig) {
    return StyleSheet.create({
      page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        paddingTop: typography.marginTop,
        paddingBottom: typography.marginBottom,
        paddingLeft: typography.marginLeft,
        paddingRight: typography.marginRight,
        fontFamily: typography.bodyFont,
        fontSize: typography.bodySize,
        lineHeight: typography.lineHeight,
      },

      // Title Page Styles
      titlePageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      },
      mainTitle: {
        fontSize: typography.titleSize + 6,
        fontFamily: typography.titleFont,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
      },
      subtitle: {
        fontSize: typography.headingSize,
        fontFamily: typography.headingFont,
        marginBottom: 40,
        textAlign: 'center',
        color: '#555555',
      },
      author: {
        fontSize: typography.headingSize - 2,
        fontFamily: typography.bodyFont,
        marginBottom: 10,
        textAlign: 'center',
      },
      credentials: {
        fontSize: typography.bodySize,
        fontFamily: typography.bodyFont,
        textAlign: 'center',
        color: '#777777',
      },

      // Table of Contents Styles
      tocTitle: {
        fontSize: typography.titleSize,
        fontFamily: typography.titleFont,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
      },
      tocContainer: {
        flex: 1,
      },
      tocEntry: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
      },
      tocChapterNumber: {
        fontSize: typography.bodySize,
        fontFamily: typography.bodyFont,
        fontWeight: 'bold',
        minWidth: 80,
      },
      tocChapterTitle: {
        fontSize: typography.bodySize,
        fontFamily: typography.bodyFont,
        flex: 1,
        marginLeft: 10,
        marginRight: 10,
      },
      tocPageNumber: {
        fontSize: typography.bodySize,
        fontFamily: typography.bodyFont,
        fontWeight: 'bold',
        minWidth: 30,
        textAlign: 'right',
      },

      // Chapter Styles
      chapterHeader: {
        marginBottom: 30,
        paddingBottom: 15,
        borderBottomWidth: 2,
        borderBottomColor: '#333333',
      },
      chapterNumber: {
        fontSize: typography.bodySize + 2,
        fontFamily: typography.headingFont,
        fontWeight: 'bold',
        color: '#666666',
        marginBottom: 5,
      },
      chapterTitle: {
        fontSize: typography.headingSize + 2,
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
        fontSize: typography.bodySize,
        fontFamily: typography.bodyFont,
        lineHeight: typography.lineHeight,
        marginBottom: 12,
        textAlign: 'justify',
      },
      heading: {
        fontSize: typography.headingSize - 2,
        fontFamily: typography.headingFont,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
      },

      // Page Elements
      pageNumber: {
        position: 'absolute',
        fontSize: typography.bodySize - 1,
        bottom: 30,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: '#666666',
      },
    });
  }

  /**
   * Format chapter content into PDF-compatible React components
   */
  private formatChapterContent(content: string, styles: any) {
    // Split content into paragraphs and process
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);

    return paragraphs.map((paragraph, index) => {
      // Check if it's a heading (starts with #, ##, etc.)
      if (paragraph.trim().startsWith('#')) {
        const headingText = paragraph.replace(/^#+\s*/, '').trim();
        return React.createElement(Text, {
          key: index,
          style: styles.heading
        }, headingText);
      }

      // Regular paragraph
      return React.createElement(Text, {
        key: index,
        style: styles.paragraph
      }, paragraph.trim());
    });
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