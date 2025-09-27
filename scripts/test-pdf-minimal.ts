#!/usr/bin/env npx tsx

/**
 * Minimal PDF Generation Test
 * Tests React-PDF with minimal content to isolate the issue
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function testMinimalPDF(): Promise<void> {
  console.log('📖 Minimal PDF Generation Test');
  console.log('==============================\n');

  const outputDir = './test-output/pdf-minimal';
  mkdirSync(outputDir, { recursive: true });

  try {
    console.log('1. 🎨 Creating minimal PDF document...');

    // Create the simplest possible PDF
    const styles = StyleSheet.create({
      page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
      },
      title: {
        fontSize: 24,
        marginBottom: 20,
        textAlign: 'center',
      },
      content: {
        fontSize: 12,
        lineHeight: 1.5,
        marginBottom: 10,
      },
    });

    const minimalDocument = React.createElement(Document, {
      title: 'Test Book',
      author: 'Inkwell'
    }, [
      React.createElement(Page, { size: 'A4', style: styles.page, key: 'page-1' }, [
        React.createElement(Text, { style: styles.title, key: 'title' }, 'Minimal Test Book'),
        React.createElement(Text, { style: styles.content, key: 'content-1' }, 'This is a minimal test to verify React-PDF functionality.'),
        React.createElement(Text, { style: styles.content, key: 'content-2' }, 'If you can see this, the PDF generation is working correctly.'),
        React.createElement(Text, { style: styles.content, key: 'content-3' }, 'The issue might be with complex content or calculations in the main formatting node.'),
      ])
    ]);

    console.log('2. 🔄 Rendering PDF...');
    let pdfBuffer: Buffer;
    try {
      // Try the newer API pattern
      const pdfBlob = await pdf(minimalDocument).toBlob();
      pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
      console.log('   PDF buffer type:', typeof pdfBuffer, 'length:', pdfBuffer?.length);
    } catch (blobError) {
      console.log('   Blob API failed, trying direct buffer...');
      try {
        // Try direct buffer approach
        const stream = await pdf(minimalDocument).toBuffer();
        if (Buffer.isBuffer(stream)) {
          pdfBuffer = stream;
        } else {
          throw new Error('toBuffer did not return a Buffer');
        }
      } catch (bufferError) {
        console.error('   Both methods failed:', bufferError.message);
        throw bufferError;
      }
    }

    console.log('3. 💾 Saving PDF...');
    const pdfPath = join(outputDir, 'minimal-test.pdf');
    writeFileSync(pdfPath, pdfBuffer);

    console.log(`✅ Minimal PDF generated successfully!`);
    console.log(`📄 Size: ${Math.round(pdfBuffer.length / 1024)}KB`);
    console.log(`📁 Saved: ${pdfPath}`);

    // Now test with slightly more complex content
    console.log('\\n4. 🧪 Testing with more content...');

    const complexDocument = React.createElement(Document, {
      title: 'Complex Test Book',
      author: 'Inkwell'
    }, [
      React.createElement(Page, { size: 'A4', style: styles.page, key: 'page-1' }, [
        React.createElement(Text, { style: styles.title, key: 'title' }, 'More Complex Test'),
        ...generateTestContent(styles.content, 50) // 50 paragraphs
      ])
    ]);

    const complexPdfBlob = await pdf(complexDocument).toBlob();
    const complexPdfBuffer = Buffer.from(await complexPdfBlob.arrayBuffer());
    const complexPdfPath = join(outputDir, 'complex-test.pdf');
    writeFileSync(complexPdfPath, complexPdfBuffer);

    console.log(`✅ Complex PDF generated successfully!`);
    console.log(`📄 Size: ${Math.round(complexPdfBuffer.length / 1024)}KB`);
    console.log(`📁 Saved: ${complexPdfPath}`);

    console.log('\\n🎉 Both tests passed! The React-PDF library is working correctly.');
    console.log('The issue in the main formatting node must be with specific content or calculations.');

  } catch (error) {
    console.error('\\n❌ Minimal PDF test failed:');
    console.error('Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }

    // This will help us identify if it's a React-PDF issue or our code
    if (error instanceof Error && error.message.includes('unsupported number')) {
      console.log('\\n🔍 This is the same "unsupported number" error.');
      console.log('The issue is likely in React-PDF itself or the Node.js environment.');
    }
  }
}

function generateTestContent(style: any, count: number): React.ReactElement[] {
  const content: React.ReactElement[] = [];

  for (let i = 0; i < count; i++) {
    content.push(
      React.createElement(Text, {
        style,
        key: `paragraph-${i}`
      }, `This is test paragraph ${i + 1}. It contains some sample text to test PDF generation with larger content. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`)
    );
  }

  return content;
}

// Run the test
if (require.main === module) {
  testMinimalPDF().catch(console.error);
}