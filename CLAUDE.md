# CLAUDE.md - Book Agent Development Standards

## Development Commands

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build production app with Turbopack
- `pnpm start` - Start production server
- `pnpm test` - Run Vitest unit tests
- `pnpm test:e2e` - Run Playwright end-to-end tests
- `pnpm lint` - Run ESLint and type checking
- `pnpm db:migrate` - Run Supabase migrations

## Package Manager

This project strictly uses **pnpm**. Do not use npm or yarn.

## Technology Stack

### Core Framework
- **Next.js 15** with App Router and TypeScript
- **LangGraph** for AI agent orchestration (NOT OpenAI Agents SDK)
- **OpenAI GPT-5 mini** with configurable parameters per agent
- **Supabase** for PostgreSQL database, real-time subscriptions, file storage

### State & UI
- **Zustand** for client state management
- **React Query** for server state and caching
- **shadcn/ui** components (New York style, neutral base color)
- **Tailwind CSS v4** for styling

### Specialized Libraries
- **React-PDF** (@react-pdf/renderer) for document generation
- **pdf-parse** for PDF text extraction
- **Firecrawl** (@mendable/firecrawl-js) for web research
- **DALL-E 3** (via OpenAI) for cover image generation

## Architecture Principles

### 1. Layered Architecture
```
presentation/ → service/ → data/
     ↓           ↓         ↓
    UI       Agents   Supabase
```

### 2. Tool-Centric Design
- All AI capabilities exposed as discrete tools
- Tools are reusable, testable, and independently maintainable
- LangGraph nodes orchestrate tool usage, not business logic

### 3. Dynamic Parallel Execution
- Single LangGraph that spawns N parallel chapter nodes
- Shared state coordination through Supabase
- Automatic dependency resolution between chapters

## Project Structure

```
app/                    # Next.js App Router
├── api/workflow/       # LangGraph execution endpoints
├── wizard/            # Multi-step UI pages
components/
├── ui/                # shadcn/ui components
├── wizard/            # Wizard step components
├── chat/              # AI conversation interface
├── dashboard/         # Progress monitoring
lib/
├── agents/            # LangGraph workflow definitions
├── tools/             # AI tool implementations
├── state/             # Zustand stores and React Query hooks
├── database/          # Supabase client and schema
```

## Coding Standards

### File Naming
- **Components**: PascalCase (`BookWizard.tsx`)
- **Utilities**: camelCase (`pdfExtractor.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_ENDPOINTS.ts`)
- **Directories**: kebab-case (`multi-step-wizard/`)

### Import Organization
```typescript
// 1. External libraries
import { StateGraph } from '@langchain/langgraph';
import { createClient } from '@supabase/supabase-js';

// 2. Internal utilities
import { cn } from '@/lib/utils';
import { retryConfig } from '@/lib/config';

// 3. Components
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/chat/ChatInterface';

// 4. Types
import type { WorkflowState, ChapterConfig } from '@/types';
```

### TypeScript Guidelines
- **Strict mode**: All type checking enabled with enhanced rules
- **Interface over type**: Use interfaces for object shapes
- **Generic constraints**: Constrain type parameters appropriately
- **Return types**: Always specify for public functions
- **Enhanced strictness**: Enable `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`
- **Compatibility**: May temporarily disable strict rules for existing code during migration
- **MVP Warning Status**: Current ESLint warnings in infrastructure code are acceptable during MVP phase; address during polish phase (Tasks 40+)

```typescript
// ✅ Good
interface BookRequirements {
  topic: string;
  audience: AudienceProfile;
  styleGuide: StylePreferences;
}

// ✅ Good
async function generateChapter<T extends ChapterConfig>(
  config: T,
  state: WorkflowState
): Promise<ChapterResult> {
  // implementation
}

// ❌ Avoid
const bookData: any = {};
```

## Error Handling Standards

### Tool Error Handling
```typescript
import { executeWithToolContext, ToolError } from '@/lib/errors/exports';

export async function createTool<P, R>(config: ToolConfig<P, R>) {
  return async (params: P): Promise<R> => {
    return executeWithToolContext(
      config.name,
      params,
      () => config.execute(params),
      config.sessionId
    );
  };
}

// Alternative manual approach
export async function manualToolExecution<P, R>(config: ToolConfig<P, R>) {
  return async (params: P): Promise<R> => {
    try {
      return await withRetry(() => config.execute(params), config.retryConfig);
    } catch (error) {
      throw new ToolError(config.name, error.message, {
        parameters: params,
        cause: error instanceof Error ? error : undefined,
      });
    }
  };
}
```

### LangGraph Error Recovery
```typescript
import { WorkflowErrorContext, WorkflowError } from '@/lib/errors/exports';

// Always implement node-level error handling with context
async function chapterNode(state: WorkflowState): Promise<WorkflowState> {
  const errorContext = new WorkflowErrorContext(state.sessionId, state.userId);

  try {
    errorContext.updateStage(state.currentStage);
    const result = await generateChapter(state.currentChapter);
    await saveCheckpoint(state.sessionId, { ...state, currentChapter: result });
    return { ...state, chapters: [...state.chapters, result] };
  } catch (error) {
    const workflowError = error instanceof WorkflowError
      ? error
      : errorContext.createError(WorkflowError, error.message, {
          recoverable: true,
          cause: error instanceof Error ? error : undefined,
        });

    return {
      ...state,
      error: workflowError.message,
      needsRetry: workflowError.recoverable,
      lastError: workflowError,
    };
  } finally {
    errorContext.cleanup();
  }
}
```

### Error Handling Best Practices

**Import Pattern**:
```typescript
// ✅ Use barrel imports for error utilities
import {
  ToolError,
  DatabaseError,
  WorkflowError,
  withRetry,
  executeWithToolContext,
  logger
} from '@/lib/errors/exports';

// ❌ Don't import individual files
import { ToolError } from '@/lib/errors/index';
```

**Error Creation**:
```typescript
// ✅ Use static factory methods for common scenarios
const timeoutError = ToolError.forTimeout('pdfExtract', 30000);
const retryError = ToolError.forRetry('webResearch', 'Failed after retries', 3);

// ✅ Include context for debugging
throw new DatabaseError('insert', 'Constraint violation', {
  table: 'chapters',
  context: { bookId, chapterNumber },
});
```

**Retry Configuration**:
```typescript
// ✅ Use operation-specific retry configs
import { retryAPI, retryDatabase, retryChapterGeneration } from '@/lib/errors/exports';

// API calls with network resilience
const apiResult = await retryAPI(() => openai.createCompletion(params));

// Database operations with connection handling
const dbResult = await retryDatabase(() => supabase.from('books').insert(data));

// Chapter generation with extended timeout
const chapter = await retryChapterGeneration(() => generateChapterContent(config));
```

## Monitoring & Performance Standards

### Metrics Collection
```typescript
import { applicationMetrics, timeOperation, timed } from '@/lib/monitoring/metrics';

// ✅ Time operations automatically
const result = await timeOperation(
  applicationMetrics.workflowDuration,
  () => executeWorkflow(config)
);

// ✅ Use decorator for method timing
class WorkflowManager {
  @timed(applicationMetrics.chapterGenerationTime)
  async generateChapter(config: ChapterConfig): Promise<ChapterResult> {
    // implementation
  }
}

// ✅ Track counters and gauges
applicationMetrics.workflowSuccess.inc();
applicationMetrics.activeWorkflows.inc();
```

### Analytics & Event Tracking
```typescript
import { trackEvent, trackUserJourney, trackError } from '@/lib/monitoring/analytics';

// ✅ Track user actions
await trackEvent('workflow_started', {
  sessionId,
  wordCount: requirements.wordCountTarget,
  chapterCount: outline.chapters.length
});

// ✅ Track user journey through wizard
await trackUserJourney('wizard_step_completed', {
  step: 'requirements',
  completionTime: Date.now() - stepStartTime
});

// ✅ Track errors with context
await trackError(error, {
  operation: 'chapter_generation',
  sessionId,
  retryAttempt: attempt
});
```

### Monitoring Best Practices

**Performance Metrics**:
```typescript
// ✅ Use appropriate metric types
const responseTime = metricsRegistry.createHistogram('api_response_time', 'API response time');
const errorCount = metricsRegistry.createCounter('api_errors_total', 'Total API errors');
const activeUsers = metricsRegistry.createGauge('active_users_count', 'Current active users');

// ✅ Export for external monitoring
const prometheusMetrics = metricsRegistry.exportPrometheusFormat();
```

**Event Analytics**:
```typescript
// ✅ Structure events consistently
interface BaseEvent {
  eventType: string;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  context: Record<string, unknown>;
}

// ✅ Environment-aware configuration
const analyticsConfig = {
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  batchSize: process.env.NODE_ENV === 'production' ? 100 : 10,
  flushInterval: process.env.NODE_ENV === 'production' ? 30000 : 5000
};
```

**Type Safety for Monitoring**:
```typescript
// ✅ Proper array bounds checking
const bucket = this.metric.buckets[i];
if (bucket !== undefined && value <= bucket) {
  const currentCount = this.metric.observations[i];
  if (currentCount !== undefined) {
    this.metric.observations[i] = currentCount + 1;
  }
}

// ✅ Decorator typing with proper context
const decoratedMethod = async function (this: unknown, ...args: Parameters<T>) {
  const endTimer = histogram.startTimer();
  try {
    return await originalMethod.call(this, ...args);
  } finally {
    endTimer();
  }
};
```

## Database Conventions

### Table Naming
- **Singular nouns**: `book`, `chapter`, `workflow_state`
- **Snake case**: `book_session`, `chapter_dependency`
- **Descriptive**: `user_feedback` not `feedback`

### Column Naming
```sql
-- ✅ Good
CREATE TABLE chapters (
  id UUID PRIMARY KEY,
  book_id UUID REFERENCES books(id),
  chapter_number INTEGER NOT NULL,
  word_count INTEGER,
  status chapter_status_enum,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ❌ Avoid generic names
CREATE TABLE items (
  id INTEGER,
  data TEXT,
  type VARCHAR(50)
);
```

### Query Patterns
```typescript
// ✅ Use typed query builders
const { data, error } = await supabase
  .from('chapters')
  .select('id, title, word_count, status')
  .eq('book_id', bookId)
  .order('chapter_number');

// ✅ Handle errors explicitly
if (error) {
  throw new DatabaseError(`Failed to fetch chapters: ${error.message}`);
}
```

## Component Standards

### Tool Components
```typescript
// ✅ Use tool framework for all AI tools
import { createTool, ToolFactory, toolRegistry } from '@/lib/tools';

// Basic tool creation
const pdfExtractTool = createTool({
  name: 'pdf_extract',
  description: 'Extract text content from PDF files',
  execute: async (params: PdfExtractParams): Promise<string> => {
    // implementation
  },
  validateParams: (params) => {
    if (!Buffer.isBuffer(params.fileBuffer)) {
      throw new Error('Valid file buffer required');
    }
  },
});

// Factory pattern for common tool types
const apiTool = ToolFactory.createApiTool(
  'web_research',
  'Research topics using web scraping',
  async (params) => await fetchWebData(params),
  30000 // timeout
);

// Register tools for discovery
toolRegistry.register(pdfExtractTool);
```

### OpenAI Integration Patterns
```typescript
// ✅ Two-part prompting for consistent quality
const systemPrompt = generateSystemPrompt(style, wordTarget);
const userPrompt = generateUserPrompt(requirements);

const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  max_tokens: Math.floor(wordTarget * 1.5),
  temperature: 0.7,
  top_p: 0.9,
  frequency_penalty: 0.1,
  presence_penalty: 0.1
});

// ✅ Content validation after generation
const validation = validateContent(content, requirements);
if (!validation.isValid) {
  throw new ToolError('content_quality', validation.issues.join(', '));
}
```

### React Components
```typescript
// ✅ Consistent component interface
interface WizardStepProps {
  currentStep: number;
  totalSteps: number;
  onNext: (data: StepData) => void;
  onPrevious: () => void;
  initialData?: StepData;
  isLoading?: boolean;
}

export function RequirementsStep({
  onNext,
  initialData,
  isLoading = false
}: WizardStepProps) {
  // implementation
}
```

## Testing Standards

### Test File Organization
```
__tests__/
├── tools/             # Tool unit tests
├── agents/            # LangGraph workflow tests
├── components/        # React component tests
├── e2e/              # Playwright end-to-end tests
├── fixtures/         # Test data and mocks
```

### Test Naming
```typescript
// ✅ Descriptive test names
describe('pdfExtractTool', () => {
  it('extracts text from valid PDF file', async () => {});
  it('throws error for corrupted PDF file', async () => {});
  it('respects extraction options for formatting', async () => {});
});

describe('Book Creation Workflow', () => {
  it('completes successfully with minimal user input', async () => {});
  it('recovers from chapter generation failure', async () => {});
  it('generates book meeting minimum word count', async () => {});
});
```

## Environment Configuration

### Required Variables
```bash
# .env.local
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://....supabase.co
SUPABASE_ANON_KEY=eyJ...
FIRECRAWL_API_KEY=fc-...
NODE_ENV=development
```

### Environment Validation
```typescript
// Always validate on startup
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'FIRECRAWL_API_KEY'
] as const;

export function validateEnvironment(): void {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}
```

## Code Quality Configuration

### ESLint Setup
```javascript
// eslint.config.mjs - Modern flat config
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "error",
      "no-var": "error"
    }
  }
];
```

### Prettier Setup
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

## Git Commit Standards

### Commit Message Format
```
type(scope): brief description

Detailed explanation if needed

- Bullet points for multiple changes
- Reference issues: Fixes #123
```

### Commit Types
- **feat**: New feature implementation
- **fix**: Bug fix or error correction
- **refactor**: Code restructuring without feature changes
- **test**: Adding or updating tests
- **docs**: Documentation updates
- **chore**: Build process, dependency updates

### Examples
```
feat(agents): implement parallel chapter generation with LangGraph

- Add dynamic node creation for variable chapter count
- Implement shared state coordination via Supabase
- Add retry logic for chapter generation failures

Fixes #45
```

## Performance Guidelines

### LangGraph Optimization
```typescript
// ✅ Efficient parallel execution
const chapterPromises = chapterConfigs.map(config =>
  graph.invokeNode(`chapter_${config.number}`, {
    ...state,
    currentChapter: config
  })
);
const results = await Promise.all(chapterPromises);

// ❌ Avoid sequential execution
for (const config of chapterConfigs) {
  await graph.invokeNode(`chapter_${config.number}`, state);
}
```

### React Query Optimization
```typescript
// ✅ Strategic caching
export const useChapterProgress = (sessionId: string) => {
  return useQuery({
    queryKey: ['chapters', sessionId],
    queryFn: () => fetchChapterProgress(sessionId),
    staleTime: 30 * 1000,        // 30 seconds
    refetchInterval: 5 * 1000,   // 5 second polling
    enabled: !!sessionId
  });
};
```

## Security Requirements

### Input Validation
```typescript
// ✅ Validate all user inputs
const BookPromptSchema = z.object({
  prompt: z.string().min(3).max(1000),
  pdfFile: z.instanceof(File).optional(),
  author: z.string().min(1).max(100)
});

export async function validateBookRequest(input: unknown) {
  return BookPromptSchema.parse(input);
}
```

### File Upload Security
```typescript
// ✅ Secure PDF processing
export async function processPdfUpload(file: File): Promise<string> {
  // Validate file type and size
  validatePdfFile(file);

  // Scan for malware
  await scanFileForThreats(file);

  // Extract text safely
  return await extractPdfText(file);
}
```