# Database Module

This module provides the complete database layer for the Book Agent application, including Supabase client configuration, type definitions, and Row Level Security (RLS) policies.

## Files Overview

- **`migrations/`** - SQL migration files for database schema
- **`supabaseClient.ts`** - Configured Supabase client with utilities
- **`types.ts`** - TypeScript type definitions for all tables
- **`verify.ts`** - Database connection and setup verification
- **`index.ts`** - Barrel export for clean imports

## Key Features

### 🔒 Row Level Security (RLS)
- **Authenticated Users**: Can only access their own data
- **Anonymous Users**: Can create and access anonymous sessions
- **Service Role**: Full access for backend operations
- **Data Isolation**: Automatic enforcement at database level

### 📊 Schema
- **`book_sessions`** - Workflow tracking and user sessions
- **`books`** - Book metadata, outline, and style guide
- **`chapters`** - Individual chapter content with parallel generation support
- **`workflow_states`** - Checkpoint system for error recovery

### 🛠️ Utilities
- Type-safe database operations
- Connection health checking
- Real-time subscription management
- Error handling and retry logic
- RLS policy testing

## Setup Instructions

1. **Environment Variables**:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   ```

2. **Run Migrations**:
   ```bash
   # Option 1: Via Supabase CLI (recommended)
   supabase db push

   # Option 2: Execute SQL files manually in Supabase Dashboard
   # Run files in order: 001_create_core_tables.sql, then 002_enable_rls_policies.sql
   ```

3. **Verify Setup**:
   ```typescript
   import { verifyDatabaseSetup } from '@/lib/database';

   const result = await verifyDatabaseSetup();
   console.log('Database setup:', result.success ? 'OK' : 'Failed');
   ```

## Usage Examples

### Basic Operations
```typescript
import { supabase, createBookSession } from '@/lib/database';

// Create a new book session (works for authenticated and anonymous users)
const { sessionId } = await createBookSession({
  topic: 'AI Development',
  audience: { expertiseLevel: 'intermediate' }
});

// Query user's sessions (RLS automatically filters)
const { data: sessions } = await supabase
  .from('book_sessions')
  .select('*');
```

### Service Operations
```typescript
import { createServiceClient } from '@/lib/database';

// For backend operations that need to bypass RLS
const serviceClient = createServiceClient();

const { data: allSessions } = await serviceClient
  .from('book_sessions')
  .select('*'); // Access all sessions regardless of user
```

### Real-time Updates
```typescript
import { createSubscription } from '@/lib/database';

// Listen for chapter updates
const subscription = createSubscription(
  'chapters',
  `book_id=eq.${bookId}`,
  (payload) => {
    console.log('Chapter updated:', payload);
  }
);

// Cleanup
subscription.unsubscribe();
```

## Security Model

### Anonymous Users
- Can create sessions with `user_id = NULL`
- Can only access their own anonymous sessions
- Safe to use public anon key

### Authenticated Users
- Sessions linked to `auth.uid()`
- Can only access their own data
- Automatic user context from Supabase Auth

### Service Role
- Bypasses all RLS policies
- Used for admin operations and LangGraph workflows
- Never exposed to client

## Performance Optimizations

- **Indexes**: Optimized for RLS policy performance
- **Connection Pooling**: Configured for serverless environments
- **Type Safety**: Full TypeScript integration
- **Batch Operations**: Parallel execution support

## Migration History

- **001_create_core_tables.sql**: Initial schema with constraints and indexes
- **002_enable_rls_policies.sql**: RLS policies and security configuration

## Testing

```typescript
import { testRlsPolicies } from '@/lib/database';

const result = await testRlsPolicies();
result.tests.forEach(test => {
  console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
});
```