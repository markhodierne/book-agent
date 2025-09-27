#!/usr/bin/env npx tsx

/**
 * Debug Outline Generation Issues
 * Isolate and identify the specific problem with outline generation
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { BookGenerationAgents } from '../lib/agents/gpt5-wrapper';
import { logger } from '../lib/errors/exports';

async function debugOutlineGeneration(): Promise<void> {
  console.log('🔍 Debugging Outline Generation');
  console.log('===============================\n');

  try {
    // Test 1: Simple title generation
    console.log('1. 🎯 Testing Title Generation...');
    const titleAgent = BookGenerationAgents.titleGenerator();

    const titlePrompt = `Generate 3-5 book title options for:
Topic: Python automation and web scraping for beginners
Audience: Intermediate developers
Word Target: 35,000 words

Return titles only, one per line.`;

    console.log('   Sending prompt to title agent...');
    const titleStart = Date.now();

    try {
      const titleResponse = await titleAgent.execute(titlePrompt);
      const titleDuration = Date.now() - titleStart;

      console.log(`   ✅ Title generation successful!`);
      console.log(`   ⏱️  Duration: ${titleDuration}ms`);
      console.log(`   📝 Response length: ${titleResponse.content?.length || 0} chars`);
      console.log(`   📄 First 200 chars: ${titleResponse.content?.slice(0, 200) || 'No content'}`);

      // Check if we can parse titles
      const titles = titleResponse.content?.split('\n').filter(line => line.trim()) || [];
      console.log(`   📚 Titles found: ${titles.length}`);
      titles.forEach((title, i) => console.log(`      ${i + 1}. ${title.trim()}`));

    } catch (titleError) {
      console.log(`   ❌ Title generation failed:`);
      console.log(`      Error: ${titleError instanceof Error ? titleError.message : titleError}`);
      console.log(`      Type: ${titleError?.constructor?.name}`);
      if (titleError instanceof Error && titleError.stack) {
        console.log(`      Stack: ${titleError.stack.slice(0, 500)}...`);
      }
      return;
    }

    console.log('\n2. 🏗️ Testing Structure Planning...');
    const structureAgent = BookGenerationAgents.structurePlanner();

    const structurePrompt = `Plan chapter structure for:
Title: Python Automation Guide for Beginners
Topic: Python automation and web scraping
Target Words: 35,000
Chapters: 8-15

Format:
TOTAL CHAPTERS: [number]
WORD DISTRIBUTION: [comma-separated word counts]
CHAPTER TITLES:
1. [title]
2. [title]
...`;

    console.log('   Sending prompt to structure agent...');
    const structureStart = Date.now();

    try {
      const structureResponse = await structureAgent.execute(structurePrompt);
      const structureDuration = Date.now() - structureStart;

      console.log(`   ✅ Structure planning successful!`);
      console.log(`   ⏱️  Duration: ${structureDuration}ms`);
      console.log(`   📝 Response length: ${structureResponse.content?.length || 0} chars`);
      console.log(`   📄 First 500 chars:`);
      console.log(`      ${structureResponse.content?.slice(0, 500) || 'No content'}`);

      // Test parsing logic
      const content = structureResponse.content || '';
      const lines = content.split('\n');
      let totalChapters = 0;
      let wordDistribution: number[] = [];
      const chapterTitles: string[] = [];

      for (const line of lines) {
        const chaptersMatch = line.match(/TOTAL CHAPTERS:\s*(\d+)/i);
        if (chaptersMatch) {
          totalChapters = parseInt(chaptersMatch[1]);
          console.log(`   📊 Found total chapters: ${totalChapters}`);
        }

        const wordsMatch = line.match(/WORD DISTRIBUTION:\s*(.+)/i);
        if (wordsMatch) {
          const words = wordsMatch[1].split(',').map(w => parseInt(w.trim())).filter(w => !isNaN(w));
          wordDistribution = words;
          console.log(`   📈 Found word distribution: ${wordDistribution.length} values`);
        }

        const titleMatch = line.match(/^\d+\.\s*(.+)$/);
        if (titleMatch) {
          chapterTitles.push(titleMatch[1].trim());
        }
      }

      console.log(`   📚 Parsed titles: ${chapterTitles.length}`);
      console.log(`   📊 Parsed word counts: ${wordDistribution.length}`);

      if (chapterTitles.length === 0) {
        console.log(`   ⚠️  No chapter titles found in response!`);
        console.log(`   📄 Full response:`);
        console.log(content);
      }

    } catch (structureError) {
      console.log(`   ❌ Structure planning failed:`);
      console.log(`      Error: ${structureError instanceof Error ? structureError.message : structureError}`);
      console.log(`      Type: ${structureError?.constructor?.name}`);
      return;
    }

    console.log('\n3. 📋 Testing Outline Creator (with timeout)...');

    // Test with shorter timeout first
    const testOutlineCreation = async (timeoutMs: number) => {
      return new Promise(async (resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timeout after ${timeoutMs}ms`));
        }, timeoutMs);

        try {
          const outlineAgent = BookGenerationAgents.outlineCreator();
          const outlinePrompt = `Create detailed outline for Chapter 1:
Title: Introduction to Python Automation
Word Count: 2500
Overview: Basic Python concepts for automation beginners
Objectives:
- Learn Python basics
- Understand automation potential
- Set up development environment`;

          const result = await outlineAgent.execute(outlinePrompt);
          clearTimeout(timer);
          resolve(result);
        } catch (error) {
          clearTimeout(timer);
          reject(error);
        }
      });
    };

    // Try with 30-second timeout first
    try {
      console.log('   Testing with 30s timeout...');
      const outlineResult = await testOutlineCreation(30000);
      console.log(`   ✅ Outline creation successful (30s)!`);
      console.log(`   📝 Response length: ${(outlineResult as any).content?.length || 0} chars`);
    } catch (outlineError) {
      console.log(`   ❌ Outline creation failed (30s timeout):`);
      console.log(`      Error: ${outlineError instanceof Error ? outlineError.message : outlineError}`);

      // Try with longer timeout
      try {
        console.log('   Testing with 90s timeout...');
        const outlineResult = await testOutlineCreation(90000);
        console.log(`   ✅ Outline creation successful (90s)!`);
        console.log(`   📝 Response length: ${(outlineResult as any).content?.length || 0} chars`);
      } catch (longError) {
        console.log(`   ❌ Outline creation failed (90s timeout):`);
        console.log(`      Error: ${longError instanceof Error ? longError.message : longError}`);
      }
    }

    console.log('\n🎉 Debug test completed!');
    console.log('\n📊 Summary:');
    console.log('- Title generation: Working');
    console.log('- Structure planning: Working');
    console.log('- Outline creation: Check results above');

  } catch (error) {
    console.error('❌ Debug test failed:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

// Run the debug test
if (require.main === module) {
  debugOutlineGeneration().catch(console.error);
}