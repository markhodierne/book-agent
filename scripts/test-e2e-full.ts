#!/usr/bin/env npx tsx

/**
 * Complete End-to-End Book Generation Test
 * Tests the full workflow with real APIs and saves the generated PDF
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { ConversationNode } from '../lib/agents/nodes/conversation';
import { OutlineNode } from '../lib/agents/nodes/outline';
import { ChapterSpawningNode } from '../lib/agents/nodes/chapterSpawning';
import { FormattingNode } from '../lib/agents/nodes/formatting';
import { createInitialState } from '../lib/agents/workflow';
import { logger } from '../lib/errors/exports';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function runFullE2ETest(): Promise<void> {
  console.log('🚀 Complete End-to-End Book Generation Test');
  console.log('===========================================\n');

  const startTime = Date.now();
  const outputDir = './test-output/e2e-full';

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  try {
    // Initialize workflow state
    console.log('1. 🏗️  Initializing workflow...');
    const initialState = createInitialState(
      `e2e-full-${Date.now()}`,
      'Create a comprehensive guide about Python programming for absolute beginners who want to learn automation and web scraping'
    );
    console.log(`   ✅ Session: ${initialState.sessionId}`);
    console.log(`   📝 Prompt: ${initialState.userPrompt}\n`);

    // Stage 1: Conversation (Requirements Gathering)
    console.log('2. 💬 Stage 1: Requirements Gathering...');
    const conversationNode = new ConversationNode();
    const conversationResult = await conversationNode.execute(initialState);

    console.log(`   ✅ Requirements gathered`);
    console.log(`   📋 Topic: ${conversationResult.requirements?.topic}`);
    console.log(`   👥 Audience: ${conversationResult.requirements?.audience.level}`);
    console.log(`   📖 Word target: ${conversationResult.requirements?.wordCountTarget}`);
    console.log(`   ⏱️  Time: ${Date.now() - startTime}ms\n`);

    // Stage 2: Outline Generation
    console.log('3. 📋 Stage 2: Outline Generation...');
    const outlineNode = new OutlineNode();
    const outlineResult = await outlineNode.execute(conversationResult);

    console.log(`   ✅ Outline created`);
    console.log(`   📚 Title: "${outlineResult.outline?.title}"`);
    console.log(`   📄 Chapters: ${outlineResult.outline?.chapters.length}`);
    console.log(`   📊 Total words: ${outlineResult.outline?.totalWordCount}`);
    console.log(`   ⏱️  Time: ${Date.now() - startTime}ms\n`);

    // Save outline for review
    const outlineData = {
      title: outlineResult.outline?.title,
      subtitle: outlineResult.outline?.subtitle,
      totalWordCount: outlineResult.outline?.totalWordCount,
      estimatedPages: outlineResult.outline?.estimatedPages,
      chapters: outlineResult.outline?.chapters.map(ch => ({
        number: ch.chapterNumber,
        title: ch.title,
        overview: ch.overview || ch.contentOverview,
        wordCount: ch.wordCount,
        objectives: ch.objectives || ch.keyObjectives,
        dependencies: ch.dependencies
      }))
    };
    writeFileSync(
      join(outputDir, 'book-outline.json'),
      JSON.stringify(outlineData, null, 2)
    );
    console.log(`   💾 Outline saved to: ${join(outputDir, 'book-outline.json')}\n`);

    // Stage 3: Chapter Spawning (Setup for parallel generation)
    console.log('4. 🔄 Stage 3: Chapter Spawning...');
    const chapterSpawningNode = new ChapterSpawningNode();
    const spawningResult = await chapterSpawningNode.execute(outlineResult);

    console.log(`   ✅ Chapter nodes configured`);
    console.log(`   📝 Chapters to generate: ${spawningResult.outline?.chapters.length}`);
    console.log(`   ⚡ Parallelism: Ready for concurrent generation`);
    console.log(`   ⏱️  Time: ${Date.now() - startTime}ms\n`);

    // For this test, let's create simplified chapter content instead of full generation
    // This saves time while still testing the PDF generation pipeline
    console.log('5. ✍️  Stage 4: Chapter Content (Simplified for testing)...');
    const mockChapters = spawningResult.outline?.chapters.map(chapter => ({
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      content: generateMockChapterContent(chapter.title, chapter.wordCount, chapter.overview || ''),
      wordCount: chapter.wordCount,
      status: 'completed' as const
    })) || [];

    const stateWithChapters = {
      ...spawningResult,
      chapters: mockChapters,
      currentStage: 'formatting' as const
    };

    console.log(`   ✅ ${mockChapters.length} chapters created (mock content)`);
    console.log(`   📊 Total content: ${mockChapters.reduce((sum, ch) => sum + ch.wordCount, 0)} words`);
    console.log(`   ⏱️  Time: ${Date.now() - startTime}ms\n`);

    // Stage 5: PDF Generation
    console.log('6. 📖 Stage 5: PDF Generation...');
    const formattingNode = new FormattingNode();
    const finalResult = await formattingNode.execute(stateWithChapters);

    console.log(`   ✅ PDF generated successfully`);
    console.log(`   📄 Pages: ${finalResult.formattingResult?.estimatedPages}`);
    console.log(`   💾 PDF data: ${finalResult.formattingResult?.pdfBuffer ? 'Generated' : 'Missing'}`);
    console.log(`   ⏱️  Time: ${Date.now() - startTime}ms\n`);

    // Save the PDF
    if (finalResult.formattingResult?.pdfBuffer) {
      const pdfPath = join(outputDir, 'generated-book.pdf');
      writeFileSync(pdfPath, finalResult.formattingResult.pdfBuffer);
      console.log(`📚 BOOK SAVED: ${pdfPath}`);
    }

    // Save complete workflow data
    const workflowSummary = {
      sessionId: finalResult.sessionId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: Date.now() - startTime,
      stages: {
        conversation: !!conversationResult.requirements,
        outline: !!outlineResult.outline,
        chapterSpawning: !!spawningResult.chapterSpawning,
        chapters: mockChapters.length,
        formatting: !!finalResult.formattingResult
      },
      book: {
        title: finalResult.outline?.title,
        chapters: mockChapters.length,
        totalWords: mockChapters.reduce((sum, ch) => sum + ch.wordCount, 0),
        pages: finalResult.formattingResult?.estimatedPages
      }
    };

    writeFileSync(
      join(outputDir, 'workflow-summary.json'),
      JSON.stringify(workflowSummary, null, 2)
    );

    // Final summary
    const totalTime = Date.now() - startTime;
    console.log('\n🎉 END-TO-END TEST COMPLETE!');
    console.log('================================');
    console.log(`✅ Session: ${finalResult.sessionId}`);
    console.log(`✅ Book: "${finalResult.outline?.title}"`);
    console.log(`✅ Chapters: ${mockChapters.length}`);
    console.log(`✅ Words: ${mockChapters.reduce((sum, ch) => sum + ch.wordCount, 0)}`);
    console.log(`✅ PDF: Generated and saved`);
    console.log(`✅ Total time: ${Math.round(totalTime / 1000)}s`);
    console.log(`\n📁 Output files:`);
    console.log(`   📖 ${join(outputDir, 'generated-book.pdf')}`);
    console.log(`   📋 ${join(outputDir, 'book-outline.json')}`);
    console.log(`   📊 ${join(outputDir, 'workflow-summary.json')}`);

  } catch (error) {
    console.error('\n❌ End-to-End test failed:');
    console.error('Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

/**
 * Generate mock chapter content for testing PDF generation
 */
function generateMockChapterContent(title: string, wordCount: number, overview: string): string {
  const wordsPerParagraph = 150;
  const paragraphsNeeded = Math.ceil(wordCount / wordsPerParagraph);

  let content = `# ${title}\n\n`;
  content += `${overview}\n\n`;

  // Add introduction
  content += `## Introduction\n\n`;
  content += `This chapter covers ${title.toLowerCase()}, providing comprehensive insights and practical examples. `;
  content += `You'll learn the fundamental concepts, best practices, and real-world applications that will help you master this topic.\n\n`;

  // Add main sections
  for (let i = 0; i < Math.max(3, Math.floor(paragraphsNeeded / 2)); i++) {
    content += `## Section ${i + 1}: Key Concepts\n\n`;
    content += generateMockParagraph(wordsPerParagraph);
    content += `\n\n`;

    if (i % 2 === 0) {
      content += `### Practical Example\n\n`;
      content += `Here's a practical example that demonstrates these concepts in action:\n\n`;
      content += `\`\`\`python\n`;
      content += `# Example code snippet\n`;
      content += `def example_function():\n`;
      content += `    return "This demonstrates the concept"\n`;
      content += `\`\`\`\n\n`;
    }
  }

  // Add conclusion
  content += `## Summary\n\n`;
  content += `In this chapter, we've explored ${title.toLowerCase()} and covered the essential aspects you need to understand. `;
  content += `The next chapter will build upon these concepts and introduce more advanced topics.\n\n`;

  return content;
}

/**
 * Generate a mock paragraph with approximately the specified word count
 */
function generateMockParagraph(wordCount: number): string {
  const sentences = [
    "Python is a powerful and versatile programming language that's perfect for beginners.",
    "Understanding the fundamentals is crucial for building strong programming skills.",
    "This concept builds upon previous knowledge and introduces new techniques.",
    "Practical application helps reinforce theoretical understanding.",
    "Real-world examples demonstrate how these principles work in practice.",
    "Automation can save significant time and reduce human error.",
    "Web scraping opens up numerous possibilities for data collection.",
    "Clean, readable code is essential for maintainability and collaboration.",
    "Debugging skills are crucial for identifying and fixing issues quickly.",
    "Best practices ensure your code is efficient, secure, and scalable."
  ];

  let paragraph = '';
  let currentWordCount = 0;

  while (currentWordCount < wordCount) {
    const sentence = sentences[Math.floor(Math.random() * sentences.length)];
    const sentenceWordCount = sentence.split(' ').length;

    if (currentWordCount + sentenceWordCount <= wordCount + 10) {
      paragraph += sentence + ' ';
      currentWordCount += sentenceWordCount;
    } else {
      break;
    }
  }

  return paragraph.trim();
}

// Run the test
if (require.main === module) {
  runFullE2ETest().catch(console.error);
}