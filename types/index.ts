// Core TypeScript Type Definitions for Book Agent Application
// Following CLAUDE.md standards: interfaces over types, strict typing, enhanced rules

// ============================================================================
// WORKFLOW & ORCHESTRATION TYPES
// ============================================================================

/**
 * Core workflow state for LangGraph orchestration
 * Tracks progress through all stages of book generation
 */
export interface WorkflowState {
  // Session Management
  sessionId: string;
  userId?: string;
  currentStage: WorkflowStage;
  status: WorkflowStatus;

  // User Input
  userPrompt: string;
  pdfFile?: Buffer;
  baseContent?: string;

  // Requirements & Configuration
  requirements?: BookRequirements;
  styleGuide?: StyleGuide;
  outline?: BookOutline;

  // Generated Content
  chapters: ChapterResult[];
  currentChapter?: ChapterConfig;

  // Progress & State
  progress: WorkflowProgress;
  error?: string;
  needsRetry?: boolean;
  retryCount?: number;

  // Chapter Spawning Metadata
  chapterSpawning?: ChapterSpawningMetadata;

  // Consistency Review Results
  consistencyReview?: ConsistencyReviewResult;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Workflow stage progression through book generation
 */
export type WorkflowStage =
  | 'conversation'
  | 'outline'
  | 'chapter_spawning'
  | 'chapter_generation'
  | 'consistency_review'
  | 'quality_review'
  | 'formatting'
  | 'user_review'
  | 'completed'
  | 'failed';

/**
 * Overall workflow status
 */
export type WorkflowStatus =
  | 'active'
  | 'completed'
  | 'failed'
  | 'paused';

/**
 * Progress tracking for workflow stages
 */
export interface WorkflowProgress {
  currentStageProgress: number; // 0-100
  overallProgress: number; // 0-100
  chaptersCompleted: number;
  totalChapters: number;
  estimatedTimeRemaining?: number; // seconds
}

// ============================================================================
// BOOK CONTENT TYPES
// ============================================================================

/**
 * Complete book requirements gathered during conversation stage
 */
export interface BookRequirements {
  topic: string;
  audience: AudienceProfile;
  author: AuthorInfo;
  scope: BookScope;
  contentOrientation: ContentOrientation;
  wordCountTarget: number; // Minimum 30,000
}

/**
 * Target audience profile for content generation
 */
export interface AudienceProfile {
  demographics: string;
  expertiseLevel: ExpertiseLevel;
  ageRange?: string;
  priorKnowledge: string[];
  readingContext: ReadingContext;
}

export type ExpertiseLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export type ReadingContext =
  | 'professional'
  | 'academic'
  | 'casual'
  | 'reference';

/**
 * Author information for attribution
 */
export interface AuthorInfo {
  name: string;
  credentials?: string;
  background?: string;
}

/**
 * Book scope and approach definition
 */
export interface BookScope {
  purpose: BookPurpose;
  approach: BookApproach;
  coverageDepth: CoverageDepth;
}

export type BookPurpose =
  | 'educational'
  | 'reference'
  | 'narrative'
  | 'practical'
  | 'theoretical';

export type BookApproach =
  | 'comprehensive'
  | 'focused'
  | 'practical'
  | 'theoretical'
  | 'case_study';

export type CoverageDepth =
  | 'overview'
  | 'detailed'
  | 'comprehensive'
  | 'exhaustive';

/**
 * Content orientation for engagement optimization
 */
export interface ContentOrientation {
  primaryAngle: string;
  secondaryAngles: string[];
  engagementStrategy: EngagementStrategy;
}

export type EngagementStrategy =
  | 'practical_examples'
  | 'case_studies'
  | 'step_by_step'
  | 'conceptual'
  | 'narrative';

/**
 * Writing style guide for consistency
 */
export interface StyleGuide {
  tone: WritingTone;
  voice: WritingVoice;
  perspective: WritingPerspective;
  formality: FormalityLevel;
  technicalLevel: TechnicalLevel;
  exampleUsage: string; // 200-300 word sample
}

export type WritingTone =
  | 'conversational'
  | 'professional'
  | 'academic'
  | 'friendly'
  | 'authoritative';

export type WritingVoice =
  | 'active'
  | 'passive'
  | 'mixed';

export type WritingPerspective =
  | 'first_person'
  | 'second_person'
  | 'third_person';

export type FormalityLevel =
  | 'casual'
  | 'semi_formal'
  | 'formal'
  | 'academic';

export type TechnicalLevel =
  | 'non_technical'
  | 'semi_technical'
  | 'technical'
  | 'highly_technical';

/**
 * Complete book outline structure
 */
export interface BookOutline {
  title: string;
  subtitle?: string;
  chapters: ChapterOutline[];
  totalWordCount: number;
  estimatedPages: number;
}

/**
 * Individual chapter outline for parallel generation
 */
export interface ChapterOutline {
  chapterNumber: number;
  title: string;
  contentOverview: string;
  keyObjectives: string[];
  wordCount: number;
  dependencies: number[]; // References to other chapter numbers
  researchRequirements: string[];
}

// ============================================================================
// CHAPTER GENERATION TYPES
// ============================================================================

/**
 * Configuration for individual chapter generation
 */
export interface ChapterConfig {
  chapterNumber: number;
  title: string;
  outline: ChapterOutline;
  wordTarget: number;
  dependencies: number[];
  style: StyleGuide;
  researchTopics: string[];
}

/**
 * Result from chapter generation process
 */
export interface ChapterResult {
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  status: ChapterStatus;
  researchSources?: string[];
  generatedAt: string;
  reviewNotes?: string[];
}

export type ChapterStatus =
  | 'pending'
  | 'researching'
  | 'writing'
  | 'completed'
  | 'needs_revision'
  | 'failed';

/**
 * Chapter spawning metadata for parallel execution coordination
 */
export interface ChapterSpawningMetadata {
  nodeIds: string[];
  executionPlan: ExecutionPlan;
  dependencyLayers: number;
  totalNodes: number;
  spawnedAt: string;
}

/**
 * Execution plan for parallel chapter coordination
 */
export interface ExecutionPlan {
  totalLayers: number;
  executionLayers: ExecutionLayer[];
  estimatedTotalDuration: number; // in seconds
  parallelismFactor: number; // max parallel nodes in any layer
}

/**
 * Individual execution layer in the plan
 */
export interface ExecutionLayer {
  layerIndex: number;
  nodeIds: string[];
  dependencies: string[]; // Node IDs that must complete before this layer
  estimatedDuration: number; // in seconds
}

// ============================================================================
// CONSISTENCY REVIEW TYPES
// ============================================================================

/**
 * Consistency analysis result for a single chapter
 */
export interface ChapterConsistencyResult {
  chapterNumber: number;
  title: string;
  consistencyScore: number; // 0-100
  issues: ConsistencyIssue[];
  suggestions: string[];
  wordCount: number;
}

/**
 * Individual consistency issue found in content
 */
export interface ConsistencyIssue {
  type: 'terminology' | 'style' | 'cross-reference' | 'tone' | 'structure';
  severity: 'low' | 'medium' | 'high';
  description: string;
  chapterNumber: number;
  suggestion?: string;
  relatedChapters?: number[];
}

/**
 * Overall consistency review result
 */
export interface ConsistencyReviewResult {
  overallConsistencyScore: number; // 0-100
  totalIssuesFound: number;
  chapterResults: ChapterConsistencyResult[];
  globalIssues: ConsistencyIssue[];
  recommendedActions: string[];
  terminologyMap: Record<string, string>; // Term standardization
}

// ============================================================================
// TOOL SYSTEM TYPES
// ============================================================================

/**
 * Generic tool configuration interface
 */
export interface ToolConfig<P = unknown, R = unknown> {
  name: string;
  description: string;
  parameters: P;
  execute: (params: P) => Promise<R>;
  retryConfig?: RetryConfig;
  timeout?: number;
}

/**
 * Retry configuration for resilient operations
 */
export interface RetryConfig {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
  timeout?: number;
}

/**
 * Tool execution result with metadata
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime: number;
  retryCount: number;
}

/**
 * PDF extraction tool parameters
 */
export interface PdfExtractParams {
  fileBuffer: Buffer;
  options: PdfExtractOptions;
}

export interface PdfExtractOptions {
  preserveLineBreaks?: boolean;
  maxPages?: number;
  encoding?: string;
}

/**
 * Web research tool parameters
 */
export interface WebResearchParams {
  query: string;
  maxPages: number;
  timeoutMs?: number;
  domains?: string[];
}

export interface WebResearchResult {
  sources: ResearchSource[];
  content: string;
  totalPages: number;
}

export interface ResearchSource {
  url: string;
  title: string;
  content: string;
  crawledAt: string;
}

/**
 * Chapter generation tool parameters
 */
export interface ChapterWriteParams {
  outline: ChapterOutline;
  style: StyleGuide;
  wordCount: number;
  baseContent?: string;
  researchData?: WebResearchResult;
  dependentContent?: string[];
}

/**
 * State persistence tool parameters
 */
export interface StateOperationParams {
  operation: StateOperation;
  sessionId: string;
  data: unknown;
}

export type StateOperation =
  | 'save_checkpoint'
  | 'load_checkpoint'
  | 'save_chapter'
  | 'load_chapters'
  | 'update_progress';

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

/**
 * Base error interface for all application errors
 */
export interface BaseError {
  name: string;
  message: string;
  code?: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

/**
 * Tool-specific error
 */
export interface ToolError extends BaseError {
  toolName: string;
  parameters?: unknown;
  retryAttempt: number;
}

/**
 * Database operation error
 */
export interface DatabaseError extends BaseError {
  operation: string;
  table?: string;
  query?: string;
}

/**
 * Workflow execution error
 */
export interface WorkflowError extends BaseError {
  sessionId: string;
  stage: WorkflowStage;
  recoverable: boolean;
}

// ============================================================================
// UI COMPONENT TYPES
// ============================================================================

/**
 * Multi-step wizard component props
 */
export interface WizardStepProps {
  currentStep: number;
  totalSteps: number;
  onNext: (data: StepData) => void;
  onPrevious: () => void;
  onSkip?: () => void;
  initialData?: StepData;
  isLoading?: boolean;
  canProceed?: boolean;
}

/**
 * Generic step data container
 */
export interface StepData {
  [key: string]: unknown;
}

/**
 * Progress indicator props
 */
export interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  completedSteps?: number[];
  errorSteps?: number[];
}

/**
 * Chat interface props for conversation stage
 */
export interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onFileUpload: (file: File) => void;
  isLoading?: boolean;
  canUploadFile?: boolean;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  attachments?: ChatAttachment[];
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatAttachment {
  type: AttachmentType;
  name: string;
  size: number;
  url?: string;
}

export type AttachmentType = 'pdf' | 'text' | 'image';

/**
 * Dashboard props for progress monitoring
 */
export interface DashboardProps {
  workflowState: WorkflowState;
  onRetry?: (stage: WorkflowStage) => void;
  onCancel?: () => void;
  realTimeUpdates?: boolean;
}

/**
 * PDF viewer component props
 */
export interface PdfViewerProps {
  pdfUrl: string;
  title: string;
  onDownload: () => void;
  onPrint?: () => void;
  showControls?: boolean;
}

// ============================================================================
// STATE MANAGEMENT TYPES
// ============================================================================

/**
 * Zustand store for book creation workflow
 */
export interface BookStore {
  // Current state
  currentStage: WorkflowStage;
  sessionId?: string;
  workflowState?: WorkflowState;

  // UI state
  isLoading: boolean;
  error?: string;

  // Actions
  updateStage: (stage: WorkflowStage) => void;
  setWorkflowState: (state: WorkflowState) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  resetStore: () => void;
}

/**
 * React Query hook types
 */
export interface UseWorkflowStateOptions {
  sessionId: string;
  refetchInterval?: number;
  enabled?: boolean;
}

export interface UseChapterProgressOptions {
  sessionId: string;
  realTime?: boolean;
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Database entity for book sessions
 */
export interface BookSession {
  id: string;
  user_id?: string;
  status: WorkflowStatus;
  current_stage: WorkflowStage;
  requirements?: BookRequirements;
  created_at: string;
  updated_at: string;
}

/**
 * Database entity for books
 */
export interface Book {
  id: string;
  session_id: string;
  title?: string;
  author?: string;
  outline?: BookOutline;
  style_guide?: StyleGuide;
  word_count?: number;
  pdf_url?: string;
  cover_image_url?: string;
  created_at: string;
}

/**
 * Database entity for chapters
 */
export interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content?: string;
  word_count?: number;
  status: ChapterStatus;
  dependencies?: number[];
  research_sources?: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Database entity for workflow state persistence
 */
export interface WorkflowStateRecord {
  id: string;
  session_id: string;
  node_name: string;
  state_data: WorkflowState;
  timestamp: string;
}

// ============================================================================
// API TYPES
// ============================================================================

/**
 * API request for starting workflow
 */
export interface StartWorkflowRequest {
  userPrompt: string;
  pdfFile?: File;
  userId?: string;
}

/**
 * API response for workflow operations
 */
export interface WorkflowResponse {
  success: boolean;
  sessionId: string;
  workflowState?: WorkflowState;
  error?: string;
}

/**
 * API request for user feedback
 */
export interface FeedbackRequest {
  sessionId: string;
  stage: WorkflowStage;
  feedback: string;
  revisionRequests?: RevisionRequest[];
}

export interface RevisionRequest {
  type: RevisionType;
  target: string; // Chapter number, section, etc.
  description: string;
  priority: Priority;
}

export type RevisionType =
  | 'content_change'
  | 'style_adjustment'
  | 'factual_correction'
  | 'structural_change';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  openaiApiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  firecrawlApiKey: string;
  nodeEnv: 'development' | 'production' | 'test';
}

/**
 * Application configuration
 */
export interface AppConfig {
  maxFileSize: number; // bytes
  maxChapters: number;
  minWordCount: number;
  defaultTimeout: number; // milliseconds
  retryDefaults: RetryConfig;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Search parameters
 */
export interface SearchParams {
  query: string;
  filters?: Record<string, unknown>;
  pagination?: PaginationParams;
}

/**
 * File upload validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileInfo?: {
    size: number;
    type: string;
    pageCount?: number;
  };
}