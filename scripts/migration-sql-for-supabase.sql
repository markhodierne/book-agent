-- Essential DDL statements for Supabase SQL Editor
-- Run these statements manually in the Supabase dashboard SQL Editor

-- Add columns to book_sessions table
ALTER TABLE book_sessions
ADD COLUMN IF NOT EXISTS adaptive_plan JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS collaboration_summary JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS learning_insights JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS planning_context JSONB DEFAULT '{}';

-- Add workflow stage enum value for Planning Node
DO $$
BEGIN
    -- Add planning stage if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'planning' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'workflow_stage')) THEN
        ALTER TYPE workflow_stage ADD VALUE 'planning';
    END IF;
END $$;

-- Update existing records to have default values
UPDATE book_sessions
SET
  adaptive_plan = COALESCE(adaptive_plan, '{}'),
  collaboration_summary = COALESCE(collaboration_summary, '{}'),
  learning_insights = COALESCE(learning_insights, '{}'),
  planning_context = COALESCE(planning_context, '{}')
WHERE
  adaptive_plan IS NULL
  OR collaboration_summary IS NULL
  OR learning_insights IS NULL
  OR planning_context IS NULL;

-- Add validation constraints
ALTER TABLE book_sessions
ADD CONSTRAINT IF NOT EXISTS check_adaptive_plan_valid
  CHECK (adaptive_plan IS NULL OR jsonb_typeof(adaptive_plan) = 'object');

ALTER TABLE book_sessions
ADD CONSTRAINT IF NOT EXISTS check_collaboration_summary_valid
  CHECK (collaboration_summary IS NULL OR jsonb_typeof(collaboration_summary) = 'object');

ALTER TABLE book_sessions
ADD CONSTRAINT IF NOT EXISTS check_learning_insights_valid
  CHECK (learning_insights IS NULL OR jsonb_typeof(learning_insights) = 'object');

ALTER TABLE book_sessions
ADD CONSTRAINT IF NOT EXISTS check_planning_context_valid
  CHECK (planning_context IS NULL OR jsonb_typeof(planning_context) = 'object');