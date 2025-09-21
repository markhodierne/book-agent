import { LogLevel, type LoggerConfig } from '../errors/logging';
import { type AnalyticsConfig } from './analytics';

/**
 * Monitoring configuration interface
 */
export interface MonitoringConfig {
  logging: LoggerConfig;
  analytics: AnalyticsConfig;
  metrics: {
    enabled: boolean;
    enablePrometheusExport: boolean;
    collectDefaultMetrics: boolean;
    metricsEndpoint: string;
  };
  performance: {
    enableTimingDecorators: boolean;
    enableResourceMonitoring: boolean;
    enableMemoryTracking: boolean;
    warningThresholds: {
      memoryUsageMB: number;
      responseTimeMs: number;
      errorRate: number; // percentage
    };
  };
  development: {
    enableDebugMode: boolean;
    logAllEvents: boolean;
    enableMetricsConsoleOutput: boolean;
    mockExternalServices: boolean;
  };
  production: {
    enableErrorReporting: boolean;
    enablePerformanceMonitoring: boolean;
    enableRealTimeAlerts: boolean;
    alertingThresholds: {
      errorRatePerMinute: number;
      averageResponseTimeMs: number;
      memoryUsagePercentage: number;
    };
  };
}

/**
 * Get monitoring configuration based on environment
 */
export function getMonitoringConfig(): MonitoringConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    logging: {
      level: isDevelopment ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableStructuredLogging: isProduction,
      enableErrorTracking: isProduction,
      redactSensitiveData: isProduction,
      maxLogEntrySize: isDevelopment ? 50000 : 10000, // Larger logs in dev
    },

    analytics: {
      enableAnalytics: true,
      enableMetricsCollection: true,
      batchSize: isDevelopment ? 5 : 100, // Smaller batches in dev for faster feedback
      flushInterval: isDevelopment ? 3000 : 30000, // 3s dev, 30s prod
      maxEventAge: isDevelopment ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 1h dev, 24h prod
    },

    metrics: {
      enabled: true,
      enablePrometheusExport: isProduction,
      collectDefaultMetrics: isProduction,
      metricsEndpoint: '/api/metrics',
    },

    performance: {
      enableTimingDecorators: true,
      enableResourceMonitoring: isProduction,
      enableMemoryTracking: true,
      warningThresholds: {
        memoryUsageMB: isDevelopment ? 1000 : 512, // More lenient in dev
        responseTimeMs: isDevelopment ? 10000 : 5000,
        errorRate: isDevelopment ? 10 : 5, // 10% dev, 5% prod
      },
    },

    development: {
      enableDebugMode: isDevelopment,
      logAllEvents: isDevelopment,
      enableMetricsConsoleOutput: isDevelopment,
      mockExternalServices: isDevelopment && process.env.MOCK_SERVICES === 'true',
    },

    production: {
      enableErrorReporting: isProduction,
      enablePerformanceMonitoring: isProduction,
      enableRealTimeAlerts: isProduction,
      alertingThresholds: {
        errorRatePerMinute: 10,
        averageResponseTimeMs: 3000,
        memoryUsagePercentage: 80,
      },
    },
  };
}

/**
 * Environment-specific configurations
 */
export const environmentConfigs = {
  development: {
    logLevel: LogLevel.DEBUG,
    enableVerboseLogging: true,
    enableMetricsConsole: true,
    flushAnalyticsEvery: 3000,
    enableStackTraces: true,
  },
  production: {
    logLevel: LogLevel.INFO,
    enableVerboseLogging: false,
    enableMetricsConsole: false,
    flushAnalyticsEvery: 30000,
    enableStackTraces: false,
  },
  test: {
    logLevel: LogLevel.WARN,
    enableVerboseLogging: false,
    enableMetricsConsole: false,
    flushAnalyticsEvery: 1000,
    enableStackTraces: true,
  },
} as const;

/**
 * Get current environment configuration
 */
export function getCurrentEnvironmentConfig() {
  const env = (process.env.NODE_ENV || 'development') as keyof typeof environmentConfigs;
  return environmentConfigs[env] || environmentConfigs.development;
}

/**
 * Feature flags for monitoring components
 */
export interface MonitoringFeatureFlags {
  enableStructuredLogging: boolean;
  enableMetricsCollection: boolean;
  enableAnalyticsTracking: boolean;
  enablePerformanceMonitoring: boolean;
  enableErrorReporting: boolean;
  enableRealTimeUpdates: boolean;
  enableDebugMode: boolean;
}

/**
 * Get feature flags based on environment and configuration
 */
export function getMonitoringFeatureFlags(): MonitoringFeatureFlags {
  const config = getMonitoringConfig();
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    enableStructuredLogging: config.logging.enableStructuredLogging,
    enableMetricsCollection: config.analytics.enableMetricsCollection,
    enableAnalyticsTracking: config.analytics.enableAnalytics,
    enablePerformanceMonitoring: config.performance.enableResourceMonitoring,
    enableErrorReporting: config.production.enableErrorReporting,
    enableRealTimeUpdates: !isDevelopment, // Disable in dev to reduce noise
    enableDebugMode: config.development.enableDebugMode,
  };
}

/**
 * Validate monitoring configuration
 */
export function validateMonitoringConfig(config: MonitoringConfig): void {
  // Validate thresholds are positive
  if (config.performance.warningThresholds.memoryUsageMB <= 0) {
    throw new Error('Memory usage threshold must be positive');
  }

  if (config.performance.warningThresholds.responseTimeMs <= 0) {
    throw new Error('Response time threshold must be positive');
  }

  if (config.performance.warningThresholds.errorRate < 0 || config.performance.warningThresholds.errorRate > 100) {
    throw new Error('Error rate threshold must be between 0 and 100');
  }

  // Validate batch sizes are reasonable
  if (config.analytics.batchSize <= 0 || config.analytics.batchSize > 1000) {
    throw new Error('Analytics batch size must be between 1 and 1000');
  }

  // Validate flush intervals are reasonable
  if (config.analytics.flushInterval < 1000) {
    throw new Error('Analytics flush interval must be at least 1 second');
  }
}

/**
 * Initialize monitoring with configuration
 */
export function initializeMonitoring(): MonitoringConfig {
  const config = getMonitoringConfig();

  try {
    validateMonitoringConfig(config);
  } catch (error) {
    console.error('Invalid monitoring configuration:', error);
    throw error;
  }

  // Log configuration in development
  if (config.development.enableDebugMode) {
    console.log('Monitoring initialized with configuration:', {
      environment: process.env.NODE_ENV,
      logLevel: config.logging.level,
      metricsEnabled: config.metrics.enabled,
      analyticsEnabled: config.analytics.enableAnalytics,
    });
  }

  return config;
}

/**
 * Default monitoring configuration export
 */
export const monitoringConfig = getMonitoringConfig();