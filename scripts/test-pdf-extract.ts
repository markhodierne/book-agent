#!/usr/bin/env tsx

/**
 * Test script for PDF extraction tool
 *
 * Usage:
 *   npx tsx scripts/test-pdf-extract.ts path/to/your/file.pdf
 */

import { readFileSync } from 'fs';
import { pdfExtractTool } from '@/lib/tools/pdfExtractTool';
import type { PdfExtractParams } from '@/types';

async function testPdfExtraction(filePath: string) {
  try {
    console.log(`🔍 Testing PDF extraction on: ${filePath}`);
    console.log('=' .repeat(60));

    // Read the PDF file
    console.log('📖 Reading PDF file...');
    const pdfBuffer = readFileSync(filePath);
    console.log(`📊 File size: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Test with default options (no line breaks preserved)
    console.log('\n🚀 Extracting text (default options)...');
    const params1: PdfExtractParams = {
      fileBuffer: pdfBuffer,
      options: {}
    };

    const result1 = await pdfExtractTool.invoke(params1);

    if (result1.success) {
      console.log('✅ Extraction successful!');
      console.log(`📊 Extracted text length: ${result1.data?.length || 0} characters`);
      console.log(`⏱️  Execution time: ${result1.executionTime}ms`);
      console.log(`🔄 Retry count: ${result1.retryCount}`);

      console.log('\n📝 First 500 characters of extracted text:');
      console.log('-'.repeat(60));
      console.log(result1.data?.substring(0, 500) || 'No content');
      console.log('-'.repeat(60));

      // Ask if user wants to see more content
      console.log('\n💾 Full extracted text saved to: extracted-text.txt');
      const fs = require('fs');
      fs.writeFileSync('extracted-text.txt', result1.data || '');

      console.log('\n📄 To see more content:');
      console.log('   • Full text: cat extracted-text.txt');
      console.log('   • First 2000 chars: head -c 2000 extracted-text.txt');
      console.log('   • Search: grep -i "astronomy" extracted-text.txt');

      // Show word count
      const wordCount = result1.data?.split(/\s+/).length || 0;
      console.log(`📊 Word count: ${wordCount} words`);
    } else {
      console.log('❌ Extraction failed:', result1.error);
      return;
    }

    // Test with line breaks preserved
    console.log('\n🚀 Extracting text (with line breaks preserved)...');
    const params2: PdfExtractParams = {
      fileBuffer: pdfBuffer,
      options: { preserveLineBreaks: true }
    };

    const result2 = await pdfExtractTool.invoke(params2);

    if (result2.success) {
      console.log('✅ Extraction with line breaks successful!');
      console.log('\n📝 First 500 characters with line breaks:');
      console.log('-'.repeat(60));
      console.log(result2.data?.substring(0, 500) || 'No content');
      console.log('-'.repeat(60));
    } else {
      console.log('❌ Extraction with line breaks failed:', result2.error);
    }

    // Test with page limit
    console.log('\n🚀 Extracting text (first 3 pages only)...');
    const params3: PdfExtractParams = {
      fileBuffer: pdfBuffer,
      options: { maxPages: 3 }
    };

    const result3 = await pdfExtractTool.invoke(params3);

    if (result3.success) {
      console.log('✅ Extraction with page limit successful!');
      console.log(`📊 Limited text length: ${result3.data?.length || 0} characters`);
      const wordCount = result3.data?.split(/\s+/).length || 0;
      console.log(`📊 Limited word count: ${wordCount} words`);
    } else {
      console.log('❌ Extraction with page limit failed:', result3.error);
    }

  } catch (error) {
    console.error('💥 Script error:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.log('❌ Please provide a PDF file path as an argument');
    console.log('Usage: npx tsx scripts/test-pdf-extract.ts path/to/your/file.pdf');
    process.exit(1);
  }

  try {
    await testPdfExtraction(filePath);
    console.log('\n🎉 PDF extraction test completed!');
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

main();