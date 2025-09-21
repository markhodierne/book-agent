# Book Agent - Development Task Breakdown

## Task Sequence Overview

This project follows an MVP-first approach to deliver a working demonstration early, then progressively enhance functionality while maintaining a working application. The roadmap is split into two main sections:

1. **✅ Slim MVP Foundation (Tasks 1-24)** - Core functionality for prompt → outline → chapters → PDF
2. **🔄 Extended Roadmap (Tasks 25-45)** - Advanced features, persistence, polish, and production readiness

## ✅ Slim MVP Foundation (Tasks 1-24)

### 1. Environment Setup (Node.js, TypeScript, Next.js, project structure)
**Description**: Install and configure core dependencies for the application
**Deliverables**:
- Update `package.json` with all required dependencies
- Configure TypeScript strict mode settings
- Set up ESLint and Prettier for code standards
**Dependencies**: None
**Definition of Done**: `pnpm install` completes successfully, TypeScript compilation passes

### 2. Project Structure (organize src, agents, tools, ui folders)
**Description**: Create the layered directory structure following architecture standards
**Deliverables**:
- Create all directories: `app/`, `components/`, `lib/` with subdirectories
- Add `.gitkeep` files for empty directories
- Verify structure matches CLAUDE.md specifications
**Dependencies**: Task 1
**Definition of Done**: All directories exist as specified in architecture, `git status` shows clean structure

### 3. Env Config (API keys, Vercel config)
**Description**: Set up environment variable validation and configuration
**Deliverables**:
- Create `.env.local.example` with required variables
- Implement environment validation utility in `lib/config/`
- Add startup environment check
**Dependencies**: Task 2
**Definition of Done**: Environment validation works, missing variables throw clear errors

### 4. Core TypeScript Types (book, chapter, agent inputs/outputs)
**Description**: Create core TypeScript interfaces and types for the application
**Deliverables**:
- `types/index.ts` with all core interfaces (WorkflowState, ChapterConfig, etc.)
- Type definitions for tools, agents, and UI components
- Export barrel from types directory
**Dependencies**: Task 2, 3
**Definition of Done**: All types compile without errors, types are properly exported and importable

### 5. Database Schema Design (basic Supabase setup, though persistence can wait until post-MVP)
**Description**: Create Supabase database schema and client configuration
**Deliverables**:
- SQL migration files for all tables (books, chapters, book_sessions, workflow_states)
- Supabase client configuration in `lib/database/`
- Database types generation
**Dependencies**: Task 3, 4
**Definition of Done**: Database schema deployed, types generated, client connects successfully

### 6. Supabase Project Setup (initialize database, connect project)
**Description**: Initialize Supabase project and establish connection
**Deliverables**:
- Create Supabase project
- Configure database connection
- Test database connectivity
**Dependencies**: Task 5
**Definition of Done**: Supabase project connected, basic queries work

### 7. Testing Infrastructure (Jest/Playwright — only minimal placeholder for MVP)
**Description**: Configure testing framework and establish testing patterns
**Deliverables**:
- Vitest configuration for unit tests
- Playwright setup for E2E tests
- Test utilities and fixtures directory structure
- Sample test files for each layer
**Dependencies**: Task 1, 2
**Definition of Done**: `pnpm test` and `pnpm test:e2e` commands work, sample tests pass

### 8. Logging & Monitoring Basics (console.log + error traces, real observability later)
**Description**: Implement application logging and basic monitoring
**Deliverables**:
- Structured logging utility
- Performance metrics collection setup
- Development vs production logging configuration
**Dependencies**: Task 4
**Definition of Done**: Logs are structured and readable, metrics can be collected

### 9. Tool Framework for Subagents (base class/interfaces for tools)
**Description**: Implement the generic tool creation framework
**Deliverables**:
- `lib/tools/createTool.ts` with generic tool interface
- Tool registry and management system
- Base tool error handling and retry logic
**Dependencies**: Task 4, 8
**Definition of Done**: Tool framework allows creating typed, retryable tools with consistent interface

### 10. PDF Extract Tool (parse uploaded PDFs → text, optional for MVP)
**Description**: Implement PDF text extraction functionality
**Deliverables**:
- `pdfExtractTool` using pdf-parse library
- File validation and security checks
- Unit tests for various PDF formats
**Dependencies**: Task 9
**Definition of Done**: Tool extracts text from PDFs, handles errors gracefully, tests pass

### 11. Chapter Write Tool (generate chapter text from outline)
**Description**: Implement AI-powered chapter generation tool
**Deliverables**:
- `chapterWriteTool` with OpenAI GPT-5 integration
- Style guide and word count adherence
- Content validation and quality checks
**Dependencies**: Task 9
**Definition of Done**: Tool generates chapters matching specifications, follows style consistently

### 12. Implement Base LangGraph Structure (workflow orchestration)
**Description**: Set up LangGraph workflow foundation
**Deliverables**:
- LangGraph StateGraph configuration
- Workflow state management
- Node execution framework
**Dependencies**: Task 4, 11
**Definition of Done**: Basic LangGraph workflow executes, state passes between nodes correctly

### 13. Conversation Node (collect requirements, prompt, audience, style)
**Description**: Create the initial user conversation and requirements gathering node
**Deliverables**:
- Conversation node with guided questioning
- PDF content integration
- Requirements validation and structuring
**Dependencies**: Task 12, Task 10
**Definition of Done**: Node collects complete requirements, integrates PDF content, validates inputs

### 14. Outline Generation Node (produce title + outline + chapter breakdown)
**Description**: Implement book outline generation node
**Deliverables**:
- Outline generation with chapter planning
- Word count calculation and distribution
- Chapter dependency mapping
**Dependencies**: Task 13
**Definition of Done**: Node generates complete, valid book outlines with proper chapter structure

### 15. Chapter Spawning Node (spin up chapter agents)
**Description**: Create dynamic parallel chapter node generation
**Deliverables**:
- Dynamic node creation based on outline
- Parallel execution coordination
- Chapter dependency resolution
**Dependencies**: Task 14
**Definition of Done**: Node creates N parallel chapter nodes, manages dependencies correctly

### 16. Chapter Generation Node (connect to Chapter write tool)
**Description**: Implement the chapter generation node template
**Deliverables**:
- Chapter node factory function
- Research integration and content generation
- Progress tracking and error handling
**Dependencies**: Task 15
**Definition of Done**: Chapter nodes generate content in parallel, maintain consistency

### 17. Formatting Node (combine chapters → minimal PDF export)
**Description**: Implement PDF generation and formatting node
**Deliverables**:
- React-PDF integration for book layout
- Professional typography and styling
- Table of contents and page numbering
**Dependencies**: Task 16
**Definition of Done**: Node generates professional PDF with correct formatting and structure

### 18. Set Up UI Library (shadcn/ui, or fallback components if faster)
**Description**: Install and configure shadcn/ui component library
**Deliverables**:
- shadcn/ui installation and configuration
- Custom theme setup (New York style, neutral colors)
- Base component customizations
**Dependencies**: Task 1
**Definition of Done**: Component library installed, theme applied, components render correctly

### 19. Wizard Page for User Prompts (basic form for entering prompt)
**Description**: Create the multi-step wizard framework for book creation
**Deliverables**:
- Wizard container component
- Step navigation and validation
- Progress indicator and step management
**Dependencies**: Task 18, Task 4
**Definition of Done**: Wizard navigates between steps correctly, validates inputs appropriately

### 20. Requirements Gathering UI (author name, audience, style)
**Description**: Build the conversation interface for Stage 1
**Deliverables**:
- Chat interface for AI conversation
- File upload component for PDFs
- Requirements review and confirmation
**Dependencies**: Task 19
**Definition of Done**: Users can have natural conversations, upload files, review requirements

### 21. Outline Review UI (simple approve/reject outline step)
**Description**: Create UI for outline review and approval
**Deliverables**:
- Outline display and editing interface
- Chapter structure visualization
- Title selection and finalization
**Dependencies**: Task 20
**Definition of Done**: Users can review, modify, and approve book outlines intuitively

### 22. PDF Download UI (link/button to fetch completed PDF, skip preview)
**Description**: Implement PDF download functionality
**Deliverables**:
- Download functionality
- Basic completion notification
- Error handling for failed generations
**Dependencies**: Task 21
**Definition of Done**: Users can download generated PDFs reliably

### 23. API Route Implementation (Next.js route to run the agent workflow)
**Description**: Create Next.js API routes for workflow execution
**Deliverables**:
- `/api/workflow` routes for LangGraph execution
- File upload endpoints
- Basic authentication and rate limiting
**Dependencies**: Task 12, Task 6
**Definition of Done**: API routes handle all workflow operations securely and efficiently

### 24. End-to-End Workflow Test (smoke test: prompt → outline → chapters → PDF)
**Description**: Test complete book generation workflow from start to finish
**Deliverables**:
- E2E test suites for all user journeys
- Basic performance testing
- Error recovery testing
**Dependencies**: All previous MVP tasks
**Definition of Done**: Complete workflows execute successfully, meet basic performance requirements

## 🔄 Extended Roadmap (Post-MVP) (Tasks 25-45)

### Advanced Tools (Tasks 25-29)

### 25. Web Research Tool (Firecrawl integration for chapter research)
**Description**: Implement Firecrawl integration for web research
**Deliverables**:
- `webResearchTool` with Firecrawl API integration
- Rate limiting and quota management
- Content quality filtering
**Dependencies**: Task 9
**Definition of Done**: Tool fetches and processes web content, respects rate limits, returns clean text

### 26. Supabase State Tool (persistent agent state management)
**Description**: Create tool for workflow state persistence
**Deliverables**:
- `supabaseStateTool` for saving/loading workflow state
- Checkpoint creation and recovery logic
- State compression and optimization
**Dependencies**: Task 5, 9
**Definition of Done**: Tool saves and restores workflow state reliably, handles large state objects

### 27. Style Generator Tool (offer style samples)
**Description**: Create tool for generating writing style samples
**Deliverables**:
- `styleGeneratorTool` that creates multiple style options
- Content-appropriate style variation
- Sample formatting and presentation
**Dependencies**: Task 11
**Definition of Done**: Tool generates diverse, appropriate style samples for user selection

### 28. Cover Design Tool (AI image gen for front/back cover)
**Description**: Implement DALL-E 3 integration for book cover generation
**Deliverables**:
- `coverDesignTool` with DALL-E 3 API integration
- Front and back cover template system
- Image optimization and formatting
**Dependencies**: Task 9
**Definition of Done**: Tool generates professional book covers, handles API failures gracefully

### 29. Integration Testing for Tools (ensure all tools work together)
**Description**: Test all tools working together and handle edge cases
**Deliverables**:
- Integration tests for tool interactions
- Error scenario testing
- Performance benchmarking
**Dependencies**: Tasks 25-28
**Definition of Done**: All tools work together reliably, edge cases handled, performance acceptable

### Workflow Enhancements (Tasks 30-32)

### 30. Review and Quality-Check Nodes (consistency, correctness, flow, spelling)
**Description**: Create consistency and quality review nodes
**Deliverables**:
- Consistency review node for terminology and style
- Quality review node for accuracy and completeness
- Revision task generation and application
**Dependencies**: Task 16
**Definition of Done**: Review nodes identify issues accurately, generate actionable revision tasks

### 31. User Review Loop (support iterative edits, re-writes by agents)
**Description**: Create user feedback and revision loop node
**Deliverables**:
- User feedback collection interface
- Revision application logic
- Final approval and completion handling
**Dependencies**: Task 17
**Definition of Done**: Node handles user feedback, applies revisions, manages completion workflow

### 32. Error Handling Infrastructure
**Description**: Implement comprehensive error handling and retry logic
**Deliverables**:
- Custom error classes (ToolError, DatabaseError, WorkflowError)
- Retry utility with exponential backoff
- Error logging and monitoring setup
**Dependencies**: Task 4
**Definition of Done**: Error classes work correctly, retry logic handles failures gracefully

### State & Persistence (Tasks 33-38)

### 33. Define Supabase Schema (sessions, chapters, books)
**Description**: Expand database schema for full persistence
**Deliverables**:
- Extended SQL migration files
- Relationship definitions
- Indexing optimization
**Dependencies**: Task 5
**Definition of Done**: Full schema supports all application features

### 34. Implement Supabase Integration (persist book state)
**Description**: Implement database access patterns and operations
**Deliverables**:
- CRUD operations for all entities
- Transaction management
- Query optimization
**Dependencies**: Task 33, Task 26
**Definition of Done**: Database operations are efficient, transactions handle errors correctly

### 35. Session Management (resume/restore sessions)
**Description**: Implement robust state persistence and workflow recovery
**Deliverables**:
- Automatic checkpoint creation
- Recovery from failures
- State compression and cleanup
**Dependencies**: Task 34
**Definition of Done**: Workflows recover successfully from any interruption

### 36. Progress Persistence (track progress in DB)
**Description**: Implement real-time progress tracking
**Deliverables**:
- Progress state management
- Checkpoint coordination
- Recovery mechanisms
**Dependencies**: Task 35
**Definition of Done**: Progress persists across sessions and failures

### 37. Book Storage (save final PDFs + metadata)
**Description**: Implement book storage and metadata management
**Deliverables**:
- PDF storage system
- Metadata tracking
- Version management
**Dependencies**: Task 36
**Definition of Done**: Books stored securely with complete metadata

### 38. Real-time Updates via Supabase (live progress tracking)
**Description**: Implement Supabase real-time features for live progress updates
**Deliverables**:
- Chapter progress subscriptions
- Workflow status updates
- Connection management
**Dependencies**: Task 37
**Definition of Done**: Real-time updates work reliably, connections handle network issues

### UI Enhancements (Tasks 39-41)

### 39. Progress Dashboard (chapter progress indicators, timeline)
**Description**: Build real-time progress monitoring dashboard
**Deliverables**:
- Chapter generation progress display
- Live status updates
- Error handling and retry options
**Dependencies**: Task 38, Task 22
**Definition of Done**: Dashboard shows accurate progress, updates in real-time, handles errors

### 40. Feedback and Revision Interface (user edits + request revisions)
**Description**: Create interface for collecting user feedback and managing revisions
**Deliverables**:
- Feedback collection forms
- Revision request management
- Progress tracking for revisions
**Dependencies**: Task 39
**Definition of Done**: Users can provide feedback easily, track revision progress

### 41. UI Polish (styling, animations, responsive design)
**Description**: Polish UI components and add advanced features
**Deliverables**:
- Consistent styling and branding
- Loading states and animations
- Responsive design optimization
- Accessibility improvements
**Dependencies**: Task 40
**Definition of Done**: UI is polished, accessible, and provides excellent user experience

### Production & Ops (Tasks 42-45)

### 42. Security Hardening (auth, rate limits, input sanitization)
**Description**: Implement comprehensive security measures
**Deliverables**:
- Input validation and sanitization
- File upload security scanning
- API rate limiting and authentication
- Environment variable protection
**Dependencies**: Task 23
**Definition of Done**: Application passes security audit, handles malicious inputs safely

### 43. Performance Optimization (parallel chapter writing, caching)
**Description**: Optimize application performance for production
**Deliverables**:
- Bundle optimization and code splitting
- Database query optimization
- Caching strategy implementation
- Memory usage optimization
**Dependencies**: Task 24, 42
**Definition of Done**: Application meets performance targets, loads quickly

### 44. Vercel Deployment (staging + production)
**Description**: Set up production deployment configuration
**Deliverables**:
- Vercel deployment configuration
- Environment variable management
- Monitoring and logging setup
- Error tracking integration
**Dependencies**: Task 43
**Definition of Done**: Application deploys successfully to production, monitoring works

### 45. Domain & SSL Setup (custom domain, HTTPS) + Monitoring & Alerting (error monitoring, analytics, uptime alerts)
**Description**: Complete production setup with monitoring
**Deliverables**:
- Custom domain configuration
- SSL certificate setup
- Comprehensive monitoring
- Analytics and alerting
**Dependencies**: Task 44
**Definition of Done**: Production application is fully monitored and accessible via custom domain

## ⚡ How to Use This Roadmap

**Tasks 1–24 = MVP** → you'll have a working system that can take a prompt, gather requirements, generate an outline, write chapters, and export a PDF with a simple UI.

**Tasks 25–45 = Extended** → progressively add depth, persistence, UI polish, and production readiness.

## Quick Reference: MVP Task Dependencies

```
MVP Foundation (1-24):
├── 1 → 2 → 3,4
├── 2,3 → 4 → 5 → 6
├── 1,2 → 7
├── 4 → 8 → 9 → 10,11
├── 4,11 → 12 → 13 → 14 → 15 → 16 → 17
├── 1 → 18 → 19 → 20 → 21 → 22
├── 12,6 → 23
└── All MVP → 24

Extended Roadmap (25-45):
├── Tools: 9 → 25,26,27,28 → 29
├── Workflow: 16,17 → 30,31; 4 → 32
├── State: 5 → 33 → 34 → 35 → 36 → 37 → 38
├── UI: 38,22 → 39 → 40 → 41
└── Production: 23 → 42 → 43 → 44 → 45
```

## Development Guidelines

1. **MVP First**: Complete tasks 1-24 to get a working demonstration
2. **Work Sequentially**: Complete tasks in numerical order to maintain dependencies
3. **Test Early**: Run tests after completing each task to catch issues early
4. **Commit Often**: Commit after each completed task with descriptive messages
5. **Reference Standards**: Always check CLAUDE.md before implementing any code
6. **Validate**: Ensure each task's "Definition of Done" is met before proceeding

## Estimated Timeline

### MVP Timeline (Tasks 1-24)
- **Environment & Setup (1-8)**: 3-4 hours
- **Core Tools (9-11)**: 2-3 hours
- **LangGraph Workflow (12-17)**: 4-6 hours
- **UI Foundation (18-22)**: 3-4 hours
- **API & Testing (23-24)**: 2-3 hours

**Total MVP Time**: 14-20 hours

### Extended Features (Tasks 25-45)
- **Advanced Tools (25-29)**: 4-6 hours
- **Workflow Enhancements (30-32)**: 3-4 hours
- **State & Persistence (33-38)**: 6-8 hours
- **UI Enhancements (39-41)**: 3-4 hours
- **Production & Ops (42-45)**: 4-6 hours

**Total Extended Time**: 20-28 hours

**Complete Application**: 34-48 hours

This MVP-first approach ensures you can demonstrate a working book generation system early, then systematically enhance it while maintaining functionality throughout development.