import pdfParse from 'pdf-parse';
import { ToolFactory } from './createTool';
import type { PdfExtractParams } from '@/types';

/**
 * PDF text extraction tool using pdf-parse library
 *
 * This tool implements the file processing pattern from our architecture,
 * providing secure PDF text extraction with proper validation and error handling.
 *
 * Features:
 * - Text extraction from PDF buffers
 * - File format and size validation
 * - Configurable extraction options
 * - Security checks for malicious content
 * - Proper error handling with retry logic
 */

/**
 * Maximum allowed PDF file size in bytes (50MB as specified in FUNCTIONAL.md)
 */
const MAX_PDF_SIZE = 50 * 1024 * 1024;

/**
 * Minimum PDF file size in bytes (to detect empty/corrupt files)
 */
const MIN_PDF_SIZE = 100;

/**
 * PDF file signature bytes (PDF files start with "%PDF-")
 */
const PDF_SIGNATURE = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]); // "%PDF-"

/**
 * Validates PDF file buffer for security and format compliance
 */
function validatePdfBuffer(fileBuffer: Buffer): void {
  // Check buffer exists and is not empty
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error('Invalid file buffer: must be a valid Buffer object');
  }

  // Check file size constraints
  if (fileBuffer.length < MIN_PDF_SIZE) {
    throw new Error(`PDF file too small: ${fileBuffer.length} bytes (minimum ${MIN_PDF_SIZE} bytes)`);
  }

  if (fileBuffer.length > MAX_PDF_SIZE) {
    throw new Error(`PDF file too large: ${fileBuffer.length} bytes (maximum ${MAX_PDF_SIZE} bytes)`);
  }

  // Verify PDF signature
  const signature = fileBuffer.subarray(0, PDF_SIGNATURE.length);
  if (!signature.equals(PDF_SIGNATURE)) {
    throw new Error('Invalid PDF format: file does not have valid PDF signature');
  }

  // Basic malware detection - look for suspicious patterns
  const fileContent = fileBuffer.toString('binary', 0, Math.min(fileBuffer.length, 1024));

  // Check for executable signatures embedded in PDF
  const suspiciousPatterns = [
    'MZ', // Windows executable
    '\x7fELF', // Linux executable
    '\xca\xfe\xba\xbe', // Mach-O binary
    '<script>', // JavaScript injection
    'javascript:', // JavaScript URLs
    'eval(', // Dynamic code evaluation
  ];

  for (const pattern of suspiciousPatterns) {
    if (fileContent.includes(pattern)) {
      throw new Error(`Security threat detected: suspicious pattern found in PDF`);
    }
  }
}

/**
 * Sanitizes extracted text content
 */
function sanitizeExtractedText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove null bytes and other control characters (except newlines, tabs, carriage returns)
  let sanitized = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\r\n/g, '\n'); // Convert CRLF to LF
  sanitized = sanitized.replace(/\r/g, '\n'); // Convert CR to LF

  // Remove excessive whitespace while preserving intentional spacing
  sanitized = sanitized.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 consecutive newlines
  sanitized = sanitized.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space

  // Trim leading/trailing whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Extracts text content from PDF files with security validation
 */
async function extractPdfText(params: PdfExtractParams): Promise<string> {
  const { fileBuffer, options = {} } = params;

  // Validate PDF buffer
  validatePdfBuffer(fileBuffer);

  try {
    // Configure pdf-parse options
    const parseOptions: Parameters<typeof pdfParse>[1] = {};

    // Apply max pages limitation if specified
    if (options.maxPages && options.maxPages > 0) {
      parseOptions.max = options.maxPages;
    }

    // Extract text using pdf-parse
    const pdfData = await pdfParse(fileBuffer, parseOptions);

    if (!pdfData || !pdfData.text) {
      throw new Error('Failed to extract text: PDF appears to be empty or contains no readable text');
    }

    // Sanitize the extracted text
    let extractedText = sanitizeExtractedText(pdfData.text);

    // Apply line break preservation option
    if (!options.preserveLineBreaks) {
      // For LLM input, we want compact text with minimal line breaks
      // Replace all line breaks with spaces for flowing text
      extractedText = extractedText.replace(/\n+/g, ' ');
      // Clean up excessive spaces
      extractedText = extractedText.replace(/\s+/g, ' ');
      // Trim whitespace
      extractedText = extractedText.trim();
    }

    // Final validation
    if (extractedText.length === 0) {
      throw new Error('No readable text content found in PDF');
    }

    return extractedText;

  } catch (error) {
    // Re-throw PDF parsing errors with more context
    if (error instanceof Error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
    throw new Error(`PDF extraction failed: ${String(error)}`);
  }
}

/**
 * PDF extraction tool instance
 *
 * Uses ToolFactory.createFileProcessingTool for extended timeout and
 * appropriate retry configuration for file operations.
 */
export const pdfExtractTool = ToolFactory.createFileProcessingTool(
  'pdf_extract',
  'Extract text content from PDF files with security validation and formatting options',
  extractPdfText
);

// Export for testing and direct usage
export { extractPdfText, validatePdfBuffer, sanitizeExtractedText };