# CLAUDE.md - Book Agent Intelligent Development Standards

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
- **LangGraph** for intelligent workflow orchestration with **OpenAI Agents SDK** for GPT-5 mini calls
- **OpenAI GPT-5 mini** with adaptive parameters, agent collaboration, and learning capabilities
- **Supabase** for PostgreSQL database, real-time subscriptions, file storage, and learning data persistence

### State & UI
- **Zustand** for client state management
- **React Query** for server state and caching
- **shadcn/ui** components (New York style, neutral base color)
- **Tailwind CSS v4** for styling

### Specialized Libraries
- **React-PDF** (@react-pdf/renderer) for document generation
- **pdf-parse** for PDF text extraction
- **Firecrawl** (@mendable/firecrawl-js) for adaptive web research
- **DALL-E 3** (via OpenAI) for intelligent cover image generation

## Intelligent Agentic Architecture Principles

### 1. Intelligent State-First Hybrid Architecture
```
presentation/ → service/ → data/
     ↓           ↓         ↓
    UI      LangGraph   Supabase
            +    ↓
     OpenAI Agents SDK (GPT-5 mini)
            +    ↓
    Agent Communication & Learning
```

**Enhanced Hybrid Approach Benefits:**
- **LangGraph**: Intelligent workflow orchestration with adaptive routing
- **OpenAI Agents SDK**: GPT-5 mini calls with agent collaboration
- **Agent Communication**: Real-time coordination and problem-solving
- **Continuous Learning**: Performance improvement through experience
- **Best of All**: Complex workflows + AI collaboration + adaptive intelligence

### 2. Adaptive Planning & Strategy Selection
- **Dynamic Workflow Planning**: Agents analyze requirements and create optimal strategies
- **Resource Allocation**: Intelligent estimation of time, tokens, and quality thresholds
- **Strategy Adaptation**: Real-time adjustment based on intermediate results
- **Complexity-Aware Processing**: Adaptive approach selection based on content complexity

### 3. Inter-Agent Collaboration & Communication
- **Message-Based Communication**: Real-time agent-to-agent coordination
- **Collaborative Problem-Solving**: Agents work together to resolve conflicts
- **Specialized Agent Roles**: Coordinator, arbitrator, and specialist agents
- **Knowledge Sharing**: Agents share insights, patterns, and learned strategies

### 4. Dynamic Tool Selection & Intelligence
- **Task-Aware Tool Recommendation**: Tools selected based on specific requirements
- **Adaptive Tool Configuration**: Parameters optimized based on performance
- **Performance Learning**: Tool effectiveness tracked and strategies learned
- **Custom Tool Creation**: Dynamic tool generation for specialized requirements

### 5. Continuous Learning & Self-Improvement
- **Experience-Based Learning**: Agents learn from feedback and performance metrics
- **Pattern Recognition**: Identification of successful strategies across content types
- **Strategy Evolution**: Continuous improvement of planning and execution
- **Knowledge Synthesis**: Aggregation of learning across projects and domains

### 6. Enhanced Tool-Centric Design
- All AI capabilities exposed as discrete, intelligent tools
- Tools are reusable, testable, and independently maintainable
- LangGraph nodes orchestrate intelligent tool usage with learning
- Tools adapt and improve through usage patterns and feedback

### 7. Sequential Processing with State Persistence
- Single LangGraph with sequential chapter processing for context management
- Persistent state coordination through Supabase with learning storage
- Agent communication and collaboration for dependency resolution
- Chapter-by-chapter review and quality assurance with intelligence

## Project Structure

```
app/                    # Next.js App Router
├── api/workflow/       # LangGraph execution endpoints with adaptive routing
├── wizard/            # Multi-step UI pages with intelligent planning
components/
├── ui/                # shadcn/ui components
├── wizard/            # Wizard step components with adaptive flows
├── chat/              # AI conversation interface with learning
├── dashboard/         # Progress monitoring with agent activity
├── collaboration/     # Agent communication and coordination interfaces
lib/
├── agents/            # LangGraph workflow definitions with intelligence
│   ├── planning/      # Adaptive planning and strategy selection
│   ├── communication/ # Inter-agent collaboration framework
│   ├── learning/      # Continuous learning and improvement
│   └── nodes/         # Enhanced workflow nodes with state persistence
├── tools/             # AI tool implementations with intelligence
│   ├── orchestration/ # Dynamic tool selection and management
│   └── supabase-state/# Enhanced state management with learning
├── state/             # Zustand stores and React Query hooks
├── database/          # Supabase client, schema, and learning tables
```

## Coding Standards

### File Naming
- **Components**: PascalCase (`BookWizard.tsx`)
- **Utilities**: camelCase (`pdfExtractor.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_ENDPOINTS.ts`)
- **Directories**: kebab-case (`multi-step-wizard/`)
- **Agent Files**: PascalCase with Agent suffix (`PlanningAgent.ts`)

### Import Organization
```typescript
// 1. External libraries
import { StateGraph } from '@langchain/langgraph';
import { createClient } from '@supabase/supabase-js';

// 2. Internal utilities and intelligent systems
import { cn } from '@/lib/utils';
import { retryConfig } from '@/lib/config';
import { AgentCommunicationHub } from '@/lib/agents/communication';
import { ToolOrchestrator } from '@/lib/tools/orchestration';

// 3. Components
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { AgentMonitor } from '@/components/collaboration/AgentMonitor';

// 4. Types
import type { WorkflowState, ChapterConfig, AgentMessage, LearningExperience } from '@/types';
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
// ✅ Good - Enhanced with intelligent agent interfaces
interface BookRequirements {
  topic: string;
  audience: AudienceProfile;
  styleGuide: StylePreferences;
  adaptivePlan?: AdaptivePlan;
  learningContext?: LearningContext;
}

interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'question' | 'feedback' | 'coordination' | 'clarification';
  content: string;
  context: MessageContext;
  requiresResponse: boolean;
}

// ✅ Good - Intelligent agent function signatures
async function generateChapterWithCollaboration<T extends ChapterConfig>(
  config: T,
  state: WorkflowState,
  collaborationHub: AgentCommunicationHub
): Promise<ChapterResult> {
  // implementation with agent coordination
}

// ❌ Avoid
const bookData: any = {};
```

## Error Handling Standards

### Intelligent Tool Error Handling
```typescript
import { executeWithToolContext, ToolError, AgentCommunicationHub } from '@/lib/errors/exports';

export async function createIntelligentTool<P, R>(config: IntelligentToolConfig<P, R>) {
  return async (params: P): Promise<R> => {
    return executeWithToolContext(
      config.name,
      params,
      async () => {
        // Try primary execution
        try {
          return await config.execute(params);
        } catch (error) {
          // Attempt agent collaboration for problem-solving
          if (config.allowCollaboration) {
            const solution = await config.communicationHub.requestHelp(
              config.name,
              error.message,
              params
            );
            if (solution) {
              return await config.executeWithSolution(params, solution);
            }
          }
          throw error;
        }
      },
      config.sessionId
    );
  };
}
```

### Enhanced LangGraph Error Recovery with Learning
```typescript
import { WorkflowErrorContext, WorkflowError, AgentLearningSystem } from '@/lib/errors/exports';

// Enhanced node-level error handling with learning and collaboration
async function intelligentChapterNode(state: WorkflowState): Promise<WorkflowState> {
  const errorContext = new WorkflowErrorContext(state.sessionId, state.userId);
  const learningSystem = new AgentLearningSystem();

  try {
    errorContext.updateStage(state.currentStage);

    // Load previous learning experiences
    const learningHistory = await learningSystem.getRelevantExperiences(
      'ChapterAgent',
      'chapter_generation',
      state.context
    );

    // Execute with learned optimizations
    const result = await generateChapterWithLearning(state, learningHistory);

    // Save successful execution for future learning
    await learningSystem.recordSuccess(state.sessionId, 'chapter_generation', result);

    await saveCheckpoint(state.sessionId, { ...state, currentChapter: result });
    return { ...state, chapters: [...state.chapters, result] };

  } catch (error) {
    // Record failure for learning
    await learningSystem.recordFailure(state.sessionId, 'chapter_generation', error, state.context);

    // Attempt agent collaboration for problem resolution
    const collaborationResult = await attemptCollaborativeRecovery(error, state);
    if (collaborationResult.success) {
      return collaborationResult.state;
    }

    const workflowError = error instanceof WorkflowError
      ? error
      : errorContext.createError(WorkflowError, error.message, {
          recoverable: true,
          cause: error instanceof Error ? error : undefined,
          learningOpportunity: true
        });

    return {
      ...state,
      error: workflowError.message,
      needsRetry: workflowError.recoverable,
      lastError: workflowError,
      learningContext: await learningSystem.extractLearningContext(error, state)
    };

  } finally {
    errorContext.cleanup();
  }
}
```

### Agent Communication Error Patterns
```typescript
// ✅ Handle agent communication failures gracefully
async function requestAgentHelp(
  fromAgent: string,
  toAgent: string,
  problem: string,
  context: any,
  timeout: number = 30000
): Promise<string | null> {
  try {
    const response = await communicationHub.requestClarification(
      fromAgent,
      toAgent,
      problem,
      context
    );
    return response;
  } catch (error) {
    // Log communication failure but don't fail the entire workflow
    logger.warn(`Agent communication failed: ${fromAgent} -> ${toAgent}`, {
      error: error.message,
      problem,
      context
    });

    // Try alternative agents or fallback strategies
    const alternatives = await findAlternativeAgents(toAgent, problem);
    for (const altAgent of alternatives) {
      try {
        return await communicationHub.requestClarification(fromAgent, altAgent, problem, context);
      } catch (altError) {
        continue; // Try next alternative
      }
    }

    return null; // No help available, continue with default approach
  }
}
```

## Intelligent Agent Orchestration Standards

### Enhanced LangGraph Node Implementation with Intelligence
```typescript
// ✅ Use BaseWorkflowNode pattern with intelligent capabilities
import { BaseWorkflowNode } from '@/lib/agents/nodes/base';
import { AgentCommunicationHub } from '@/lib/agents/communication';
import { ToolOrchestrator } from '@/lib/tools/orchestration';
import { AgentLearningSystem } from '@/lib/agents/learning';
import { WorkflowState } from '@/types';

class IntelligentConversationNode extends BaseWorkflowNode {
  private communicationHub: AgentCommunicationHub;
  private toolOrchestrator: ToolOrchestrator;
  private learningSystem: AgentLearningSystem;

  constructor() {
    super('conversation', 'Gather book requirements through intelligent guided conversation');
    this.communicationHub = new AgentCommunicationHub();
    this.toolOrchestrator = new ToolOrchestrator();
    this.learningSystem = new AgentLearningSystem();
  }

  protected async executeNode(state: WorkflowState): Promise<WorkflowState> {
    // Load adaptive plan for context-aware execution
    const adaptivePlan = await this.loadAdaptivePlan(state);

    // Get improved instructions based on learning history
    const enhancedInstructions = await this.learningSystem.getImprovedInstructions(
      'ConversationAgent',
      'requirements_gathering',
      state.context
    );

    // Update progress with intelligent estimation
    let progress = this.updateProgress(state, 30, 'Analyzing user prompt with adaptive planning');

    // Select optimal tools for this specific conversation
    const recommendedTools = await this.toolOrchestrator.recommendTools({
      type: 'conversation',
      complexity: adaptivePlan.complexity,
      domain: state.userPrompt,
      context: state.context
    });

    // Perform conversation with agent collaboration
    const requirements = await this.gatherRequirementsWithCollaboration(
      state.userPrompt,
      adaptivePlan,
      enhancedInstructions,
      recommendedTools
    );

    // Learn from this execution
    await this.learningSystem.recordExecution(
      'ConversationAgent',
      'requirements_gathering',
      requirements,
      state.context
    );

    // ✅ Add data to state before transition (transitionToStage only accepts 3 params)
    const stateWithResults = {
      ...progress,
      requirements,
      baseContent: extractedContent,
      adaptivePlan,
      learningContext: await this.learningSystem.extractLearningContext(requirements, state)
    };

    // Transition to next stage with intelligent routing
    const nextStage = adaptivePlan.strategy === 'fast_track' ? 'chapter_spawning' : 'outline';
    return this.transitionToStage(stateWithResults, nextStage);
  }

  // Enhanced validation with learning context
  validate(state: WorkflowState): boolean {
    const basicValidation = !!state.userPrompt && state.userPrompt.length >= 3;

    // Additional intelligent validation based on complexity
    if (state.adaptivePlan?.complexity === 'expert') {
      return basicValidation && state.userPrompt.length >= 50; // More detailed prompts for expert content
    }

    return basicValidation;
  }

  // Intelligent recovery with collaboration
  async recover(state: WorkflowState, error: WorkflowError): Promise<WorkflowState> {
    // Try collaborative problem-solving first
    const collaborationResult = await this.communicationHub.requestHelp(
      'ConversationAgent',
      'QualityArbitrator',
      `Failed to gather requirements: ${error.message}`,
      state.context
    );

    if (collaborationResult) {
      // Apply collaborative solution
      return this.executeWithGuidance(state, collaborationResult);
    }

    // Fallback to simplified approach with learning
    const simplifiedPlan = await this.createSimplifiedPlan(state.adaptivePlan);
    const recoveryState = { ...state, adaptivePlan: simplifiedPlan };

    // Record learning opportunity
    await this.learningSystem.recordRecovery('ConversationAgent', error, simplifiedPlan);

    return this.executeNode(recoveryState);
  }
}
```

### Intelligent StateGraph Configuration with Adaptive Routing
```typescript
// ✅ Use channel-based state management with intelligence
const intelligentStateGraphArgs: StateGraphArgs<BookWorkflowState> = {
  channels: {
    sessionId: {
      value: (prev?: string, next?: string) => next ?? prev ?? '',
      default: () => '',
    },
    currentStage: {
      value: (prev?: WorkflowStage, next?: WorkflowStage) => next ?? prev ?? 'planning',
      default: () => 'planning' as WorkflowStage,
    },
    adaptivePlan: {
      value: (prev?: AdaptivePlan, next?: AdaptivePlan) => next ?? prev,
      default: () => undefined,
    },
    learningContext: {
      value: (prev?: LearningContext, next?: LearningContext) => next ?? prev,
      default: () => ({}),
    },
    communicationLog: {
      value: (prev?: AgentMessage[], next?: AgentMessage[]) => next ?? prev ?? [],
      default: () => [],
    },
    // ... other channels
  },
};

export const intelligentBookWorkflowGraph = new StateGraph<BookWorkflowState>(intelligentStateGraphArgs);

// Add adaptive routing logic
intelligentBookWorkflowGraph.addConditionalEdges(
  'planning',
  (state: BookWorkflowState) => {
    if (state.adaptivePlan?.strategy === 'minimal_viable') {
      return 'chapter_spawning'; // Skip detailed conversation and outline
    }
    return 'conversation';
  }
);

intelligentBookWorkflowGraph.addConditionalEdges(
  'chapter_generation',
  (state: BookWorkflowState) => {
    if (state.adaptivePlan?.reviewCycles > 1) {
      return 'chapter_review';
    }
    return 'markdown_assembly'; // Skip review for simple content
  }
);
```

### Dynamic Agent Collaboration
```typescript
// ✅ Create collaborative chapter generation with intelligence
export async function createCollaborativeChapterGeneration(
  graph: StateGraph<BookWorkflowState>,
  chapterConfigs: ChapterConfig[],
  communicationHub: AgentCommunicationHub
): Promise<string[]> {
  const chapterNodeIds: string[] = [];

  for (const config of chapterConfigs) {
    const nodeId = `chapter_${config.chapterNumber}`;

    // Create intelligent chapter node with collaboration capabilities
    const chapterNode = createIntelligentChapterNode(config, communicationHub);

    graph.addNode(nodeId, async (state: BookWorkflowState) => {
      return await executeNodeWithCollaboration(nodeId, state,
        async (s: BookWorkflowState) => await chapterNode.execute(s),
        communicationHub
      ) as Partial<BookWorkflowState>;
    });

    chapterNodeIds.push(nodeId);
  }

  return chapterNodeIds;
}
```

### Enhanced Checkpoint and Recovery with Learning
```typescript
// ✅ Use intelligent checkpointing with learning integration
export async function executeNodeWithIntelligence<T>(
  nodeName: string,
  state: BookWorkflowState,
  nodeFunction: (state: BookWorkflowState) => Promise<T>,
  learningSystem: AgentLearningSystem,
  communicationHub: AgentCommunicationHub
): Promise<T> {
  try {
    // Load relevant learning experiences
    const learningHistory = await learningSystem.getRelevantExperiences(
      nodeName,
      state.currentStage,
      state.context
    );

    // Execute with learned optimizations
    const result = await nodeFunction({
      ...state,
      learningHistory,
      enhancedCapabilities: true
    });

    // Save checkpoint with learning metadata
    await saveIntelligentCheckpoint(state.sessionId, {
      ...state,
      updatedAt: new Date().toISOString(),
      lastSuccessfulNode: nodeName,
      learningMetadata: await learningSystem.extractSuccessMetadata(result)
    });

    // Record successful execution for learning
    await learningSystem.recordSuccess(state.sessionId, nodeName, result, state.context);

    return result;

  } catch (error) {
    // Attempt collaborative problem-solving
    const collaborationResult = await communicationHub.requestProblemSolving(
      nodeName,
      error.message,
      state.context
    );

    if (collaborationResult.success) {
      // Retry with collaborative guidance
      const guidedResult = await nodeFunction({
        ...state,
        collaborativeGuidance: collaborationResult.guidance
      });

      // Record collaborative success
      await learningSystem.recordCollaborativeSuccess(
        state.sessionId,
        nodeName,
        guidedResult,
        collaborationResult
      );

      return guidedResult;
    }

    // Record failure for learning and re-throw
    await learningSystem.recordFailure(state.sessionId, nodeName, error, state.context);
    throw error;
  }
}
```

## Enhanced Component Standards

### Intelligent PDF Generation with Learning
```typescript
// ✅ Use React.createElement with adaptive formatting based on learned preferences
import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

// Create intelligent PDF components with learned user preferences
const createIntelligentPDFDocument = (
  outline: BookOutline,
  requirements: BookRequirements,
  learningContext: LearningContext
) => {
  // Adapt typography based on learned user preferences
  const adaptiveTypography = adaptTypographyFromLearning(
    requirements.styleGuide,
    learningContext.userPreferences
  );

  return React.createElement(Document, {
    title: outline.title,
    author: requirements.author.name,
    creator: 'Book Agent - Intelligent PDF Generation'
  }, [
    React.createElement(Page, {
      size: "A4",
      style: adaptiveTypography.pageStyle
    }, [
      React.createElement(Text, {
        style: adaptiveTypography.titleStyle
      }, outline.title),
      React.createElement(Text, {
        style: adaptiveTypography.subtitleStyle
      }, outline.subtitle || '')
    ])
  ]);
};

// ✅ Intelligent typography configuration with learning adaptation
const adaptTypographyFromLearning = (
  styleGuide: StyleGuide,
  userPreferences: UserPreferences
) => {
  const baseConfig = {
    titleFont: 'Helvetica-Bold',
    bodyFont: 'Helvetica',
    titleSize: 24,
    bodySize: 12,
    lineHeight: 1.5,
    margins: 72 // 1 inch
  };

  // Adapt based on learned preferences
  if (userPreferences.typography?.preferSansSerif) {
    baseConfig.bodyFont = 'Helvetica';
  } else if (userPreferences.typography?.preferSerif) {
    baseConfig.bodyFont = 'Times-Roman';
  }

  // Adjust sizing based on feedback patterns
  if (userPreferences.feedback?.textTooSmall) {
    baseConfig.bodySize += 1;
    baseConfig.titleSize += 2;
  }

  return baseConfig;
};
```

### Intelligent Tool Components with Dynamic Selection
```typescript
// ✅ Use intelligent tool framework with adaptive selection
import { createTool, ToolFactory, toolRegistry, ToolOrchestrator } from '@/lib/tools';

// Enhanced tool creation with learning capabilities
const intelligentPdfExtractTool = createTool({
  name: 'intelligent_pdf_extract',
  description: 'Extract text content from PDF files with adaptive processing',
  execute: async (params: PdfExtractParams): Promise<string> => {
    // Select optimal extraction strategy based on PDF characteristics
    const strategy = await selectExtractionStrategy(params.fileBuffer);

    // Execute with adaptive parameters
    return await executeWithStrategy(params, strategy);
  },
  validateParams: (params) => {
    if (!Buffer.isBuffer(params.fileBuffer)) {
      throw new Error('Valid file buffer required');
    }
  },
  learningCapabilities: {
    trackPerformance: true,
    adaptParameters: true,
    shareInsights: true
  }
});

// Intelligent tool orchestration for chapter generation
const createIntelligentChapterWriter = (
  taskDescription: TaskDescription,
  orchestrator: ToolOrchestrator
) => {
  return ToolFactory.createAdaptiveTool(
    'intelligent_chapter_writer',
    'Generate chapters with intelligent tool selection and collaboration',
    async (params) => {
      // Get optimal tool recommendations
      const recommendedTools = await orchestrator.recommendTools(taskDescription);

      // Execute with dynamic tool selection
      return await generateChapterWithOptimalTools(params, recommendedTools);
    },
    {
      timeout: 300000, // 5 minutes
      retryConfig: 'intelligent', // Use learning-based retry strategy
      collaborationEnabled: true,
      learningEnabled: true
    }
  );
};
```

### Enhanced GPT-5 Mini Integration with Agent Collaboration
```typescript
// ✅ Use collaborative agents for enhanced task execution
import { BookGenerationAgents, CollaborativeAgents } from '@/lib/agents/gpt5-wrapper';

// Intelligent chapter content generation with collaboration
const generateChapterWithCollaboration = async (
  chapterConfig: ChapterConfig,
  state: WorkflowState,
  communicationHub: AgentCommunicationHub
) => {
  // Primary chapter generation
  const chapterAgent = BookGenerationAgents.chapterWriter();
  const primaryContent = await chapterAgent.execute(buildChapterPrompt(chapterConfig, state));

  // Request coordination for cross-chapter consistency
  const coordinationGuidance = await communicationHub.requestClarification(
    'ChapterAgent',
    'ChapterCoordinator',
    `Review chapter ${chapterConfig.chapterNumber} for consistency with previous chapters`,
    { chapterContent: primaryContent, chapterConfig }
  );

  // Apply coordination feedback
  const refinedContent = await applyCoordinationGuidance(primaryContent, coordinationGuidance);

  // Validate content quality with arbitrator if needed
  const qualityScore = await assessContentQuality(refinedContent, chapterConfig);
  if (qualityScore < 0.8) {
    const qualityGuidance = await communicationHub.requestClarification(
      'ChapterAgent',
      'QualityArbitrator',
      `Chapter ${chapterConfig.chapterNumber} quality score is ${qualityScore}. How can it be improved?`,
      { content: refinedContent, qualityScore, requirements: state.requirements }
    );

    return await improveContentWithGuidance(refinedContent, qualityGuidance);
  }

  return refinedContent;
};

// ✅ Task-specific parameter optimization with learning
const createLearningOptimizedAgent = (
  agentType: string,
  taskHistory: LearningExperience[],
  context: TaskContext
) => {
  // Analyze successful patterns from history
  const optimalParameters = analyzeOptimalParameters(taskHistory, context);

  return createGPT5Agent({
    name: `Learning-Optimized ${agentType}`,
    instructions: generateOptimizedInstructions(agentType, taskHistory, context),
    reasoning_effort: optimalParameters.reasoningEffort,
    verbosity: optimalParameters.verbosity,
    temperature: optimalParameters.temperature,
    max_tokens: optimalParameters.maxTokens,
    learningContext: {
      previousExperiences: taskHistory,
      optimizationApplied: true,
      performanceTargets: optimalParameters.targets
    }
  });
};

// ✅ Content validation with collaborative feedback
const validateContentWithCollaboration = async (
  content: string,
  requirements: BookRequirements,
  communicationHub: AgentCommunicationHub
) => {
  const validation = validateContent(content, requirements);

  if (!validation.isValid) {
    // Request collaborative problem-solving
    const solution = await communicationHub.requestProblemSolving(
      'ContentValidator',
      `Content validation failed: ${validation.issues.join(', ')}`,
      { content, requirements, validationResults: validation }
    );

    if (solution.success) {
      const improvedContent = await applyCollaborativeSolution(content, solution);
      return validateContent(improvedContent, requirements);
    }

    throw new ToolError('content_quality', validation.issues.join(', '));
  }

  return validation;
};
```

## Testing Standards

### Intelligent Test File Organization
```
__tests__/
├── agents/            # Intelligent agent workflow tests
│   ├── planning/      # Adaptive planning tests
│   ├── communication/ # Agent collaboration tests
│   ├── learning/      # Learning system tests
│   └── nodes/         # Enhanced workflow node tests
├── tools/             # Intelligent tool unit tests
├── components/        # React component tests
├── e2e/              # Playwright end-to-end tests
├── fixtures/         # Test data and intelligent mocks
│   ├── learning/      # Learning experience fixtures
│   ├── communication/# Agent message fixtures
│   └── adaptive/      # Adaptive plan fixtures
```

### Enhanced Test Naming with Intelligence Context
```typescript
// ✅ Descriptive test names with intelligent context
describe('IntelligentPdfExtractTool', () => {
  it('adapts extraction strategy based on PDF complexity', async () => {});
  it('learns from extraction performance and improves accuracy', async () => {});
  it('collaborates with other agents when extraction fails', async () => {});
  it('respects learned user preferences for formatting', async () => {});
});

describe('Collaborative Book Creation Workflow', () => {
  it('completes successfully with adaptive planning and agent coordination', async () => {});
  it('recovers from failures through agent collaboration', async () => {});
  it('learns from user feedback and improves subsequent generations', async () => {});
  it('adapts strategy based on content complexity analysis', async () => {});
  it('maintains quality through intelligent agent arbitration', async () => {});
});

describe('Agent Learning System', () => {
  it('captures performance patterns and improves agent instructions', async () => {});
  it('shares knowledge effectively between specialized agents', async () => {});
  it('adapts workflow strategies based on historical success rates', async () => {});
});
```

## UI/UX Design Standards

### Professional Interface Guidelines
```typescript
// ✅ Standard Spacing - Balanced for professional appearance
<CardContent className="px-6 py-6">  // Main content cards
<CardContent className="px-6 py-6">  // Sidebar and secondary cards
<div className="space-y-6">          // Section spacing
<div className="gap-6">              // Grid gaps

// ✅ Clean Text Patterns - Remove redundant explanatory text
// Prefer descriptive placeholders over separate descriptions
<Textarea placeholder="Describe your book in a few sentences or paragraphs. The more detail you provide, the better your book will be." />
// Instead of placeholder + FormDescription

// ✅ Integrated Field Design - Avoid separate cards for related inputs
interface ExtendedStepProps extends WizardStepProps {
  additionalField?: string
  setAdditionalField?: (value: string) => void
}
// Extend existing components rather than create separate cards
```

### Form Enhancement Patterns
```typescript
// ✅ Smart Prop Spreading for Optional Fields
<CurrentStepComponent
  {...commonProps}
  {...(stepId === 'specific-step' && {
    specialField,
    setSpecialField
  })}
/>

// ✅ Text Content Best Practices
// - Remove "(Optional)" qualifiers from UI text
// - Eliminate redundant descriptions
// - Use descriptive placeholders that include guidance
// - Keep security messages concise: "Your key is not stored and only used for this session."
```

### API Key Integration Standards
```typescript
// ✅ Priority Logic Implementation
// 1. User-provided API key (overrides all)
// 2. Environment variable (.env)
// 3. Error state (no key available)

// Backend validation required:
// - Check key availability before workflow execution
// - Graceful error handling for invalid keys
// - Security: Never log or expose API keys

interface ApiKeyProps {
  openaiApiKey?: string
  setOpenaiApiKey?: (key: string) => void
}

// Conditional rendering pattern
{setOpenaiApiKey && (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <Key className="w-5 h-5 text-muted-foreground" />
      <div className="flex-1">
        <Label htmlFor="openai-key" className="text-sm font-medium">
          OpenAI API Key
        </Label>
        <Input
          id="openai-key"
          type="password"
          placeholder="sk-..."
          value={openaiApiKey}
          onChange={(e) => setOpenaiApiKey(e.target.value)}
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Your key is not stored and only used for this session.
        </p>
      </div>
    </div>
  </div>
)}
```

## Security Requirements

### Enhanced Input Validation with Intelligence
```typescript
// ✅ Validate all inputs with intelligent threat detection
const IntelligentBookPromptSchema = z.object({
  prompt: z.string().min(3).max(1000),
  pdfFile: z.instanceof(File).optional(),
  author: z.string().min(1).max(100),
  adaptivePlan: AdaptivePlanSchema.optional(),
  learningPreferences: UserPreferencesSchema.optional()
});

export async function validateIntelligentBookRequest(input: unknown) {
  const validated = IntelligentBookPromptSchema.parse(input);

  // Additional intelligent validation
  const threatAnalysis = await analyzePotentialThreats(validated);
  if (threatAnalysis.risk > 0.7) {
    throw new SecurityError('High-risk input detected', { threatAnalysis });
  }

  return validated;
}
```

### Secure Agent Communication
```typescript
// ✅ Secure agent message validation and encryption
export async function validateAgentMessage(message: AgentMessage): Promise<void> {
  // Validate message structure
  AgentMessageSchema.parse(message);

  // Verify agent authorization
  await verifyAgentAuthorization(message.from, message.to);

  // Scan for sensitive information
  const sensitivityAnalysis = await analyzeSensitivity(message.content);
  if (sensitivityAnalysis.containsSensitiveData) {
    message.content = await redactSensitiveInformation(message.content);
  }

  // Encrypt if required
  if (message.context.requiresEncryption) {
    message.content = await encryptMessage(message.content);
  }
}
```

## Performance Guidelines

### Intelligent LangGraph Optimization
```typescript
// ✅ Efficient sequential execution with intelligent batching
const processChaptersWithIntelligence = async (
  chapterConfigs: ChapterConfig[],
  state: WorkflowState,
  learningSystem: AgentLearningSystem
) => {
  // Group chapters by complexity and dependencies for optimal processing
  const processingGroups = await learningSystem.optimizeProcessingOrder(chapterConfigs);

  const results = [];
  for (const group of processingGroups) {
    // Process group with intelligent parallelization when safe
    const groupResults = await Promise.all(
      group.map(config => generateChapterWithOptimization(config, state))
    );
    results.push(...groupResults);
  }

  return results;
};

// ❌ Avoid naive sequential execution without intelligence
for (const config of chapterConfigs) {
  await graph.invokeNode(`chapter_${config.number}`, state);
}
```

### Enhanced React Query Optimization with Learning
```typescript
// ✅ Strategic caching with intelligent invalidation
export const useIntelligentChapterProgress = (sessionId: string) => {
  return useQuery({
    queryKey: ['chapters', sessionId],
    queryFn: () => fetchChapterProgressWithLearning(sessionId),
    staleTime: 30 * 1000,        // 30 seconds
    refetchInterval: 5 * 1000,   // 5 second polling
    enabled: !!sessionId,
    // Intelligent cache invalidation based on agent activity
    onSuccess: (data) => {
      if (data.agentActivity?.highActivity) {
        // Reduce cache time during high agent activity
        return { staleTime: 10 * 1000 };
      }
    }
  });
};
```

This enhanced CLAUDE.md specification transforms the Book Agent development standards to support intelligent agentic design with adaptive planning, inter-agent collaboration, dynamic tool selection, and continuous learning capabilities while maintaining excellent code quality and production readiness.