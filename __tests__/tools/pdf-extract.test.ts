import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  pdfExtractTool,
  extractPdfText,
  validatePdfBuffer,
  sanitizeExtractedText
} from '@/lib/tools/pdfExtractTool';
import type { PdfExtractParams } from '@/types';
import { setupTestEnvironment } from '../utils';

// Mock pdf-parse module
vi.mock('pdf-parse', () => {
  return {
    default: vi.fn(),
  };
});

describe('PDF Extract Tool', () => {
  beforeEach(() => {
    setupTestEnvironment();
    vi.clearAllMocks();
  });

  describe('validatePdfBuffer', () => {
    it('should accept valid PDF buffer', () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\nSome content here\n%%EOF'.padEnd(200, ' '));
      expect(() => validatePdfBuffer(validPdfBuffer)).not.toThrow();
    });

    it('should reject null or undefined buffer', () => {
      expect(() => validatePdfBuffer(null as any)).toThrow('Invalid file buffer');
      expect(() => validatePdfBuffer(undefined as any)).toThrow('Invalid file buffer');
    });

    it('should reject non-Buffer objects', () => {
      expect(() => validatePdfBuffer('not a buffer' as any)).toThrow('Invalid file buffer');
      expect(() => validatePdfBuffer({} as any)).toThrow('Invalid file buffer');
    });

    it('should reject files that are too small', () => {
      const tinyBuffer = Buffer.from('too small');
      expect(() => validatePdfBuffer(tinyBuffer)).toThrow('PDF file too small');
    });

    it('should reject files that are too large', () => {
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
      largeBuffer.write('%PDF-1.4', 0);
      expect(() => validatePdfBuffer(largeBuffer)).toThrow('PDF file too large');
    });

    it('should reject files without PDF signature', () => {
      const invalidBuffer = Buffer.from('Not a PDF file content here'.padEnd(200, ' '));
      expect(() => validatePdfBuffer(invalidBuffer)).toThrow('Invalid PDF format');
    });

    it('should detect suspicious content patterns', () => {
      const maliciousBuffer = Buffer.from('%PDF-1.4\nMZ'.padEnd(200, ' ')); // Windows executable
      expect(() => validatePdfBuffer(maliciousBuffer)).toThrow('Security threat detected');

      const jsBuffer = Buffer.from('%PDF-1.4\n<script>alert(1)</script>'.padEnd(200, ' '));
      expect(() => validatePdfBuffer(jsBuffer)).toThrow('Security threat detected');
    });
  });

  describe('sanitizeExtractedText', () => {
    it('should return empty string for invalid input', () => {
      expect(sanitizeExtractedText('')).toBe('');
      expect(sanitizeExtractedText(null as any)).toBe('');
      expect(sanitizeExtractedText(undefined as any)).toBe('');
    });

    it('should remove control characters', () => {
      const textWithControlChars = 'Hello\x00World\x1FTest';
      expect(sanitizeExtractedText(textWithControlChars)).toBe('HelloWorldTest');
    });

    it('should normalize line endings', () => {
      const textWithMixedLineEndings = 'Line1\r\nLine2\rLine3\nLine4';
      const result = sanitizeExtractedText(textWithMixedLineEndings);
      expect(result).toBe('Line1\nLine2\nLine3\nLine4');
    });

    it('should limit consecutive newlines', () => {
      const textWithExcessiveNewlines = 'Para1\n\n\n\n\nPara2';
      const result = sanitizeExtractedText(textWithExcessiveNewlines);
      expect(result).toBe('Para1\n\nPara2');
    });

    it('should normalize whitespace', () => {
      const textWithExcessiveSpaces = 'Word1     Word2\t\t\tWord3';
      const result = sanitizeExtractedText(textWithExcessiveSpaces);
      expect(result).toBe('Word1 Word2 Word3');
    });

    it('should trim leading and trailing whitespace', () => {
      const textWithWhitespace = '   \n  Content here  \n  ';
      const result = sanitizeExtractedText(textWithWhitespace);
      expect(result).toBe('Content here');
    });
  });

  describe('extractPdfText', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\nValid PDF content\n%%EOF'.padEnd(200, ' '));
    let mockPdfParse: any;

    beforeEach(async () => {
      const pdfParseModule = await import('pdf-parse');
      mockPdfParse = pdfParseModule.default as any;
      mockPdfParse.mockClear();
    });

    it('should extract text from valid PDF', async () => {
      const mockPdfData = {
        text: 'Extracted PDF text content',
        numpages: 1,
      };
      mockPdfParse.mockResolvedValue(mockPdfData);

      const params: PdfExtractParams = {
        fileBuffer: validPdfBuffer,
        options: {},
      };

      const result = await extractPdfText(params);

      expect(result).toBe('Extracted PDF text content');
      expect(mockPdfParse).toHaveBeenCalledWith(validPdfBuffer, {});
    });

    it('should apply maxPages option', async () => {
      const mockPdfData = {
        text: 'Page 1 content\nPage 2 content',
        numpages: 2,
      };
      mockPdfParse.mockResolvedValue(mockPdfData);

      const params: PdfExtractParams = {
        fileBuffer: validPdfBuffer,
        options: { maxPages: 1 },
      };

      await extractPdfText(params);

      expect(mockPdfParse).toHaveBeenCalledWith(validPdfBuffer, { max: 1 });
    });

    it('should handle preserveLineBreaks option', async () => {
      const mockPdfData = {
        text: 'Line 1\nLine 2\n\nParagraph 2',
        numpages: 1,
      };
      mockPdfParse.mockResolvedValue(mockPdfData);

      // Test with preserveLineBreaks: false (default)
      const params1: PdfExtractParams = {
        fileBuffer: validPdfBuffer,
        options: { preserveLineBreaks: false },
      };

      const result1 = await extractPdfText(params1);
      expect(result1).toBe('Line 1 Line 2\n\nParagraph 2');

      // Test with preserveLineBreaks: true
      const params2: PdfExtractParams = {
        fileBuffer: validPdfBuffer,
        options: { preserveLineBreaks: true },
      };

      const result2 = await extractPdfText(params2);
      expect(result2).toBe('Line 1\nLine 2\n\nParagraph 2');
    });

    it('should throw error for empty PDF text', async () => {
      const mockPdfData = {
        text: '',
        numpages: 1,
      };
      mockPdfParse.mockResolvedValue(mockPdfData);

      const params: PdfExtractParams = {
        fileBuffer: validPdfBuffer,
        options: {},
      };

      await expect(extractPdfText(params)).rejects.toThrow('Failed to extract text');
    });

    it('should throw error for PDF parsing failures', async () => {
      mockPdfParse.mockRejectedValue(new Error('Corrupted PDF'));

      const params: PdfExtractParams = {
        fileBuffer: validPdfBuffer,
        options: {},
      };

      await expect(extractPdfText(params)).rejects.toThrow('PDF extraction failed: Corrupted PDF');
    });

    it('should validate buffer before processing', async () => {
      const invalidBuffer = Buffer.from('Not a PDF'.padEnd(200, ' '));

      const params: PdfExtractParams = {
        fileBuffer: invalidBuffer,
        options: {},
      };

      await expect(extractPdfText(params)).rejects.toThrow('Invalid PDF format');
      expect(mockPdfParse).not.toHaveBeenCalled();
    });

    it('should sanitize extracted text', async () => {
      const mockPdfData = {
        text: 'Text with\x00control chars\r\nand mixed line endings',
        numpages: 1,
      };
      mockPdfParse.mockResolvedValue(mockPdfData);

      const params: PdfExtractParams = {
        fileBuffer: validPdfBuffer,
        options: {},
      };

      const result = await extractPdfText(params);
      expect(result).toBe('Text withcontrol chars and mixed line endings');
    });
  });

  describe('pdfExtractTool integration', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\nValid PDF content\n%%EOF'.padEnd(200, ' '));
    let mockPdfParse: any;

    beforeEach(async () => {
      const pdfParseModule = await import('pdf-parse');
      mockPdfParse = pdfParseModule.default as any;
      mockPdfParse.mockClear();
    });

    it('should have correct tool metadata', () => {
      expect(pdfExtractTool.name).toBe('pdf_extract');
      expect(pdfExtractTool.description).toContain('Extract text content from PDF files');
    });

    it('should return ToolResult on successful extraction', async () => {
      const mockPdfData = {
        text: 'Successfully extracted text',
        numpages: 1,
      };
      mockPdfParse.mockResolvedValue(mockPdfData);

      const params: PdfExtractParams = {
        fileBuffer: validPdfBuffer,
        options: {},
      };

      const result = await pdfExtractTool.invoke(params);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Successfully extracted text');
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.retryCount).toBeGreaterThanOrEqual(0);
    });

    it('should return error ToolResult on failure', async () => {
      mockPdfParse.mockRejectedValue(new Error('PDF parsing failed'));

      const params: PdfExtractParams = {
        fileBuffer: validPdfBuffer,
        options: {},
      };

      const result = await pdfExtractTool.invoke(params);

      expect(result.success).toBe(false);
      expect(typeof result.error).toBe('string');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should use invokeRaw for direct result access', async () => {
      const mockPdfData = {
        text: 'Raw extraction result',
        numpages: 1,
      };
      mockPdfParse.mockResolvedValue(mockPdfData);

      const params: PdfExtractParams = {
        fileBuffer: validPdfBuffer,
        options: {},
      };

      const result = await pdfExtractTool.invokeRaw(params);
      expect(result).toBe('Raw extraction result');
    });

    it('should handle different PDF content types', async () => {
      const testCases = [
        {
          name: 'simple text',
          pdfData: { text: 'Simple text content', numpages: 1 },
          expected: 'Simple text content'
        },
        {
          name: 'multi-paragraph text',
          pdfData: { text: 'Para 1\n\nPara 2\n\nPara 3', numpages: 1 },
          expected: 'Para 1\n\nPara 2\n\nPara 3'
        },
        {
          name: 'text with formatting',
          pdfData: { text: 'Bold text\nItalic text\nNormal text', numpages: 1 },
          expected: 'Bold text Italic text Normal text'
        }
      ];

      for (const testCase of testCases) {
        mockPdfParse.mockResolvedValue(testCase.pdfData);

        const params: PdfExtractParams = {
          fileBuffer: validPdfBuffer,
          options: testCase.name === 'multi-paragraph text' ? { preserveLineBreaks: true } : {},
        };

        const result = await pdfExtractTool.invokeRaw(params);
        expect(result).toBe(testCase.expected);
      }
    });

    it('should respect file processing tool timeout configuration', () => {
      // The tool should be created with ToolFactory.createFileProcessingTool
      // which has a 120-second timeout
      expect(pdfExtractTool.config.timeout).toBe(120000);
    });
  });
});