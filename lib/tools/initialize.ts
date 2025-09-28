import { toolRegistry } from './registry';
// Temporarily disabled due to pdf-parse test file issue
// import { pdfExtractTool } from './pdfExtractTool';
import { chapterWriteTool } from './chapterWriteTool';
import { logger } from '@/lib/errors/exports';

/**
 * Initialize and register all available tools
 *
 * This function should be called during application startup to ensure
 * all tools are available in the registry for LangGraph nodes to use.
 *
 * Following the tool-centric design principle from ARCHITECTURE.md,
 * this centralized initialization ensures all discrete tools are
 * available for orchestration by LangGraph nodes.
 */
export function initializeTools(): void {
  logger.info('Initializing tool registry...');

  // Register PDF extraction tool
  // Temporarily disabled due to pdf-parse test file issue
  // toolRegistry.register(pdfExtractTool);

  // Register chapter writing tool
  toolRegistry.register(chapterWriteTool);

  // TODO: Register additional tools as they're implemented
  // - webResearchTool (Task 25)
  // - supabaseStateTool (Task 26)
  // - styleGeneratorTool (Task 27)
  // - coverDesignTool (Task 28)

  const registeredTools = toolRegistry.list();
  logger.info('Tool registry initialization complete', {
    toolCount: registeredTools.length,
    tools: registeredTools
  });
}

/**
 * Validate that all required tools are registered
 *
 * Can be used during startup or testing to ensure expected tools are available
 */
export function validateToolRegistry(requiredTools: string[]): void {
  const missing = requiredTools.filter(toolName => !toolRegistry.has(toolName));

  if (missing.length > 0) {
    throw new Error(`Missing required tools: ${missing.join(', ')}`);
  }

  logger.debug('Tool registry validation passed', {
    requiredTools,
    availableTools: toolRegistry.list()
  });
}