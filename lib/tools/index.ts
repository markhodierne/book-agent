// Tool creation and management exports

// Core tool framework
export {
  createTool,
  ToolFactory,
  type Tool,
  type CreateToolOptions,
  DEFAULT_TOOL_RETRY_CONFIG,
} from './createTool';

// Tool registry
export {
  toolRegistry,
  registerTool,
  ToolUtils,
  registryEvents,
  type ToolRegistry,
  type ToolRegistryEntry,
  type RegistryEvent,
  type RegistryEventListener,
} from './registry';

// Error handling utilities
export {
  executeToolSafely,
  ToolValidator,
  ToolTimeout,
  ToolCircuitBreaker,
} from './errorHandling';

// Specific tool implementations
export {
  pdfExtractTool,
  extractPdfText,
  validatePdfBuffer,
  sanitizeExtractedText,
} from './pdfExtractTool';

export {
  chapterWriteTool,
  generateChapterContent,
  validateChapter,
  createStylePrompt,
  type ChapterWriteParams,
} from './chapterWriteTool';

// Tool initialization
export {
  initializeTools,
  validateToolRegistry,
} from './initialize';