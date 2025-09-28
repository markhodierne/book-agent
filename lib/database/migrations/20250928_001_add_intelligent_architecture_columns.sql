-- Migration: Add Intelligent Agentic Architecture Support
-- Adds columns required for LangGraph workflow, adaptive planning,
-- inter-agent collaboration, and continuous learning
-- Date: 2025-09-28

-- ============================================================================
-- INTELLIGENT WORKFLOW ENHANCEMENTS
-- ============================================================================

-- Add adaptive planning support to book_sessions
ALTER TABLE book_sessions
ADD COLUMN adaptive_plan JSONB NULL DEFAULT '{}',
ADD COLUMN collaboration_summary JSONB NULL DEFAULT '{}',
ADD COLUMN learning_insights JSONB NULL DEFAULT '{}',
ADD COLUMN planning_context JSONB NULL DEFAULT '{}';

-- Add workflow stage enum values for Planning Node (missing from original)
ALTER TYPE workflow_stage ADD VALUE IF NOT EXISTS 'planning';

-- Update default current_stage to 'planning' since that's our new Stage 0
ALTER TABLE book_sessions
ALTER COLUMN current_stage SET DEFAULT 'planning';

-- ============================================================================
-- ENHANCED WORKFLOW STATE TRACKING
-- ============================================================================

-- Add metadata columns to workflow_states for better tracking
ALTER TABLE workflow_states
ADD COLUMN execution_metadata JSONB NULL DEFAULT '{}',
ADD COLUMN agent_name TEXT NULL,
ADD COLUMN confidence_score DECIMAL(3,2) NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
ADD COLUMN reasoning TEXT[] NULL DEFAULT '{}',
ADD COLUMN fallback_used BOOLEAN NULL DEFAULT FALSE;

-- ============================================================================
-- INTER-AGENT COLLABORATION TRACKING
-- ============================================================================

-- Create table for agent communication logs
CREATE TABLE agent_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES book_sessions(id) ON DELETE CASCADE,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('question', 'feedback', 'coordination', 'clarification', 'problem_solving')),
  content TEXT NOT NULL,
  context JSONB NULL DEFAULT '{}',
  requires_response BOOLEAN NOT NULL DEFAULT FALSE,
  response_received BOOLEAN NOT NULL DEFAULT FALSE,
  response_content TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE NULL
);

-- Add indexes for agent communications
CREATE INDEX idx_agent_communications_session_id ON agent_communications(session_id);
CREATE INDEX idx_agent_communications_from_agent ON agent_communications(from_agent);
CREATE INDEX idx_agent_communications_to_agent ON agent_communications(to_agent);
CREATE INDEX idx_agent_communications_type ON agent_communications(message_type);
CREATE INDEX idx_agent_communications_created_at ON agent_communications(created_at);
CREATE INDEX idx_agent_communications_requires_response ON agent_communications(requires_response) WHERE requires_response = TRUE;

-- ============================================================================
-- LEARNING SYSTEM SUPPORT
-- ============================================================================

-- Create table for learning experiences and performance tracking
CREATE TABLE learning_experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES book_sessions(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}',
  execution_result JSONB NOT NULL DEFAULT '{}',
  performance_metrics JSONB NULL DEFAULT '{}',
  success BOOLEAN NOT NULL,
  error_details TEXT NULL,
  learning_metadata JSONB NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for learning experiences
CREATE INDEX idx_learning_experiences_session_id ON learning_experiences(session_id);
CREATE INDEX idx_learning_experiences_agent_name ON learning_experiences(agent_name);
CREATE INDEX idx_learning_experiences_task_type ON learning_experiences(task_type);
CREATE INDEX idx_learning_experiences_success ON learning_experiences(success);
CREATE INDEX idx_learning_experiences_created_at ON learning_experiences(created_at);
CREATE INDEX idx_learning_experiences_agent_task ON learning_experiences(agent_name, task_type);

-- ============================================================================
-- ADAPTIVE TOOL ORCHESTRATION
-- ============================================================================

-- Create table for tool usage tracking and optimization
CREATE TABLE tool_usage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES book_sessions(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  invocation_context JSONB NOT NULL DEFAULT '{}',
  execution_time_ms INTEGER NOT NULL CHECK (execution_time_ms >= 0),
  success BOOLEAN NOT NULL,
  error_type TEXT NULL,
  parameters_used JSONB NULL DEFAULT '{}',
  performance_score DECIMAL(3,2) NULL CHECK (performance_score >= 0 AND performance_score <= 1),
  optimization_suggestions JSONB NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for tool analytics
CREATE INDEX idx_tool_usage_analytics_session_id ON tool_usage_analytics(session_id);
CREATE INDEX idx_tool_usage_analytics_tool_name ON tool_usage_analytics(tool_name);
CREATE INDEX idx_tool_usage_analytics_success ON tool_usage_analytics(success);
CREATE INDEX idx_tool_usage_analytics_execution_time ON tool_usage_analytics(execution_time_ms);
CREATE INDEX idx_tool_usage_analytics_created_at ON tool_usage_analytics(created_at);
CREATE INDEX idx_tool_usage_analytics_tool_success ON tool_usage_analytics(tool_name, success);

-- ============================================================================
-- VALIDATION CONSTRAINTS
-- ============================================================================

-- Add validation constraints for new JSONB columns
ALTER TABLE book_sessions ADD CONSTRAINT check_adaptive_plan_valid
  CHECK (adaptive_plan IS NULL OR jsonb_typeof(adaptive_plan) = 'object');

ALTER TABLE book_sessions ADD CONSTRAINT check_collaboration_summary_valid
  CHECK (collaboration_summary IS NULL OR jsonb_typeof(collaboration_summary) = 'object');

ALTER TABLE book_sessions ADD CONSTRAINT check_learning_insights_valid
  CHECK (learning_insights IS NULL OR jsonb_typeof(learning_insights) = 'object');

ALTER TABLE book_sessions ADD CONSTRAINT check_planning_context_valid
  CHECK (planning_context IS NULL OR jsonb_typeof(planning_context) = 'object');

ALTER TABLE workflow_states ADD CONSTRAINT check_execution_metadata_valid
  CHECK (execution_metadata IS NULL OR jsonb_typeof(execution_metadata) = 'object');

ALTER TABLE agent_communications ADD CONSTRAINT check_context_valid
  CHECK (context IS NULL OR jsonb_typeof(context) = 'object');

ALTER TABLE learning_experiences ADD CONSTRAINT check_context_valid
  CHECK (jsonb_typeof(context) = 'object');

ALTER TABLE learning_experiences ADD CONSTRAINT check_execution_result_valid
  CHECK (jsonb_typeof(execution_result) = 'object');

ALTER TABLE tool_usage_analytics ADD CONSTRAINT check_invocation_context_valid
  CHECK (jsonb_typeof(invocation_context) = 'object');

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN book_sessions.adaptive_plan IS 'JSONB storage for adaptive planning strategy and complexity analysis';
COMMENT ON COLUMN book_sessions.collaboration_summary IS 'JSONB storage for inter-agent collaboration tracking and results';
COMMENT ON COLUMN book_sessions.learning_insights IS 'JSONB storage for continuous learning system insights and improvements';
COMMENT ON COLUMN book_sessions.planning_context IS 'JSONB storage for planning node analysis results and strategy decisions';

COMMENT ON TABLE agent_communications IS 'Inter-agent communication log for collaborative problem-solving';
COMMENT ON TABLE learning_experiences IS 'Learning system tracking for continuous improvement and optimization';
COMMENT ON TABLE tool_usage_analytics IS 'Tool performance analytics for adaptive tool orchestration';

COMMENT ON COLUMN workflow_states.execution_metadata IS 'Additional metadata about workflow node execution';
COMMENT ON COLUMN workflow_states.agent_name IS 'Name of the agent that executed this workflow state';
COMMENT ON COLUMN workflow_states.confidence_score IS 'Confidence score (0-1) for the execution result';
COMMENT ON COLUMN workflow_states.reasoning IS 'Array of reasoning steps taken during execution';
COMMENT ON COLUMN workflow_states.fallback_used IS 'Whether fallback strategy was used due to errors';

-- ============================================================================
-- UPDATE EXISTING DATA
-- ============================================================================

-- Update any existing book_sessions to have the new default values
UPDATE book_sessions
SET
  adaptive_plan = '{}',
  collaboration_summary = '{}',
  learning_insights = '{}',
  planning_context = '{}'
WHERE
  adaptive_plan IS NULL
  OR collaboration_summary IS NULL
  OR learning_insights IS NULL
  OR planning_context IS NULL;