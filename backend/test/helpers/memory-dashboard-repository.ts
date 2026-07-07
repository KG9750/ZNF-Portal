import { BookingStatus, DeviceStatus, WorkOrderStatus } from "@prisma/client";
import type { Device, DeviceBooking, VisitBooking, WorkOrder, ZoneBooking } from "@prisma/client";

import type {
  DashboardDateRange,
  DashboardOverview,
  DashboardRepository
} from "../../src/modules/dashboard/dashboard.types.js";

interface MemoryDashboardData {
  zoneBookings?: ZoneBooking[];
  deviceBookings?: DeviceBooking[];
  visitBookings?: VisitBooking[];
  devices?: Device[];
  workOrders?: WorkOrder[];
}

export function createMemoryDashboardRepository(data: MemoryDashboardData): DashboardRepository {
  return {
    async getOverview(range: DashboardDateRange): Promise<DashboardOverview> {
      return {
        todayZoneBookings: filterTodayBookings(data.zoneBookings ?? [], range),
        todayDeviceBookings: filterTodayBookings(data.deviceBookings ?? [], range),
        todayVisitBookings: filterTodayBookings(data.visitBookings ?? [], range),
        faultDevices: (data.devices ?? []).filter(device => device.status === DeviceStatus.FAULT),
        pendingWorkOrders: (data.workOrders ?? []).filter(
          workOrder => workOrder.status === WorkOrderStatus.OPEN || workOrder.status === WorkOrderStatus.IN_PROGRESS
        )
      };
    }
  };
}

function filterTodayBookings<T extends { startTime: Date; endTime: Date; status: BookingStatus }>(
  bookings: T[],
  range: DashboardDateRange
): T[] {
  return bookings
    .filter(
      booking =>
        booking.status === BookingStatus.RESERVED && booking.startTime < range.end && booking.endTime > range.start
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}
