import { BookingStatus, DeviceStatus, ZoneStatus } from "@prisma/client";
import type { Device, DeviceBooking, VisitBooking, VisitRecord, Zone, ZoneBooking } from "@prisma/client";

import type {
  AnalyticsDateRange,
  AnalyticsOverview,
  AnalyticsRepository
} from "../../src/modules/analytics/analytics.types.js";

interface MemoryAnalyticsData {
  zones?: Zone[];
  devices?: Device[];
  zoneBookings?: ZoneBooking[];
  deviceBookings?: DeviceBooking[];
  visitBookings?: VisitBooking[];
  visitRecords?: VisitRecord[];
}

export function createMemoryAnalyticsRepository(data: MemoryAnalyticsData): AnalyticsRepository {
  return {
    async getOverview(range: AnalyticsDateRange): Promise<AnalyticsOverview> {
      const todayZoneBookings = filterTodayBookings(data.zoneBookings ?? [], range);
      const todayDeviceBookings = filterTodayBookings(data.deviceBookings ?? [], range);
      const todayVisitBookings = filterTodayBookings(data.visitBookings ?? [], range);
      const todayVisitRecords = (data.visitRecords ?? []).filter(
        record => record.actualStartTime < range.end && record.actualEndTime > range.start
      );
      const activeZones = (data.zones ?? []).filter(zone => zone.status === ZoneStatus.ACTIVE);
      const usableDevices = (data.devices ?? []).filter(
        device => device.status === DeviceStatus.AVAILABLE || device.status === DeviceStatus.IN_USE
      );
      const activeZoneIds = new Set(activeZones.map(zone => zone.id));
      const usableDeviceIds = new Set(usableDevices.map(device => device.id));

      return {
        zoneUtilization: createUtilizationMetric(
          activeZones.length,
          new Set(todayZoneBookings.filter(booking => activeZoneIds.has(booking.zoneId)).map(booking => booking.zoneId))
            .size
        ),
        deviceUsage: createUtilizationMetric(
          usableDevices.length,
          new Set(
            todayDeviceBookings.filter(booking => usableDeviceIds.has(booking.deviceId)).map(booking => booking.deviceId)
          ).size
        ),
        visitStats: {
          todayVisitBookings: todayVisitBookings.length,
          todayVisitRecords: todayVisitRecords.length,
          todayVisitors: todayVisitRecords.reduce((total, record) => total + record.actualVisitorCount, 0)
        }
      };
    }
  };
}

function filterTodayBookings<T extends { startTime: Date; endTime: Date; status: BookingStatus }>(
  bookings: T[],
  range: AnalyticsDateRange
): T[] {
  return bookings.filter(
    booking =>
      booking.status === BookingStatus.RESERVED && booking.startTime < range.end && booking.endTime > range.start
  );
}

function createUtilizationMetric(total: number, used: number) {
  return {
    total,
    used,
    rate: total === 0 ? 0 : Math.round((used / total) * 10000) / 10000
  };
}
