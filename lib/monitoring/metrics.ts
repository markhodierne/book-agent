/**
 * Performance metrics collection system for Book Agent application
 * Provides basic metrics collection without external dependencies for MVP
 */

/**
 * Metric types for performance monitoring
 */
export enum MetricType {
  HISTOGRAM = 'histogram',
  COUNTER = 'counter',
  GAUGE = 'gauge',
}

/**
 * Base metric interface
 */
export interface BaseMetric {
  name: string;
  type: MetricType;
  description: string;
  labels?: Record<string, string>;
}

/**
 * Histogram metric for tracking distributions (e.g., response times)
 */
export interface HistogramMetric extends BaseMetric {
  type: MetricType.HISTOGRAM;
  buckets: number[];
  observations: number[];
  sum: number;
  count: number;
}

/**
 * Counter metric for tracking cumulative values
 */
export interface CounterMetric extends BaseMetric {
  type: MetricType.COUNTER;
  value: number;
}

/**
 * Gauge metric for tracking point-in-time values
 */
export interface GaugeMetric extends BaseMetric {
  type: MetricType.GAUGE;
  value: number;
}

/**
 * Metric registry for managing all application metrics
 */
export class MetricsRegistry {
  private metrics: Map<string, HistogramMetric | CounterMetric | GaugeMetric> = new Map();
  private startTime: number = Date.now();

  /**
   * Create a histogram metric
   */
  createHistogram(
    name: string,
    description: string,
    buckets: number[] = [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    labels?: Record<string, string>
  ): Histogram {
    const metric: HistogramMetric = {
      name,
      type: MetricType.HISTOGRAM,
      description,
      labels,
      buckets,
      observations: new Array(buckets.length + 1).fill(0), // +1 for +Inf bucket
      sum: 0,
      count: 0,
    };

    this.metrics.set(name, metric);
    return new Histogram(metric, this);
  }

  /**
   * Create a counter metric
   */
  createCounter(
    name: string,
    description: string,
    labels?: Record<string, string>
  ): Counter {
    const metric: CounterMetric = {
      name,
      type: MetricType.COUNTER,
      description,
      labels,
      value: 0,
    };

    this.metrics.set(name, metric);
    return new Counter(metric, this);
  }

  /**
   * Create a gauge metric
   */
  createGauge(
    name: string,
    description: string,
    labels?: Record<string, string>
  ): Gauge {
    const metric: GaugeMetric = {
      name,
      type: MetricType.GAUGE,
      description,
      labels,
      value: 0,
    };

    this.metrics.set(name, metric);
    return new Gauge(metric, this);
  }

  /**
   * Get metric by name
   */
  getMetric(name: string): HistogramMetric | CounterMetric | GaugeMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): (HistogramMetric | CounterMetric | GaugeMetric)[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Get metrics summary for reporting
   */
  getMetricsSummary(): Record<string, any> {
    const summary: Record<string, any> = {
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
      metrics: {},
    };

    for (const metric of Array.from(this.metrics.values())) {
      switch (metric.type) {
        case MetricType.HISTOGRAM:
          summary.metrics[metric.name] = {
            type: 'histogram',
            count: metric.count,
            sum: metric.sum,
            average: metric.count > 0 ? metric.sum / metric.count : 0,
            buckets: metric.buckets,
            observations: metric.observations,
          };
          break;
        case MetricType.COUNTER:
          summary.metrics[metric.name] = {
            type: 'counter',
            value: metric.value,
          };
          break;
        case MetricType.GAUGE:
          summary.metrics[metric.name] = {
            type: 'gauge',
            value: metric.value,
          };
          break;
      }
    }

    return summary;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusFormat(): string {
    let output = '';

    for (const metric of Array.from(this.metrics.values())) {
      output += `# HELP ${metric.name} ${metric.description}\n`;
      output += `# TYPE ${metric.name} ${metric.type}\n`;

      const labelString = metric.labels
        ? Object.entries(metric.labels)
            .map(([key, value]) => `${key}="${value}"`)
            .join(',')
        : '';

      switch (metric.type) {
        case MetricType.HISTOGRAM:
          for (let i = 0; i < metric.buckets.length; i++) {
            const bucket = metric.buckets[i];
            const count = metric.observations.slice(0, i + 1).reduce((sum, val) => sum + val, 0);
            output += `${metric.name}_bucket{${labelString}${labelString ? ',' : ''}le="${bucket}"} ${count}\n`;
          }
          output += `${metric.name}_bucket{${labelString}${labelString ? ',' : ''}le="+Inf"} ${metric.count}\n`;
          output += `${metric.name}_sum{${labelString}} ${metric.sum}\n`;
          output += `${metric.name}_count{${labelString}} ${metric.count}\n`;
          break;
        case MetricType.COUNTER:
          output += `${metric.name}{${labelString}} ${metric.value}\n`;
          break;
        case MetricType.GAUGE:
          output += `${metric.name}{${labelString}} ${metric.value}\n`;
          break;
      }

      output += '\n';
    }

    return output;
  }
}

/**
 * Histogram implementation
 */
export class Histogram {
  constructor(
    private metric: HistogramMetric,
    private registry: MetricsRegistry
  ) {}

  /**
   * Get the metrics registry this histogram belongs to
   */
  getRegistry(): MetricsRegistry {
    return this.registry;
  }

  /**
   * Observe a value
   */
  observe(value: number): void {
    this.metric.sum += value;
    this.metric.count += 1;

    // Find appropriate bucket
    for (let i = 0; i < this.metric.buckets.length; i++) {
      const bucket = this.metric.buckets[i];
      if (bucket !== undefined && value <= bucket) {
        const currentCount = this.metric.observations[i];
        if (currentCount !== undefined) {
          this.metric.observations[i] = currentCount + 1;
        }
        return;
      }
    }

    // Value is greater than all buckets, add to +Inf bucket
    const lastIndex = this.metric.observations.length - 1;
    const lastCount = this.metric.observations[lastIndex];
    if (lastCount !== undefined) {
      this.metric.observations[lastIndex] = lastCount + 1;
    }
  }

  /**
   * Time an operation
   */
  startTimer(): () => void {
    const startTime = Date.now();
    return () => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      this.observe(duration);
    };
  }

  /**
   * Get current statistics
   */
  getStats(): {
    count: number;
    sum: number;
    average: number;
    buckets: number[];
    observations: number[];
  } {
    return {
      count: this.metric.count,
      sum: this.metric.sum,
      average: this.metric.count > 0 ? this.metric.sum / this.metric.count : 0,
      buckets: [...this.metric.buckets],
      observations: [...this.metric.observations],
    };
  }
}

/**
 * Counter implementation
 */
export class Counter {
  constructor(
    private metric: CounterMetric,
    private registry: MetricsRegistry
  ) {}

  /**
   * Get the metrics registry this counter belongs to
   */
  getRegistry(): MetricsRegistry {
    return this.registry;
  }

  /**
   * Increment counter by 1
   */
  inc(): void {
    this.metric.value += 1;
  }

  /**
   * Add to counter
   */
  add(value: number): void {
    if (value < 0) {
      throw new Error('Counter values can only increase');
    }
    this.metric.value += value;
  }

  /**
   * Get current value
   */
  get(): number {
    return this.metric.value;
  }
}

/**
 * Gauge implementation
 */
export class Gauge {
  constructor(
    private metric: GaugeMetric,
    private registry: MetricsRegistry
  ) {}

  /**
   * Get the metrics registry this gauge belongs to
   */
  getRegistry(): MetricsRegistry {
    return this.registry;
  }

  /**
   * Set gauge value
   */
  set(value: number): void {
    this.metric.value = value;
  }

  /**
   * Increment gauge
   */
  inc(value: number = 1): void {
    this.metric.value += value;
  }

  /**
   * Decrement gauge
   */
  dec(value: number = 1): void {
    this.metric.value -= value;
  }

  /**
   * Get current value
   */
  get(): number {
    return this.metric.value;
  }
}

/**
 * Global metrics registry instance
 */
export const metricsRegistry = new MetricsRegistry();

/**
 * Application-specific metrics
 */
export const applicationMetrics = {
  // Workflow performance metrics
  workflowDuration: metricsRegistry.createHistogram(
    'workflow_duration_seconds',
    'Time taken to complete entire book workflow',
    [1, 5, 10, 30, 60, 120, 300, 600] // Up to 10 minutes
  ),

  chapterGenerationTime: metricsRegistry.createHistogram(
    'chapter_generation_seconds',
    'Time taken to generate individual chapters',
    [1, 5, 10, 30, 60, 120, 300] // Up to 5 minutes per chapter
  ),

  // Error and success tracking
  workflowErrors: metricsRegistry.createCounter(
    'workflow_errors_total',
    'Total number of workflow errors'
  ),

  workflowSuccess: metricsRegistry.createCounter(
    'workflow_success_total',
    'Total number of successful workflows'
  ),

  // Active resource tracking
  activeWorkflows: metricsRegistry.createGauge(
    'active_workflows_count',
    'Number of currently active workflows'
  ),

  activeChapterGeneration: metricsRegistry.createGauge(
    'active_chapter_generation_count',
    'Number of chapters currently being generated'
  ),

  // Tool performance metrics
  toolExecutionTime: metricsRegistry.createHistogram(
    'tool_execution_seconds',
    'Time taken for tool execution',
    [0.1, 0.5, 1, 5, 10, 30] // Up to 30 seconds for tools
  ),

  toolErrors: metricsRegistry.createCounter(
    'tool_errors_total',
    'Total number of tool execution errors'
  ),

  // API metrics
  apiRequests: metricsRegistry.createCounter(
    'api_requests_total',
    'Total number of API requests'
  ),

  apiErrors: metricsRegistry.createCounter(
    'api_errors_total',
    'Total number of API errors'
  ),

  // Database metrics
  databaseOperations: metricsRegistry.createHistogram(
    'database_operation_seconds',
    'Time taken for database operations',
    [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
  ),

  databaseConnections: metricsRegistry.createGauge(
    'database_connections_count',
    'Number of active database connections'
  ),

  // Tool registry metrics
  registeredToolsCount: metricsRegistry.createGauge(
    'registered_tools_count',
    'Number of tools registered in the tool registry'
  ),

  toolAccessCount: metricsRegistry.createCounter(
    'tool_access_total',
    'Total number of tool access requests'
  ),

  toolExecutionSuccessCount: metricsRegistry.createCounter(
    'tool_execution_success_total',
    'Total number of successful tool executions'
  ),

  toolExecutionErrorCount: metricsRegistry.createCounter(
    'tool_execution_error_total',
    'Total number of failed tool executions'
  ),
};

/**
 * Convenience function to time any operation
 */
export function timeOperation<T>(
  histogram: Histogram,
  operation: () => Promise<T>
): Promise<T> {
  const endTimer = histogram.startTimer();
  return operation().finally(() => {
    endTimer();
  });
}

/**
 * Decorator for timing method execution
 */
export function timed(histogram: Histogram) {
  return function <T extends (...args: any[]) => Promise<any>>(
    _target: any,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return descriptor;

    const decoratedMethod = async function (this: unknown, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
      const endTimer = histogram.startTimer();
      try {
        const result = await originalMethod.call(this, ...args);
        return result;
      } finally {
        endTimer();
      }
    };

    descriptor.value = decoratedMethod as T;

    return descriptor;
  };
}