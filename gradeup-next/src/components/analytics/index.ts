// ═══════════════════════════════════════════════════════════════════════════
// GRADEUP NIL - Analytics Components
// Re-export all analytics-related components and hooks
// ═══════════════════════════════════════════════════════════════════════════

// Main Dashboard
export {
  AnalyticsDashboard,
  CompactAnalyticsDashboard,
  type AnalyticsDashboardProps,
  type CompactAnalyticsDashboardProps,
} from './AnalyticsDashboard';

// Metric Cards
export {
  MetricCard,
  MetricCardGrid,
  MetricCardSkeleton,
  type MetricCardProps,
  type MetricCardGridProps,
} from './MetricCard';

// Charts
export {
  ChartWrapper,
  AnalyticsChartWrapper,
  LineTrendChart,
  AnalyticsLineChart,
  MultiLineChart,
  AnalyticsMultiLineChart,
  BarChartComponent,
  AnalyticsBarChart,
  PieChartComponent,
  AnalyticsPieChart,
  TimePeriodSelector,
  ChartLegend,
  chartColors,
  tooltipStyle,
  axisStyle,
  formatCurrencyValue,
  formatCompactCurrency,
  formatCompactNumber,
  type ChartDataItem,
  type ChartWrapperProps,
  type TimePeriod,
  type TimePeriodSelectorProps,
  type LineTrendChartProps,
  type MultiLineChartProps,
  type BarChartComponentProps,
  type PieChartDataItem,
  type PieChartComponentProps,
  type ChartLegendItem,
  type ChartLegendProps,
} from './Charts';

// Web Vitals Reporter (existing)
export { WebVitalsReporter } from './web-vitals-reporter';
