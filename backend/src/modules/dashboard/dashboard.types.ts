import type { Device, DeviceBooking, VisitBooking, WorkOrder, ZoneBooking } from "@prisma/client";

export interface DashboardDateRange {
  start: Date;
  end: Date;
}

export interface DashboardOverview {
  todayZoneBookings: ZoneBooking[];
  todayDeviceBookings: DeviceBooking[];
  todayVisitBookings: VisitBooking[];
  faultDevices: Device[];
  pendingWorkOrders: WorkOrder[];
}

export interface DashboardRepository {
  getOverview(range: DashboardDateRange): Promise<DashboardOverview>;
}
