// Analytics shared components
//
// KPICard and AIInsightsCard are the survivors of the April analytics split:
// KPICard backs BookingKPIRow/ExpenseKPIRow, and AIInsightsCard owns the one
// endpoint that survived (GET /analytics/ai-insights). The KPIGrid /
// TimelineChart / BreakdownTabs / AnalyticsFilters components belonged to the
// deleted POST /api/analytics widget and went with it.
export { KPICard, KPICardSkeleton, type KPICardProps, type MetricFormat } from './KPICard'
export { AIInsightsCard } from './AIInsightsCard'
