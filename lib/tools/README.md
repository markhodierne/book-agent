# Tool Framework Documentation

The Book Agent tool framework provides a consistent, type-safe way to create AI tools that can be orchestrated by LangGraph workflows. This framework follows the tool-centric design principle from our architecture specification.

## Overview

The tool framework consists of three main components:

1. **Tool Creation** (`createTool.ts`) - Core framework for creating typed, retryable tools
2. **Tool Registry** (`registry.ts`) - Management system for organizing and accessing tools
3. **Error Handling** (`errorHandling.ts`) - Advanced error handling utilities and patterns

## Quick Start

### Creating a Basic Tool

```typescript
import { createTool } from '@/lib/tools';

const myTool = createTool({
  name: 'my_tool',
  description: 'Description of what this tool does',
  execute: async (params: { input: string }) => {
    // Tool implementation
    return `Processed: ${params.input}`;
  },
});

// Use the tool
const result = await myTool.invoke({ input: 'hello' });
if (result.success) {
  console.log(result.data); // "Processed: hello"
}
```

### Registering Tools

```typescript
import { toolRegistry, registerTool } from '@/lib/tools';

// Option 1: Manual registration
toolRegistry.register(myTool);

// Option 2: Auto-registration with decorator
const autoTool = registerTool(createTool({
  name: 'auto_tool',
  description: 'Automatically registered tool',
  execute: async () => 'result',
}));
```

## Core Concepts

### Tool Interface

All tools implement the `Tool<P, R>` interface:

```typescript
interface Tool<P = unknown, R = unknown> {
  readonly name: string;
  readonly description: string;
  invoke: (params: P) => Promise<ToolResult<R>>;
  invokeRaw: (params: P) => Promise<R>;
  readonly config: ToolConfig<P, R>;
}
```

- `invoke()` - Returns a `ToolResult` with execution metadata
- `invokeRaw()` - Returns the result directly (used internally)

### ToolResult

Tools return structured results with execution metadata:

```typescript
interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;           // Present on success
  error?: string;     // Present on failure
  executionTime: number;
  retryCount: number;
}
```

### Error Handling

The framework provides automatic error handling with:

- **Retry Logic**: Exponential backoff with configurable parameters
- **Context Enhancement**: Automatic error enrichment with tool context
- **Type Safety**: Proper error types and type guards
- **Monitoring**: Automatic metrics collection

## Tool Creation Options

### Basic Configuration

```typescript
const tool = createTool({
  name: 'basic_tool',
  description: 'A basic tool',
  execute: async (params) => {
    // Implementation
  },
});
```

### Advanced Configuration

```typescript
const tool = createTool({
  name: 'advanced_tool',
  description: 'An advanced tool with validation',
  execute: async (params: { text: string; count: number }) => {
    // Implementation
  },
  retryConfig: {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
    maxDelay: 30000,
    timeout: 60000,
  },
  timeout: 30000,
  sessionId: 'optional-session-id',
  validateParams: (params) => {
    if (!params.text || params.text.trim() === '') {
      throw new Error('Text parameter is required');
    }
    if (params.count <= 0) {
      throw new Error('Count must be positive');
    }
  },
  validateResult: (result) => {
    if (typeof result !== 'string') {
      throw new Error('Result must be a string');
    }
  },
});
```

## Tool Factory Patterns

The framework includes pre-configured factories for common tool types:

### API Tools

```typescript
const apiTool = ToolFactory.createApiTool(
  'api_service',
  'Calls external API service',
  async (params) => {
    const response = await fetch(params.url);
    return response.json();
  },
  30000 // 30 second timeout
);
```

### File Processing Tools

```typescript
const fileProcessor = ToolFactory.createFileProcessingTool(
  'process_file',
  'Processes uploaded files',
  async (params: { fileBuffer: Buffer }) => {
    // File processing logic with extended timeout
    return processFile(params.fileBuffer);
  }
);
```

### Database Tools

```typescript
const dbTool = ToolFactory.createDatabaseTool(
  'fetch_data',
  'Fetches data from database',
  async (params) => {
    const { data } = await supabase.from('table').select('*');
    return data;
  }
);
```

### Chapter Generation Tools

```typescript
const chapterTool = ToolFactory.createChapterGenerationTool(
  'generate_chapter',
  'Generates book chapters with AI',
  async (params: ChapterConfig) => {
    // Expensive AI operation with minimal retries
    return await generateChapterContent(params);
  }
);
```

## Tool Registry

The tool registry provides centralized tool management:

### Basic Operations

```typescript
import { toolRegistry } from '@/lib/tools';

// Register a tool
toolRegistry.register(myTool);

// Check if tool exists
if (toolRegistry.has('my_tool')) {
  // Get and use tool
  const tool = toolRegistry.get('my_tool');
  const result = await tool?.invoke(params);
}

// List all tools
const allTools = toolRegistry.list(); // ['my_tool', 'other_tool']

// Get detailed information
const detailed = toolRegistry.listDetailed();
```

### Tool Discovery

```typescript
import { ToolUtils } from '@/lib/tools';

// Find tools by keyword
const pdfTools = ToolUtils.findByKeyword('pdf');

// Get most used tools
const popular = ToolUtils.getMostUsed(5);

// Get recently used tools
const recent = ToolUtils.getRecentlyUsed(5);

// Export registry state for debugging
const config = ToolUtils.exportConfig();
```

### Validation

```typescript
const validation = ToolUtils.validateRegistry();
if (!validation.valid) {
  console.error('Registry issues:', validation.issues);
}
```

## Advanced Error Handling

### Circuit Breaker Pattern

```typescript
import { ToolCircuitBreaker } from '@/lib/tools';

const circuitBreaker = new ToolCircuitBreaker('my_tool', {
  failureThreshold: 3,
  recoveryTimeoutMs: 5000,
  monitorWindowMs: 10000,
});

// Use circuit breaker
try {
  const result = await circuitBreaker.execute(() => riskyOperation());
} catch (error) {
  console.log('Circuit breaker prevented execution');
}

// Check state
const state = circuitBreaker.getState();
console.log(`Circuit breaker is ${state.state}`);
```

### Timeout Management

```typescript
import { ToolTimeout } from '@/lib/tools';

// Wrap promise with timeout
const result = await ToolTimeout.withTimeout(
  longRunningOperation(),
  30000,
  'my_tool'
);

// Manual timeout controller
const controller = ToolTimeout.createController(30000, 'my_tool');
controller.start();

// Check timeout periodically
try {
  controller.checkTimeout(); // Throws if timed out
  // Continue operation
} finally {
  controller.clear();
}
```

### Parameter Validation

```typescript
import { ToolValidator } from '@/lib/tools';

// Common validators
const validators = ToolValidator.commonValidators;

// In tool configuration
const tool = createTool({
  name: 'validated_tool',
  description: 'Tool with parameter validation',
  execute: async (params) => {
    // Implementation
  },
  validateParams: (params: any) => {
    // Validate required string
    validators.nonEmptyString(params.text);

    // Validate positive number
    validators.positiveNumber(params.count);

    // Validate buffer
    validators.validBuffer(params.fileData);

    // Validate object with required keys
    validators.objectWithKeys(['key1', 'key2'])(params.config);

    // Validate enum value
    validators.enumValue(['option1', 'option2'])(params.type);
  },
});
```

## Monitoring and Metrics

The tool framework automatically collects metrics:

- **Execution Time**: Duration of tool execution
- **Success/Error Counts**: Tool execution outcomes
- **Registry Stats**: Number of registered tools and access patterns
- **Usage Tracking**: Most/recently used tools

Metrics are exposed through the monitoring system and can be exported in Prometheus format for external monitoring.

## Integration with LangGraph

Tools are designed to work seamlessly with LangGraph nodes:

```typescript
// In a LangGraph node
async function myWorkflowNode(state: WorkflowState): Promise<WorkflowState> {
  const tool = toolRegistry.get('my_tool');
  if (!tool) {
    throw new Error('Tool not found: my_tool');
  }

  const result = await tool.invoke({
    input: state.userInput,
    context: state.context,
  });

  if (!result.success) {
    throw new Error(`Tool execution failed: ${result.error}`);
  }

  return {
    ...state,
    processedData: result.data,
    executionMetrics: {
      ...state.executionMetrics,
      [tool.name]: {
        executionTime: result.executionTime,
        retryCount: result.retryCount,
      },
    },
  };
}
```

## Best Practices

### 1. Tool Naming

- Use descriptive, action-oriented names: `pdf_extract`, `web_research`, `chapter_write`
- Use snake_case for consistency
- Include the primary function/domain

### 2. Error Handling

- Always handle errors gracefully
- Use appropriate retry configurations for different operation types
- Include meaningful error messages with context

### 3. Parameter Validation

- Validate all input parameters
- Use type-safe parameter interfaces
- Provide clear validation error messages

### 4. Performance

- Choose appropriate timeout values based on operation complexity
- Use circuit breakers for unreliable external services
- Monitor tool execution metrics

### 5. Documentation

- Provide clear tool descriptions
- Document parameter requirements and expected outputs
- Include usage examples

## Testing

The framework includes comprehensive test utilities. Example test:

```typescript
import { createTool } from '@/lib/tools';

describe('myTool', () => {
  it('processes input correctly', async () => {
    const tool = createTool({
      name: 'test_tool',
      description: 'Test tool',
      execute: async (params: { input: string }) => {
        return params.input.toUpperCase();
      },
    });

    const result = await tool.invoke({ input: 'hello' });

    expect(result.success).toBe(true);
    expect(result.data).toBe('HELLO');
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
  });
});
```

## Migration from Legacy Tools

When migrating existing tools:

1. Wrap existing functions with `createTool()`
2. Add proper TypeScript types for parameters and return values
3. Configure appropriate retry settings
4. Add parameter validation where needed
5. Register tools in the central registry
6. Update usage sites to use the new tool interface

## Troubleshooting

### Common Issues

**Tool not found in registry**
- Ensure the tool is registered: `toolRegistry.register(tool)`
- Check tool name spelling
- Verify registration occurs before usage

**Validation errors**
- Check parameter types match tool expectations
- Ensure required parameters are provided
- Review validation error messages for specific issues

**Timeout errors**
- Increase timeout value for long-running operations
- Use appropriate factory method for operation type
- Consider breaking down complex operations

**Circuit breaker open**
- Check underlying service health
- Reset circuit breaker: `circuitBreaker.reset()`
- Adjust failure threshold if too sensitive

For additional support, refer to the error logs which include detailed context and troubleshooting information.