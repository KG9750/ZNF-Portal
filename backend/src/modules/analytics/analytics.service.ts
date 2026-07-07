import type { AnalyticsOverview, AnalyticsRepository } from "./analytics.types.js";

export class AnalyticsService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  getOverview(): Promise<AnalyticsOverview> {
    return this.repository.getOverview(getLocalDayRange(this.now()));
  }
}

export function createAnalyticsService(repository: AnalyticsRepository): AnalyticsService {
  return new AnalyticsService(repository);
}

function getLocalDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}
