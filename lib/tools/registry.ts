import { logger } from '@/lib/errors/exports';
import { applicationMetrics } from '@/lib/monitoring/metrics';
import type { Tool } from './createTool';

/**
 * Tool registry interface for managing available tools
 */
export interface ToolRegistry {
  register<P, R>(tool: Tool<P, R>): void;
  unregister(toolName: string): boolean;
  get<P = unknown, R = unknown>(toolName: string): Tool<P, R> | undefined;
  has(toolName: string): boolean;
  list(): string[];
  listDetailed(): ToolRegistryEntry[];
  clear(): void;
  size(): number;
}

/**
 * Registry entry with metadata
 */
export interface ToolRegistryEntry {
  name: string;
  description: string;
  registeredAt: string;
  lastUsed?: string;
  usageCount: number;
}

/**
 * Tool usage statistics
 */
interface ToolStats {
  usageCount: number;
  lastUsed?: string;
  totalExecutionTime: number;
  successCount: number;
  errorCount: number;
}

/**
 * Implementation of the tool registry with statistics tracking
 */
class ToolRegistryImpl implements ToolRegistry {
  private tools = new Map<string, Tool>();
  private stats = new Map<string, ToolStats>();

  /**
   * Register a tool in the registry
   */
  register<P, R>(tool: Tool<P, R>): void {
    if (this.tools.has(tool.name)) {
      logger.warn('Tool registration: overwriting existing tool', {
        toolName: tool.name,
        description: tool.description,
      });
    }

    this.tools.set(tool.name, tool as Tool<unknown, unknown>);

    // Initialize stats if not present
    if (!this.stats.has(tool.name)) {
      this.stats.set(tool.name, {
        usageCount: 0,
        totalExecutionTime: 0,
        successCount: 0,
        errorCount: 0,
      });
    }

    // Update metrics
    applicationMetrics.registeredToolsCount.set(this.tools.size);

    logger.info('Tool registered', {
      toolName: tool.name,
      description: tool.description,
      totalRegistered: this.tools.size,
    });
  }

  /**
   * Unregister a tool from the registry
   */
  unregister(toolName: string): boolean {
    const existed = this.tools.delete(toolName);

    if (existed) {
      this.stats.delete(toolName);
      applicationMetrics.registeredToolsCount.set(this.tools.size);

      logger.info('Tool unregistered', {
        toolName,
        totalRegistered: this.tools.size,
      });
    }

    return existed;
  }

  /**
   * Get a tool by name with type safety
   */
  get<P = unknown, R = unknown>(toolName: string): Tool<P, R> | undefined {
    const tool = this.tools.get(toolName);

    if (tool) {
      // Update usage statistics
      const stats = this.stats.get(toolName);
      if (stats) {
        stats.usageCount++;
        stats.lastUsed = new Date().toISOString();
      }

      // Track tool access in metrics
      applicationMetrics.toolAccessCount.inc();
    }

    return tool as Tool<P, R> | undefined;
  }

  /**
   * Check if a tool is registered
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * List all registered tool names
   */
  list(): string[] {
    return Array.from(this.tools.keys()).sort();
  }

  /**
   * List all tools with detailed information
   */
  listDetailed(): ToolRegistryEntry[] {
    return Array.from(this.tools.entries())
      .map(([name, tool]) => {
        const stats = this.stats.get(name);
        return {
          name,
          description: tool.description,
          registeredAt: stats?.lastUsed || new Date().toISOString(),
          lastUsed: stats?.lastUsed,
          usageCount: stats?.usageCount || 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    const count = this.tools.size;
    this.tools.clear();
    this.stats.clear();

    applicationMetrics.registeredToolsCount.set(0);

    logger.info('Tool registry cleared', { toolsRemoved: count });
  }

  /**
   * Get the number of registered tools
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * Get usage statistics for a tool
   */
  getStats(toolName: string): ToolStats | undefined {
    return this.stats.get(toolName);
  }

  /**
   * Update execution statistics for a tool
   */
  updateStats(toolName: string, success: boolean, executionTime: number): void {
    const stats = this.stats.get(toolName);
    if (stats) {
      stats.totalExecutionTime += executionTime;
      if (success) {
        stats.successCount++;
      } else {
        stats.errorCount++;
      }
    }
  }

  /**
   * Get performance statistics for all tools
   */
  getAllStats(): Map<string, ToolStats> {
    return new Map(this.stats);
  }
}

/**
 * Global tool registry instance
 */
export const toolRegistry: ToolRegistry = new ToolRegistryImpl();

/**
 * Decorator for automatically registering tools on creation
 */
export function registerTool<P, R>(tool: Tool<P, R>): Tool<P, R> {
  toolRegistry.register(tool);
  return tool;
}

/**
 * Utility functions for tool management
 */
export const ToolUtils = {
  /**
   * Find tools by description keyword
   */
  findByKeyword(keyword: string): ToolRegistryEntry[] {
    return toolRegistry.listDetailed().filter(entry =>
      entry.description.toLowerCase().includes(keyword.toLowerCase()) ||
      entry.name.toLowerCase().includes(keyword.toLowerCase())
    );
  },

  /**
   * Get tools sorted by usage count
   */
  getMostUsed(limit = 10): ToolRegistryEntry[] {
    return toolRegistry.listDetailed()
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  },

  /**
   * Get recently used tools
   */
  getRecentlyUsed(limit = 10): ToolRegistryEntry[] {
    return toolRegistry.listDetailed()
      .filter(entry => entry.lastUsed)
      .sort((a, b) => {
        const aTime = new Date(a.lastUsed || 0).getTime();
        const bTime = new Date(b.lastUsed || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, limit);
  },

  /**
   * Export registry configuration for debugging
   */
  exportConfig(): Record<string, unknown> {
    const stats = (toolRegistry as ToolRegistryImpl).getAllStats();
    return {
      totalTools: toolRegistry.size(),
      tools: toolRegistry.listDetailed(),
      statistics: Object.fromEntries(stats),
    };
  },

  /**
   * Validate tool registry state
   */
  validateRegistry(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const tools = toolRegistry.list();

    // Check for duplicate names
    const duplicates = tools.filter((name, index) => tools.indexOf(name) !== index);
    if (duplicates.length > 0) {
      issues.push(`Duplicate tool names: ${duplicates.join(', ')}`);
    }

    // Check for tools without descriptions
    const detailed = toolRegistry.listDetailed();
    const missingDescriptions = detailed.filter(entry => !entry.description.trim());
    if (missingDescriptions.length > 0) {
      issues.push(`Tools without descriptions: ${missingDescriptions.map(e => e.name).join(', ')}`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  },
};

/**
 * Registry events for monitoring and debugging
 */
export interface RegistryEvent {
  type: 'register' | 'unregister' | 'access' | 'error';
  toolName: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Event listener type for registry monitoring
 */
export type RegistryEventListener = (event: RegistryEvent) => void;

// Registry event system for monitoring (optional enhancement)
class RegistryEventEmitter {
  private listeners: RegistryEventListener[] = [];

  addListener(listener: RegistryEventListener): void {
    this.listeners.push(listener);
  }

  removeListener(listener: RegistryEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  emit(event: RegistryEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Registry event listener error for ${event.toolName} (${event.type}): ${message}`);
      }
    });
  }
}

export const registryEvents = new RegistryEventEmitter();