import { BookingStatus, DeviceStatus, ZoneStatus, type PrismaClient } from "@prisma/client";

import type { AnalyticsDateRange, AnalyticsOverview, AnalyticsRepository } from "./analytics.types.js";

export function createAnalyticsRepository(prisma: PrismaClient): AnalyticsRepository {
  return {
    async getOverview(range: AnalyticsDateRange): Promise<AnalyticsOverview> {
      const [
        totalZones,
        zoneBookings,
        totalDevices,
        deviceBookings,
        todayVisitBookings,
        todayVisitRecords
      ] = await Promise.all([
        prisma.zone.count({
          where: {
            status: ZoneStatus.ACTIVE
          }
        }),
        prisma.zoneBooking.findMany({
          where: {
            ...todayReservedBookingWhere(range),
            zone: {
              status: ZoneStatus.ACTIVE
            }
          },
          select: {
            zoneId: true
          }
        }),
        prisma.device.count({
          where: {
            status: {
              in: [DeviceStatus.AVAILABLE, DeviceStatus.IN_USE]
            }
          }
        }),
        prisma.deviceBooking.findMany({
          where: {
            ...todayReservedBookingWhere(range),
            device: {
              status: {
                in: [DeviceStatus.AVAILABLE, DeviceStatus.IN_USE]
              }
            }
          },
          select: {
            deviceId: true
          }
        }),
        prisma.visitBooking.count({
          where: todayReservedBookingWhere(range)
        }),
        prisma.visitRecord.findMany({
          where: {
            actualStartTime: {
              lt: range.end
            },
            actualEndTime: {
              gt: range.start
            }
          },
          select: {
            actualVisitorCount: true
          }
        })
      ]);

      const usedZones = new Set(zoneBookings.map(booking => booking.zoneId)).size;
      const usedDevices = new Set(deviceBookings.map(booking => booking.deviceId)).size;

      return {
        zoneUtilization: createUtilizationMetric(totalZones, usedZones),
        deviceUsage: createUtilizationMetric(totalDevices, usedDevices),
        visitStats: {
          todayVisitBookings,
          todayVisitRecords: todayVisitRecords.length,
          todayVisitors: todayVisitRecords.reduce((total, record) => total + record.actualVisitorCount, 0)
        }
      };
    }
  };
}

function todayReservedBookingWhere(range: AnalyticsDateRange) {
  return {
    status: BookingStatus.RESERVED,
    startTime: {
      lt: range.end
    },
    endTime: {
      gt: range.start
    }
  };
}

function createUtilizationMetric(total: number, used: number) {
  return {
    total,
    used,
    rate: total === 0 ? 0 : Math.round((used / total) * 10000) / 10000
  };
}
