/**
 * Monitoring & Analytics Exports
 * Provides centralized access to all monitoring, metrics, and analytics functionality
 */

// Metrics system
export {
  MetricType,
  MetricsRegistry,
  Histogram,
  Counter,
  Gauge,
  metricsRegistry,
  applicationMetrics,
  timeOperation,
  timed,
  type BaseMetric,
  type HistogramMetric,
  type CounterMetric,
  type GaugeMetric,
} from './metrics';

// Analytics and event tracking
export {
  WorkflowEventType,
  Analytics,
  analytics,
  trackWorkflowEvent,
  tracked,
  type AnalyticsEvent,
  type AnalyticsConfig,
} from './analytics';

// Configuration
export {
  getMonitoringConfig,
  getCurrentEnvironmentConfig,
  getMonitoringFeatureFlags,
  validateMonitoringConfig,
  initializeMonitoring,
  monitoringConfig,
  environmentConfigs,
  type MonitoringConfig,
  type MonitoringFeatureFlags,
} from './config';

// Monitoring utilities
export {
  monitorWorkflow,
  monitorStage,
  monitorTool,
  monitorChapterGeneration,
  trackUserAction,
  getSystemHealth,
  startHealthMonitoring,
  monitorMemoryUsage,
} from './utils';

// Re-export logging utilities from errors module for convenience
export {
  logger,
  LogLevel,
  logError,
  logPerformance,
  logWorkflowEvent,
  logToolExecution,
  type LogEntry,
  type LoggerConfig,
} from '../errors/logging';