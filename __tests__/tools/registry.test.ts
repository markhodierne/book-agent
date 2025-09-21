import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toolRegistry, registerTool, ToolUtils } from '@/lib/tools/registry';
import { createTool } from '@/lib/tools/createTool';
import type { Tool } from '@/lib/tools/createTool';

// Mock the monitoring module
vi.mock('@/lib/monitoring/metrics', () => ({
  applicationMetrics: {
    registeredToolsCount: {
      set: vi.fn(),
    },
    toolAccessCount: {
      inc: vi.fn(),
    },
  },
}));

vi.mock('@/lib/errors/exports', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ToolRegistry', () => {
  let testTool1: Tool;
  let testTool2: Tool;

  beforeEach(() => {
    toolRegistry.clear();
    vi.clearAllMocks();

    testTool1 = createTool({
      name: 'test_tool_1',
      description: 'First test tool',
      execute: vi.fn().mockResolvedValue('result1'),
    });

    testTool2 = createTool({
      name: 'test_tool_2',
      description: 'Second test tool for testing',
      execute: vi.fn().mockResolvedValue('result2'),
    });
  });

  afterEach(() => {
    toolRegistry.clear();
    vi.resetAllMocks();
  });

  it('starts empty', () => {
    expect(toolRegistry.size()).toBe(0);
    expect(toolRegistry.list()).toEqual([]);
  });

  it('registers tools correctly', () => {
    toolRegistry.register(testTool1);

    expect(toolRegistry.size()).toBe(1);
    expect(toolRegistry.has('test_tool_1')).toBe(true);
    expect(toolRegistry.list()).toEqual(['test_tool_1']);
  });

  it('registers multiple tools', () => {
    toolRegistry.register(testTool1);
    toolRegistry.register(testTool2);

    expect(toolRegistry.size()).toBe(2);
    expect(toolRegistry.has('test_tool_1')).toBe(true);
    expect(toolRegistry.has('test_tool_2')).toBe(true);
    expect(toolRegistry.list().sort()).toEqual(['test_tool_1', 'test_tool_2']);
  });

  it('retrieves tools by name', () => {
    toolRegistry.register(testTool1);

    const retrievedTool = toolRegistry.get('test_tool_1');
    expect(retrievedTool).toBeDefined();
    expect(retrievedTool?.name).toBe('test_tool_1');
  });

  it('returns undefined for non-existent tools', () => {
    const retrievedTool = toolRegistry.get('non_existent');
    expect(retrievedTool).toBeUndefined();
  });

  it('unregisters tools correctly', () => {
    toolRegistry.register(testTool1);
    toolRegistry.register(testTool2);

    const removed = toolRegistry.unregister('test_tool_1');
    expect(removed).toBe(true);
    expect(toolRegistry.size()).toBe(1);
    expect(toolRegistry.has('test_tool_1')).toBe(false);
    expect(toolRegistry.has('test_tool_2')).toBe(true);
  });

  it('returns false when unregistering non-existent tool', () => {
    const removed = toolRegistry.unregister('non_existent');
    expect(removed).toBe(false);
  });

  it('clears all tools', () => {
    toolRegistry.register(testTool1);
    toolRegistry.register(testTool2);

    toolRegistry.clear();
    expect(toolRegistry.size()).toBe(0);
    expect(toolRegistry.list()).toEqual([]);
  });

  it('provides detailed tool information', () => {
    toolRegistry.register(testTool1);

    const detailed = toolRegistry.listDetailed();
    expect(detailed).toHaveLength(1);
    expect(detailed[0]).toMatchObject({
      name: 'test_tool_1',
      description: 'First test tool',
      usageCount: 0,
    });
    expect(detailed[0].registeredAt).toBeDefined();
  });

  it('tracks usage statistics', () => {
    toolRegistry.register(testTool1);

    // Get tool multiple times to simulate usage
    toolRegistry.get('test_tool_1');
    toolRegistry.get('test_tool_1');

    const detailed = toolRegistry.listDetailed();
    expect(detailed[0].usageCount).toBe(2);
    expect(detailed[0].lastUsed).toBeDefined();
  });

  it('handles tool overwriting with warning', () => {
    toolRegistry.register(testTool1);

    // Register another tool with the same name
    const duplicateTool = createTool({
      name: 'test_tool_1',
      description: 'Duplicate tool',
      execute: vi.fn(),
    });

    toolRegistry.register(duplicateTool);

    expect(toolRegistry.size()).toBe(1);
    const retrievedTool = toolRegistry.get('test_tool_1');
    expect(retrievedTool?.description).toBe('Duplicate tool');
  });
});

describe('registerTool decorator', () => {
  beforeEach(() => {
    toolRegistry.clear();
  });

  afterEach(() => {
    toolRegistry.clear();
  });

  it('automatically registers tool and returns it', () => {
    const tool = createTool({
      name: 'auto_registered',
      description: 'Auto registered tool',
      execute: vi.fn(),
    });

    const decoratedTool = registerTool(tool);

    expect(decoratedTool).toBe(tool);
    expect(toolRegistry.has('auto_registered')).toBe(true);
  });
});

describe('ToolUtils', () => {
  beforeEach(() => {
    toolRegistry.clear();

    const tools = [
      createTool({
        name: 'search_tool',
        description: 'Tool for searching content',
        execute: vi.fn(),
      }),
      createTool({
        name: 'pdf_extract',
        description: 'Extract text from PDF files',
        execute: vi.fn(),
      }),
      createTool({
        name: 'web_research',
        description: 'Research topics on the web',
        execute: vi.fn(),
      }),
    ];

    tools.forEach(tool => toolRegistry.register(tool));

    // Simulate usage to test sorting
    toolRegistry.get('pdf_extract');
    toolRegistry.get('pdf_extract');
    toolRegistry.get('web_research');
  });

  afterEach(() => {
    toolRegistry.clear();
  });

  it('finds tools by keyword', () => {
    const searchResults = ToolUtils.findByKeyword('pdf');
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].name).toBe('pdf_extract');

    const contentResults = ToolUtils.findByKeyword('content');
    expect(contentResults).toHaveLength(1);
    expect(contentResults[0].name).toBe('search_tool');
  });

  it('returns most used tools in correct order', () => {
    const mostUsed = ToolUtils.getMostUsed();
    expect(mostUsed[0].name).toBe('pdf_extract'); // Used 2 times
    expect(mostUsed[0].usageCount).toBe(2);
    expect(mostUsed[1].name).toBe('web_research'); // Used 1 time
    expect(mostUsed[1].usageCount).toBe(1);
  });

  it('limits the number of most used tools returned', () => {
    const limitedResults = ToolUtils.getMostUsed(1);
    expect(limitedResults).toHaveLength(1);
    expect(limitedResults[0].name).toBe('pdf_extract');
  });

  it('returns recently used tools', () => {
    const recentlyUsed = ToolUtils.getRecentlyUsed();
    expect(recentlyUsed.length).toBeGreaterThan(0);
    expect(recentlyUsed.every(tool => tool.lastUsed)).toBe(true);
  });

  it('exports registry configuration', () => {
    const config = ToolUtils.exportConfig();
    expect(config.totalTools).toBe(3);
    expect(config.tools).toHaveLength(3);
    expect(config.statistics).toBeDefined();
  });

  it('validates registry state', () => {
    const validation = ToolUtils.validateRegistry();
    expect(validation.valid).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  it('detects tools without descriptions', () => {
    // Register a tool with empty description
    toolRegistry.register(createTool({
      name: 'empty_desc',
      description: '',
      execute: vi.fn(),
    }));

    const validation = ToolUtils.validateRegistry();
    expect(validation.valid).toBe(false);
    expect(validation.issues).toContain('Tools without descriptions: empty_desc');
  });
});