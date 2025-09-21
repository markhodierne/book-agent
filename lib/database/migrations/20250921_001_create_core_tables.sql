-- Book Agent Database Schema Migration
-- Creates core tables for workflow orchestration and book generation
-- Following CLAUDE.md conventions: singular nouns, snake_case, descriptive names

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for enum constraints
CREATE TYPE workflow_status AS ENUM ('active', 'completed', 'failed', 'paused');

CREATE TYPE workflow_stage AS ENUM (
  'conversation',
  'outline',
  'chapter_spawning',
  'chapter_generation',
  'consistency_review',
  'quality_review',
  'formatting',
  'user_review',
  'completed',
  'failed'
);

CREATE TYPE chapter_status AS ENUM (
  'pending',
  'researching',
  'writing',
  'completed',
  'needs_revision',
  'failed'
);

-- ============================================================================
-- CORE WORKFLOW TRACKING
-- ============================================================================

/**
 * book_sessions - Core workflow tracking table
 * Manages the overall book creation workflow state and progress
 */
CREATE TABLE book_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status workflow_status NOT NULL DEFAULT 'active',
  current_stage workflow_stage NOT NULL DEFAULT 'conversation',
  requirements JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_book_sessions_user_id ON book_sessions(user_id);
CREATE INDEX idx_book_sessions_status ON book_sessions(status);
CREATE INDEX idx_book_sessions_current_stage ON book_sessions(current_stage);
CREATE INDEX idx_book_sessions_created_at ON book_sessions(created_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_book_sessions_updated_at
  BEFORE UPDATE ON book_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- BOOK CONTENT AND STRUCTURE
-- ============================================================================

/**
 * books - Book content and metadata storage
 * Contains final book information, outline, and generated content URLs
 */
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES book_sessions(id) ON DELETE CASCADE,
  title TEXT NULL,
  author TEXT NULL,
  outline JSONB NULL,
  style_guide JSONB NULL,
  word_count INTEGER NULL CHECK (word_count >= 0),
  pdf_url TEXT NULL,
  cover_image_url TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_books_session_id ON books(session_id);
CREATE INDEX idx_books_word_count ON books(word_count);
CREATE INDEX idx_books_created_at ON books(created_at);

-- Ensure one book per session
CREATE UNIQUE INDEX idx_books_session_id_unique ON books(session_id);

-- ============================================================================
-- INDIVIDUAL CHAPTER MANAGEMENT
-- ============================================================================

/**
 * chapters - Individual chapter content and progress tracking
 * Enables parallel chapter generation with dependency management
 */
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL CHECK (chapter_number > 0),
  title TEXT NOT NULL,
  content TEXT NULL,
  word_count INTEGER NULL CHECK (word_count >= 0),
  status chapter_status NOT NULL DEFAULT 'pending',
  dependencies INTEGER[] NULL DEFAULT '{}',
  research_sources TEXT[] NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_chapters_chapter_number ON chapters(chapter_number);
CREATE INDEX idx_chapters_status ON chapters(status);
CREATE INDEX idx_chapters_word_count ON chapters(word_count);
CREATE INDEX idx_chapters_created_at ON chapters(created_at);

-- Ensure unique chapter numbers per book
CREATE UNIQUE INDEX idx_chapters_book_chapter_unique ON chapters(book_id, chapter_number);

-- Add updated_at trigger for chapters
CREATE TRIGGER update_chapters_updated_at
  BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- WORKFLOW STATE PERSISTENCE
-- ============================================================================

/**
 * workflow_states - Checkpoint system for workflow recovery
 * Stores complete workflow state for resumption after failures
 */
CREATE TABLE workflow_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES book_sessions(id) ON DELETE CASCADE,
  node_name TEXT NOT NULL,
  state_data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_workflow_states_session_id ON workflow_states(session_id);
CREATE INDEX idx_workflow_states_node_name ON workflow_states(node_name);
CREATE INDEX idx_workflow_states_timestamp ON workflow_states(timestamp);

-- Index for finding latest state per session
CREATE INDEX idx_workflow_states_session_timestamp ON workflow_states(session_id, timestamp DESC);

-- ============================================================================
-- CONSTRAINTS AND VALIDATION
-- ============================================================================

-- Ensure word count consistency (book total should match chapter sum)
-- This will be enforced via application logic due to complexity

-- Add check constraints for data integrity
ALTER TABLE book_sessions ADD CONSTRAINT check_requirements_valid
  CHECK (requirements IS NULL OR jsonb_typeof(requirements) = 'object');

ALTER TABLE books ADD CONSTRAINT check_outline_valid
  CHECK (outline IS NULL OR jsonb_typeof(outline) = 'object');

ALTER TABLE books ADD CONSTRAINT check_style_guide_valid
  CHECK (style_guide IS NULL OR jsonb_typeof(style_guide) = 'object');

ALTER TABLE chapters ADD CONSTRAINT check_dependencies_valid
  CHECK (array_length(dependencies, 1) IS NULL OR array_length(dependencies, 1) <= 50);

ALTER TABLE workflow_states ADD CONSTRAINT check_state_data_valid
  CHECK (jsonb_typeof(state_data) = 'object');

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE book_sessions IS 'Core workflow tracking for book generation sessions';
COMMENT ON TABLE books IS 'Book metadata and content structure storage';
COMMENT ON TABLE chapters IS 'Individual chapter content with parallel generation support';
COMMENT ON TABLE workflow_states IS 'Checkpoint system for workflow state persistence and recovery';

COMMENT ON COLUMN book_sessions.requirements IS 'JSONB storage for BookRequirements interface';
COMMENT ON COLUMN books.outline IS 'JSONB storage for BookOutline interface';
COMMENT ON COLUMN books.style_guide IS 'JSONB storage for StyleGuide interface';
COMMENT ON COLUMN chapters.dependencies IS 'Array of chapter numbers this chapter depends on';
COMMENT ON COLUMN chapters.research_sources IS 'Array of URLs used for research';
COMMENT ON COLUMN workflow_states.state_data IS 'Complete WorkflowState for checkpoint recovery';