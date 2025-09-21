// Database module barrel export
// Provides clean import interface for all database functionality

// Core client and utilities
export {
  supabase,
  handleDatabaseError,
  checkDatabaseConnection,
  executeQuery,
  executeBatch,
  createSubscription,
  checkMigrationStatus,
  getCurrentUser,
  createServiceClient,
  testRlsPolicies,
  createBookSession,
} from './supabaseClient';

// Type definitions
export type {
  Database,
  BookSessionRow,
  BookSessionInsert,
  BookSessionUpdate,
  BookRow,
  BookInsert,
  BookUpdate,
  ChapterRow,
  ChapterInsert,
  ChapterUpdate,
  WorkflowStateRow,
  WorkflowStateInsert,
  WorkflowStateUpdate,
  SessionWithBook,
  BookWithChapters,
  ChapterProgress,
  SessionSummary,
  BookSessionFilters,
  ChapterFilters,
  SortOptions,
  PaginationOptions,
  BookStatistics,
  PerformanceMetrics,
} from './types';

// Verification utilities
export { verifyDatabaseSetup, runVerification } from './verify';