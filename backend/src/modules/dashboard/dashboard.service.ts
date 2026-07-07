import type { DashboardOverview, DashboardRepository } from "./dashboard.types.js";

export class DashboardService {
  constructor(
    private readonly repository: DashboardRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  getOverview(): Promise<DashboardOverview> {
    return this.repository.getOverview(getLocalDayRange(this.now()));
  }
}

export function createDashboardService(repository: DashboardRepository): DashboardService {
  return new DashboardService(repository);
}

function getLocalDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}
