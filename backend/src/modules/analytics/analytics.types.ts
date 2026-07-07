export interface AnalyticsDateRange {
  start: Date;
  end: Date;
}

export interface UtilizationMetric {
  total: number;
  used: number;
  rate: number;
}

export interface VisitMetrics {
  todayVisitBookings: number;
  todayVisitRecords: number;
  todayVisitors: number;
}

export interface AnalyticsOverview {
  zoneUtilization: UtilizationMetric;
  deviceUsage: UtilizationMetric;
  visitStats: VisitMetrics;
}

export interface AnalyticsRepository {
  getOverview(range: AnalyticsDateRange): Promise<AnalyticsOverview>;
}
