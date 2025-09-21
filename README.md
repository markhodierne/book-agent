# Book Agent - AI-Powered Book Generation Platform

An AI-powered system that generates comprehensive books (30,000+ words) from minimal user prompts using LangGraph orchestration and parallel chapter generation.

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm (required - do not use npm/yarn)
- Supabase account for database
- OpenAI API key (GPT-4 mini access)
- Firecrawl API key for web research

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd book-agent
pnpm install
```

2. **Environment setup:**
```bash
cp .env.local.example .env.local
# Edit .env.local with your API keys
```

3. **Database setup:**
- Create Supabase project
- Run migrations from `lib/database/migrations/` in Supabase SQL Editor
- Update `.env.local` with your Supabase credentials

4. **Start development:**
```bash
pnpm dev
```

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with Turbopack |
| `pnpm build` | Build production app |
| `pnpm start` | Start production server |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `pnpm lint` | Run ESLint and type checking |

## Architecture

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **AI Orchestration**: LangGraph (NOT OpenAI Agents SDK)
- **AI Models**: OpenAI GPT-4 mini + DALL-E 3
- **Database**: Supabase (PostgreSQL + real-time)
- **State Management**: Zustand + React Query
- **UI**: shadcn/ui + Tailwind CSS v4
- **PDF Generation**: React-PDF (@react-pdf/renderer)
- **Web Research**: Firecrawl

### Layered Architecture
```
presentation/ → service/ → data/
     ↓           ↓         ↓
    UI       Agents   Supabase
```

### Key Principles
1. **Tool-Centric Design**: All AI capabilities as discrete, reusable tools
2. **Dynamic Parallel Execution**: Single LangGraph spawning N parallel chapter nodes
3. **Shared State Coordination**: Supabase for real-time progress and state management

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
├── errors/            # Error handling infrastructure
├── config/            # Environment validation
__tests__/             # Unit tests (Vitest)
├── tools/             # Tool unit tests
├── agents/            # Workflow tests
├── components/        # React component tests
├── fixtures/          # Test data and utilities
playwright-tests/      # E2E tests (Playwright)
```

## Development Status

### ✅ Completed (Tasks 1-7)
1. **Environment Setup** - Dependencies, TypeScript, ESLint, Prettier
2. **Project Structure** - Layered architecture implementation
3. **Environment Configuration** - Validation system with fail-fast startup
4. **Database Schema** - Live Supabase with RLS security policies
5. **Type Definitions** - 725-line comprehensive type system
6. **Error Handling** - Production-ready infrastructure with retry logic
7. **Testing Infrastructure** - Vitest + Playwright with sample tests

### 🚧 Next Phase (Tasks 8-12)
8. **AI Service Integration** - OpenAI GPT-4 mini + DALL-E 3 clients
9. **Tool Framework** - PDF extraction, web research, content generation
10. **LangGraph Workflows** - Book generation orchestration
11. **UI Components** - Wizard, chat interface, progress dashboard
12. **API Integration** - Workflow endpoints and real-time updates

## Testing

### Unit Tests (Vitest)
- **Tools**: PDF extraction, web research, content generation
- **Agents**: LangGraph workflows and error recovery
- **Components**: React component rendering and interaction

### E2E Tests (Playwright)
- **Book Creation Flow**: Complete workflow from prompt to PDF
- **Progress Monitoring**: Real-time updates via Supabase subscriptions
- **Multi-browser Support**: Chrome, Firefox, Safari, Mobile

### Run Tests
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# With coverage
pnpm test --coverage
```

## Configuration

### Required Environment Variables
```bash
# OpenAI (GPT-4 mini + DALL-E 3)
OPENAI_API_KEY=sk-...

# Supabase (Database + Real-time)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Firecrawl (Web Research)
FIRECRAWL_API_KEY=fc-...
```

### Database Setup
1. Create new Supabase project
2. Go to SQL Editor in Supabase Dashboard
3. Run migration files in order:
   - `lib/database/migrations/20250921_001_create_core_tables.sql`
   - `lib/database/migrations/20250921_002_enable_rls_policies.sql`
4. Verify with test script: `npx tsx scripts/test-final.ts`

## Production Deployment

### Build Process
```bash
pnpm build
pnpm start
```

### Environment Requirements
- Node.js 18+ runtime
- All environment variables configured
- Supabase database with migrations applied
- Valid API keys for OpenAI and Firecrawl

## Contributing

### Code Standards
- **Package Manager**: pnpm only
- **TypeScript**: Strict mode with enhanced checking
- **Imports**: Organized by external → internal → components → types
- **File Naming**: PascalCase components, camelCase utilities
- **Testing**: Required for all new features

### Development Workflow
1. Create feature branch
2. Implement with tests
3. Run `pnpm lint` and `pnpm test`
4. Submit PR with comprehensive description

## Documentation

- **[FUNCTIONAL.md](./FUNCTIONAL.md)** - Complete functional specification
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture details
- **[CLAUDE.md](./CLAUDE.md)** - Development standards and guidelines
- **[HISTORY.md](./HISTORY.md)** - Development progress and decisions

## License

[License information to be added]