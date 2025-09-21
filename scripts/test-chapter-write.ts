#!/usr/bin/env npx tsx

import { chapterWriteTool, generateChapterContent, validateChapter, type ChapterWriteParams } from '@/lib/tools/chapterWriteTool';
import type { ChapterConfig, StyleGuide } from '@/types';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Test script for the chapter write tool
 *
 * This script allows testing the chapter generation functionality with real
 * OpenAI API calls to verify the tool works correctly in practice.
 *
 * Usage:
 *   npx tsx scripts/test-chapter-write.ts
 *   npx tsx scripts/test-chapter-write.ts --style casual
 *   npx tsx scripts/test-chapter-write.ts --words 1500
 *   npx tsx scripts/test-chapter-write.ts --with-pdf path/to/file.pdf
 */

// Sample style guides for testing different writing styles
const STYLE_GUIDES: Record<string, StyleGuide> = {
  professional: {
    tone: 'professional',
    voice: 'active',
    perspective: 'third_person',
    formality: 'formal',
    technicalLevel: 'intermediate',
    exampleUsage: 'This professional approach emphasizes clarity and precision. Technical concepts are explained with appropriate detail while maintaining accessibility for the intended audience. The writing maintains a formal tone suitable for business and academic contexts.'
  },

  casual: {
    tone: 'conversational',
    voice: 'active',
    perspective: 'second_person',
    formality: 'casual',
    technicalLevel: 'beginner',
    exampleUsage: 'Hey there! Let\'s dive into this topic together. I\'ll walk you through the concepts step by step, using simple examples that make everything crystal clear. Think of this as a friendly chat about some pretty cool stuff!'
  },

  academic: {
    tone: 'academic',
    voice: 'passive',
    perspective: 'third_person',
    formality: 'formal',
    technicalLevel: 'advanced',
    exampleUsage: 'This research demonstrates that comprehensive analysis of the underlying mechanisms reveals significant implications for theoretical understanding. The methodology employed facilitates rigorous examination of the proposed framework within established scholarly discourse.'
  },

  friendly: {
    tone: 'friendly',
    voice: 'active',
    perspective: 'first_person',
    formality: 'casual',
    technicalLevel: 'intermediate',
    exampleUsage: 'I\'ve found that the best way to understand these concepts is through practical examples. In my experience, breaking down complex ideas into manageable pieces helps everyone learn more effectively. Let me share what I\'ve discovered along the way.'
  }
};

// Sample chapter configurations for testing
const SAMPLE_CHAPTERS: Record<string, Omit<ChapterConfig, 'style'>> = {
  'ai-intro': {
    chapterNumber: 1,
    title: 'Introduction to Artificial Intelligence',
    outline: {
      overview: 'A comprehensive introduction to AI concepts, history, and modern applications',
      objectives: [
        'Define artificial intelligence and its core components',
        'Trace the historical development of AI from concept to reality',
        'Identify key AI applications transforming industries today',
        'Understand the fundamental approaches to AI problem-solving'
      ],
      keyTopics: [
        'Definition and scope of artificial intelligence',
        'Historical milestones and key figures',
        'Machine learning vs traditional programming',
        'Neural networks and deep learning basics',
        'Current AI applications in healthcare, finance, and technology',
        'Ethical considerations and future outlook'
      ],
      wordCount: 2000
    },
    wordTarget: 2000,
    dependencies: [],
    researchTopics: [
      'history of artificial intelligence',
      'machine learning applications 2024',
      'AI ethics and bias',
      'neural network fundamentals'
    ]
  },

  'web-development': {
    chapterNumber: 3,
    title: 'Modern Web Development Frameworks',
    outline: {
      overview: 'Exploring contemporary web development frameworks and their architectural patterns',
      objectives: [
        'Compare popular frontend frameworks and their use cases',
        'Understand component-based architecture principles',
        'Learn about state management patterns',
        'Evaluate framework selection criteria for projects'
      ],
      keyTopics: [
        'React, Vue, and Angular comparison',
        'Component lifecycle and state management',
        'Build tools and development workflows',
        'Performance optimization techniques',
        'Testing strategies for modern web apps'
      ],
      wordCount: 2500
    },
    wordTarget: 2500,
    dependencies: [1, 2],
    researchTopics: [
      'React vs Vue 2024',
      'web framework performance benchmarks',
      'modern JavaScript build tools',
      'web development best practices'
    ]
  },

  'data-science': {
    chapterNumber: 2,
    title: 'Data Science Fundamentals',
    outline: {
      overview: 'Core concepts and methodologies in modern data science practice',
      objectives: [
        'Master the data science workflow from collection to insights',
        'Learn statistical analysis and hypothesis testing',
        'Understand data visualization best practices',
        'Apply machine learning techniques to real problems'
      ],
      keyTopics: [
        'Data collection and cleaning strategies',
        'Exploratory data analysis techniques',
        'Statistical inference and A/B testing',
        'Predictive modeling approaches',
        'Data visualization and storytelling',
        'Ethics in data science practice'
      ],
      wordCount: 1800
    },
    wordTarget: 1800,
    dependencies: [],
    researchTopics: [
      'data science workflow',
      'statistical analysis methods',
      'data visualization tools 2024',
      'machine learning algorithms comparison'
    ]
  }
};

function parseArguments(): {
  chapter: string;
  style: string;
  words?: number;
  pdfPath?: string;
  baseContent?: string;
  research?: string[];
  output?: string;
} {
  const args = process.argv.slice(2);
  const result: any = {
    chapter: 'ai-intro',
    style: 'professional'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--chapter':
        if (next && SAMPLE_CHAPTERS[next]) {
          result.chapter = next;
          i++;
        }
        break;
      case '--style':
        if (next && STYLE_GUIDES[next]) {
          result.style = next;
          i++;
        }
        break;
      case '--words':
        if (next && !isNaN(parseInt(next))) {
          result.words = parseInt(next);
          i++;
        }
        break;
      case '--with-pdf':
        if (next) {
          result.pdfPath = next;
          i++;
        }
        break;
      case '--base-content':
        if (next) {
          result.baseContent = next;
          i++;
        }
        break;
      case '--research':
        if (next) {
          result.research = next.split(',').map(s => s.trim());
          i++;
        }
        break;
      case '--output':
        if (next) {
          result.output = next;
          i++;
        }
        break;
      case '--help':
        console.log(`
Chapter Write Tool Test Script

Usage: npx tsx scripts/test-chapter-write.ts [options]

Options:
  --chapter <name>      Chapter template to use (${Object.keys(SAMPLE_CHAPTERS).join(', ')})
  --style <style>       Writing style (${Object.keys(STYLE_GUIDES).join(', ')})
  --words <number>      Target word count (overrides template)
  --with-pdf <path>     Path to PDF file for base content extraction
  --base-content <text> Direct base content text
  --research <topics>   Comma-separated research topics
  --output <path>       Output file path (defaults to generated-chapter.md)
  --help                Show this help message

Examples:
  npx tsx scripts/test-chapter-write.ts
  npx tsx scripts/test-chapter-write.ts --chapter web-development --style casual
  npx tsx scripts/test-chapter-write.ts --words 1500 --style friendly
  npx tsx scripts/test-chapter-write.ts --with-pdf ./sample.pdf --style academic
`);
        process.exit(0);
    }
  }

  return result;
}

async function loadPdfContent(pdfPath: string): Promise<string | undefined> {
  try {
    // For testing, we'll simulate PDF extraction
    // In real usage, this would use the pdfExtractTool
    console.log(`📄 Would extract content from PDF: ${pdfPath}`);
    return `Sample base content extracted from PDF at ${pdfPath}. This would contain the actual extracted text in a real implementation.`;
  } catch (error) {
    console.warn(`⚠️  Could not load PDF content: ${error}`);
    return undefined;
  }
}

function validateEnvironment(): boolean {
  if (!process.env.OPENAI_API_KEY) {
    console.error(`❌ Missing required environment variable: OPENAI_API_KEY`);
    console.error(`Please add your OpenAI API key to .env.local:`);
    console.error(`OPENAI_API_KEY=sk-...`);
    return false;
  }

  return true;
}

async function main() {
  console.log('🧪 Chapter Write Tool Test Script\n');

  if (!validateEnvironment()) {
    process.exit(1);
  }

  const options = parseArguments();

  // Build chapter configuration
  const baseChapterConfig = SAMPLE_CHAPTERS[options.chapter];
  const styleGuide = STYLE_GUIDES[options.style];

  const chapterConfig: ChapterConfig = {
    ...baseChapterConfig,
    style: styleGuide,
    wordTarget: options.words || baseChapterConfig.wordTarget
  };

  console.log(`📖 Testing chapter generation:`);
  console.log(`   Chapter: ${chapterConfig.title}`);
  console.log(`   Style: ${options.style} (${styleGuide.tone}, ${styleGuide.formality})`);
  console.log(`   Target words: ${chapterConfig.wordTarget}`);

  // Prepare parameters
  const params: ChapterWriteParams = {
    config: chapterConfig
  };

  // Load base content if specified
  if (options.pdfPath) {
    params.baseContent = await loadPdfContent(options.pdfPath);
    console.log(`   PDF content: ${options.pdfPath}`);
  } else if (options.baseContent) {
    params.baseContent = options.baseContent;
    console.log(`   Base content: provided`);
  }

  // Add research data if specified
  if (options.research) {
    params.researchData = options.research.map(topic => `Research finding about ${topic}: This would contain actual research data in a real implementation.`);
    console.log(`   Research topics: ${options.research.join(', ')}`);
  }

  console.log(`\n🚀 Generating chapter...`);
  const startTime = Date.now();

  try {
    // Test the tool
    const result = await chapterWriteTool.invoke(params);
    const duration = Date.now() - startTime;

    if (result.success) {
      const chapter = result.data;

      console.log(`\n✅ Chapter generated successfully!`);
      console.log(`   Execution time: ${duration}ms`);
      console.log(`   Retry attempts: ${result.retryCount}`);
      console.log(`   Generated word count: ${chapter.wordCount}`);
      console.log(`   Target word count: ${chapterConfig.wordTarget}`);

      // Calculate word count accuracy
      const variance = Math.abs(chapter.wordCount - chapterConfig.wordTarget) / chapterConfig.wordTarget;
      const accuracy = Math.round((1 - variance) * 100);
      console.log(`   Word count accuracy: ${accuracy}%`);

      // Validate the content
      const validation = validateChapter(chapter.content, chapterConfig);
      console.log(`   Quality score: ${validation.qualityScore}/100`);

      if (validation.issues.length > 0) {
        console.log(`   ⚠️  Quality issues:`);
        validation.issues.forEach(issue => console.log(`      - ${issue}`));
      }

      // Save the generated content
      const outputPath = options.output || 'generated-chapter.md';
      const markdown = `# ${chapter.title}

*Generated on: ${new Date(chapter.generatedAt).toLocaleString()}*
*Word count: ${chapter.wordCount} words*
*Style: ${options.style}*

---

${chapter.content}

---

**Generation Metadata:**
- Chapter Number: ${chapter.chapterNumber}
- Status: ${chapter.status}
- Research Sources: ${chapter.researchSources?.join(', ') || 'None'}
- Quality Score: ${validation.qualityScore}/100
- Word Count Accuracy: ${accuracy}%
- Generation Time: ${duration}ms
${validation.issues.length > 0 ? `\n**Quality Issues:**\n${validation.issues.map(issue => `- ${issue}`).join('\n')}` : ''}
`;

      writeFileSync(outputPath, markdown, 'utf-8');
      console.log(`\n💾 Chapter saved to: ${outputPath}`);

      // Show content preview
      console.log(`\n📖 Content preview:`);
      console.log(`${chapter.content.substring(0, 300)}${chapter.content.length > 300 ? '...' : ''}`);

      // Performance summary
      console.log(`\n📊 Performance Summary:`);
      console.log(`   Generation speed: ${Math.round(chapter.wordCount / (duration / 1000))} words/second`);
      console.log(`   API efficiency: ${result.retryCount === 0 ? 'Excellent (no retries)' : `${result.retryCount} retries needed`}`);

    } else {
      console.log(`\n❌ Chapter generation failed!`);
      console.log(`   Error: ${result.error}`);
      console.log(`   Execution time: ${duration}ms`);
      console.log(`   Retry attempts: ${result.retryCount}`);
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`\n💥 Unexpected error occurred!`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`   Time until error: ${duration}ms`);
  }

  console.log(`\n🏁 Test completed.`);
}

// Helper function to display available options
function showOptions() {
  console.log(`\n📋 Available Options:`);
  console.log(`\nChapter Templates:`);
  Object.entries(SAMPLE_CHAPTERS).forEach(([key, config]) => {
    console.log(`   ${key}: ${config.title} (${config.wordTarget} words)`);
  });

  console.log(`\nStyle Guides:`);
  Object.entries(STYLE_GUIDES).forEach(([key, style]) => {
    console.log(`   ${key}: ${style.tone}, ${style.formality} (${style.technicalLevel})`);
  });
}

// Show available options if no specific action is requested
if (process.argv.includes('--list') || process.argv.includes('--options')) {
  showOptions();
  process.exit(0);
}

// Run the test
main().catch(error => {
  console.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});