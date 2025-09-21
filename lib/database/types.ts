// Database type definitions for Supabase
// Generated from schema migration: 20250921_001_create_core_tables.sql
// Following CLAUDE.md standards: interface over type, strict typing

import type {
  WorkflowStatus,
  WorkflowStage,
  ChapterStatus,
  BookRequirements,
  BookOutline,
  StyleGuide,
  WorkflowState,
} from '../../types';

/**
 * Database schema type definition for Supabase client
 * Provides full type safety for all database operations
 */
export interface Database {
  public: {
    Tables: {
      book_sessions: {
        Row: BookSessionRow;
        Insert: BookSessionInsert;
        Update: BookSessionUpdate;
      };
      books: {
        Row: BookRow;
        Insert: BookInsert;
        Update: BookUpdate;
      };
      chapters: {
        Row: ChapterRow;
        Insert: ChapterInsert;
        Update: ChapterUpdate;
      };
      workflow_states: {
        Row: WorkflowStateRow;
        Insert: WorkflowStateInsert;
        Update: WorkflowStateUpdate;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      test_rls_policies: {
        Args: Record<string, never>;
        Returns: Array<{
          test_name: string;
          passed: boolean;
          details: string;
        }>;
      };
    };
    Enums: {
      workflow_status: WorkflowStatus;
      workflow_stage: WorkflowStage;
      chapter_status: ChapterStatus;
    };
  };
}

// ============================================================================
// TABLE ROW TYPES (SELECT operations)
// ============================================================================

/**
 * book_sessions table row type
 * Represents the complete structure returned from SELECT operations
 */
export interface BookSessionRow {
  id: string;
  user_id: string | null;
  status: WorkflowStatus;
  current_stage: WorkflowStage;
  requirements: BookRequirements | null;
  created_at: string;
  updated_at: string;
}

/**
 * books table row type
 * Represents the complete book metadata structure
 */
export interface BookRow {
  id: string;
  session_id: string;
  title: string | null;
  author: string | null;
  outline: BookOutline | null;
  style_guide: StyleGuide | null;
  word_count: number | null;
  pdf_url: string | null;
  cover_image_url: string | null;
  created_at: string;
}

/**
 * chapters table row type
 * Represents individual chapter data with parallel generation support
 */
export interface ChapterRow {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content: string | null;
  word_count: number | null;
  status: ChapterStatus;
  dependencies: number[] | null;
  research_sources: string[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * workflow_states table row type
 * Represents checkpoint data for workflow recovery
 */
export interface WorkflowStateRow {
  id: string;
  session_id: string;
  node_name: string;
  state_data: WorkflowState;
  timestamp: string;
}

// ============================================================================
// TABLE INSERT TYPES (INSERT operations)
// ============================================================================

/**
 * book_sessions table insert type
 * Defines required and optional fields for creating new sessions
 */
export interface BookSessionInsert {
  id?: string;
  user_id?: string | null;
  status?: WorkflowStatus;
  current_stage?: WorkflowStage;
  requirements?: any; // Use any for JSONB to avoid type conflicts
  created_at?: string;
  updated_at?: string;
}

/**
 * books table insert type
 * Defines required and optional fields for creating new books
 */
export interface BookInsert {
  id?: string;
  session_id: string;
  title?: string | null;
  author?: string | null;
  outline?: BookOutline | null;
  style_guide?: StyleGuide | null;
  word_count?: number | null;
  pdf_url?: string | null;
  cover_image_url?: string | null;
  created_at?: string;
}

/**
 * chapters table insert type
 * Defines required and optional fields for creating new chapters
 */
export interface ChapterInsert {
  id?: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content?: string | null;
  word_count?: number | null;
  status?: ChapterStatus;
  dependencies?: number[] | null;
  research_sources?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * workflow_states table insert type
 * Defines required and optional fields for creating checkpoints
 */
export interface WorkflowStateInsert {
  id?: string;
  session_id: string;
  node_name: string;
  state_data: WorkflowState;
  timestamp?: string;
}

// ============================================================================
// TABLE UPDATE TYPES (UPDATE operations)
// ============================================================================

/**
 * book_sessions table update type
 * Defines fields that can be updated for existing sessions
 */
export interface BookSessionUpdate {
  user_id?: string | null;
  status?: WorkflowStatus;
  current_stage?: WorkflowStage;
  requirements?: BookRequirements | null;
  updated_at?: string;
}

/**
 * books table update type
 * Defines fields that can be updated for existing books
 */
export interface BookUpdate {
  title?: string | null;
  author?: string | null;
  outline?: BookOutline | null;
  style_guide?: StyleGuide | null;
  word_count?: number | null;
  pdf_url?: string | null;
  cover_image_url?: string | null;
}

/**
 * chapters table update type
 * Defines fields that can be updated for existing chapters
 */
export interface ChapterUpdate {
  title?: string;
  content?: string | null;
  word_count?: number | null;
  status?: ChapterStatus;
  dependencies?: number[] | null;
  research_sources?: string[] | null;
  updated_at?: string;
}

/**
 * workflow_states table update type
 * Defines fields that can be updated for existing workflow states
 */
export interface WorkflowStateUpdate {
  node_name?: string;
  state_data?: WorkflowState;
  timestamp?: string;
}

// ============================================================================
// UTILITY TYPES FOR COMMON QUERY PATTERNS
// ============================================================================

/**
 * Session with related book data
 * Commonly used join result type
 */
export interface SessionWithBook extends BookSessionRow {
  books: BookRow | null;
}

/**
 * Book with all chapters
 * Complete book data including chapter content
 */
export interface BookWithChapters extends BookRow {
  chapters: ChapterRow[];
}

/**
 * Chapter progress summary
 * Aggregated data for progress tracking
 */
export interface ChapterProgress {
  book_id: string;
  total_chapters: number;
  completed_chapters: number;
  total_word_count: number;
  completion_percentage: number;
  chapters_by_status: Record<ChapterStatus, number>;
}

/**
 * Session summary for dashboard
 * Aggregated session data with progress information
 */
export interface SessionSummary {
  session: BookSessionRow;
  book: BookRow | null;
  progress: ChapterProgress | null;
  last_checkpoint: WorkflowStateRow | null;
}

// ============================================================================
// FILTER AND QUERY HELPER TYPES
// ============================================================================

/**
 * Common filter options for book sessions
 */
export interface BookSessionFilters {
  user_id?: string;
  status?: WorkflowStatus | WorkflowStatus[];
  current_stage?: WorkflowStage | WorkflowStage[];
  created_after?: string;
  created_before?: string;
}

/**
 * Common filter options for chapters
 */
export interface ChapterFilters {
  book_id?: string;
  status?: ChapterStatus | ChapterStatus[];
  chapter_numbers?: number[];
  has_dependencies?: boolean;
}

/**
 * Sort options for query results
 */
export interface SortOptions {
  column: string;
  ascending?: boolean;
}

/**
 * Pagination options for query results
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

// ============================================================================
// AGGREGATE AND COMPUTED TYPES
// ============================================================================

/**
 * Book statistics for reporting
 */
export interface BookStatistics {
  total_books: number;
  completed_books: number;
  active_sessions: number;
  average_word_count: number;
  average_chapters: number;
  completion_rate: number;
}

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
  average_session_duration: number;
  average_chapter_generation_time: number;
  success_rate: number;
  error_rate: number;
  active_workflows: number;
}