#!/usr/bin/env tsx

/**
 * Interactive PDF extraction REPL
 *
 * Usage:
 *   npx tsx scripts/pdf-repl.ts
 */

import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { pdfExtractTool } from '@/lib/tools/pdfExtractTool';
import type { PdfExtractParams } from '@/types';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

let currentPdfBuffer: Buffer | null = null;
let lastExtractedText: string | null = null;

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function loadPdf(filePath: string) {
  try {
    currentPdfBuffer = readFileSync(filePath);
    console.log(`✅ Loaded PDF: ${filePath}`);
    console.log(`📊 Size: ${(currentPdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    return true;
  } catch (error) {
    console.log(`❌ Error loading PDF: ${error}`);
    return false;
  }
}

async function extractText(options: any = {}) {
  if (!currentPdfBuffer) {
    console.log('❌ No PDF loaded. Use "load" command first.');
    return;
  }

  console.log('🚀 Extracting text...');
  const params: PdfExtractParams = {
    fileBuffer: currentPdfBuffer,
    options
  };

  const result = await pdfExtractTool.invoke(params);

  if (result.success) {
    lastExtractedText = result.data || '';
    console.log(`✅ Extraction successful! (${result.executionTime}ms)`);
    console.log(`📊 Length: ${lastExtractedText.length} characters`);
    console.log(`📊 Words: ${lastExtractedText.split(/\s+/).length} words`);
  } else {
    console.log(`❌ Extraction failed: ${result.error}`);
  }
}

async function showPreview(length = 500) {
  if (!lastExtractedText) {
    console.log('❌ No extracted text available. Extract first.');
    return;
  }

  console.log(`📝 First ${length} characters:`);
  console.log('-'.repeat(60));
  console.log(lastExtractedText.substring(0, length));
  console.log('-'.repeat(60));
}

async function findText(searchTerm: string) {
  if (!lastExtractedText) {
    console.log('❌ No extracted text available. Extract first.');
    return;
  }

  const matches = lastExtractedText.match(new RegExp(searchTerm, 'gi'));
  if (matches) {
    console.log(`🔍 Found ${matches.length} matches for "${searchTerm}"`);

    // Show context for first few matches
    const regex = new RegExp(searchTerm, 'gi');
    let match;
    let count = 0;

    while ((match = regex.exec(lastExtractedText)) && count < 3) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(lastExtractedText.length, match.index + searchTerm.length + 50);
      const context = lastExtractedText.substring(start, end);

      console.log(`\nMatch ${count + 1}:`);
      console.log(`...${context}...`);
      count++;
    }
  } else {
    console.log(`🔍 No matches found for "${searchTerm}"`);
  }
}

async function main() {
  console.log('🔧 PDF Extraction Interactive Tool');
  console.log('Commands:');
  console.log('  load <path>           - Load a PDF file');
  console.log('  extract               - Extract text (default options)');
  console.log('  extract-lines         - Extract with line breaks preserved');
  console.log('  extract-pages <n>     - Extract first N pages only');
  console.log('  preview [length]      - Show extracted text preview');
  console.log('  search <term>         - Search in extracted text');
  console.log('  save <path>           - Save extracted text to file');
  console.log('  help                  - Show this help');
  console.log('  exit                  - Exit');
  console.log('');

  while (true) {
    const input = await prompt('pdf-extract> ');
    const [command, ...args] = input.trim().split(' ');

    switch (command.toLowerCase()) {
      case 'load':
        if (args.length === 0) {
          console.log('❌ Please provide a file path');
        } else {
          await loadPdf(args.join(' '));
        }
        break;

      case 'extract':
        await extractText();
        break;

      case 'extract-lines':
        await extractText({ preserveLineBreaks: true });
        break;

      case 'extract-pages':
        const pageCount = parseInt(args[0]);
        if (isNaN(pageCount)) {
          console.log('❌ Please provide a valid page number');
        } else {
          await extractText({ maxPages: pageCount });
        }
        break;

      case 'preview':
        const length = args[0] ? parseInt(args[0]) : 500;
        await showPreview(length);
        break;

      case 'search':
        if (args.length === 0) {
          console.log('❌ Please provide a search term');
        } else {
          await findText(args.join(' '));
        }
        break;

      case 'save':
        if (args.length === 0) {
          console.log('❌ Please provide a file path');
        } else if (!lastExtractedText) {
          console.log('❌ No extracted text to save');
        } else {
          try {
            require('fs').writeFileSync(args.join(' '), lastExtractedText);
            console.log(`✅ Text saved to ${args.join(' ')}`);
          } catch (error) {
            console.log(`❌ Error saving file: ${error}`);
          }
        }
        break;

      case 'help':
        console.log('Commands:');
        console.log('  load <path>           - Load a PDF file');
        console.log('  extract               - Extract text (default options)');
        console.log('  extract-lines         - Extract with line breaks preserved');
        console.log('  extract-pages <n>     - Extract first N pages only');
        console.log('  preview [length]      - Show extracted text preview');
        console.log('  search <term>         - Search in extracted text');
        console.log('  save <path>           - Save extracted text to file');
        console.log('  exit                  - Exit');
        break;

      case 'exit':
        console.log('👋 Goodbye!');
        rl.close();
        return;

      case '':
        break;

      default:
        console.log(`❌ Unknown command: ${command}. Type "help" for available commands.`);
    }
  }
}

main();