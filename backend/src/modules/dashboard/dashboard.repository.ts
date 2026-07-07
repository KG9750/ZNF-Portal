import { BookingStatus, DeviceStatus, WorkOrderStatus, type PrismaClient } from "@prisma/client";

import type { DashboardDateRange, DashboardOverview, DashboardRepository } from "./dashboard.types.js";

export function createDashboardRepository(prisma: PrismaClient): DashboardRepository {
  return {
    async getOverview(range: DashboardDateRange): Promise<DashboardOverview> {
      const [todayZoneBookings, todayDeviceBookings, todayVisitBookings, faultDevices, pendingWorkOrders] =
        await Promise.all([
          prisma.zoneBooking.findMany({
            where: {
              status: BookingStatus.RESERVED,
              startTime: {
                lt: range.end
              },
              endTime: {
                gt: range.start
              }
            },
            orderBy: {
              startTime: "asc"
            }
          }),
          prisma.deviceBooking.findMany({
            where: {
              status: BookingStatus.RESERVED,
              startTime: {
                lt: range.end
              },
              endTime: {
                gt: range.start
              }
            },
            orderBy: {
              startTime: "asc"
            }
          }),
          prisma.visitBooking.findMany({
            where: {
              status: BookingStatus.RESERVED,
              startTime: {
                lt: range.end
              },
              endTime: {
                gt: range.start
              }
            },
            orderBy: {
              startTime: "asc"
            }
          }),
          prisma.device.findMany({
            where: {
              status: DeviceStatus.FAULT
            },
            orderBy: {
              createdAt: "desc"
            }
          }),
          prisma.workOrder.findMany({
            where: {
              status: {
                in: [WorkOrderStatus.OPEN, WorkOrderStatus.IN_PROGRESS]
              }
            },
            orderBy: {
              createdAt: "desc"
            }
          })
        ]);

      return {
        todayZoneBookings,
        todayDeviceBookings,
        todayVisitBookings,
        faultDevices,
        pendingWorkOrders
      };
    }
  };
}
