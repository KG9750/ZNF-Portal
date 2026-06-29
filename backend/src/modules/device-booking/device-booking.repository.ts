import { BookingStatus, type PrismaClient } from "@prisma/client";

import { createConflictRepository } from "../conflict/conflict.repository.js";
import { createConflictService } from "../conflict/conflict.service.js";
import type { CreateDeviceBookingInput, DeviceBookingRepository } from "./device-booking.types.js";

export function createDeviceBookingRepository(prisma: PrismaClient): DeviceBookingRepository {
  return {
    create(input: CreateDeviceBookingInput) {
      return prisma.$transaction(async tx => {
        const device = await tx.device.findUnique({
          where: {
            id: input.deviceId
          },
          select: {
            id: true,
            currentZoneId: true
          }
        });

        if (device === null || device.currentZoneId !== input.zoneId) {
          return null;
        }

        await createConflictService(createConflictRepository(tx)).assertDeviceAvailable(input);

        return tx.deviceBooking.create({
          data: {
            deviceId: input.deviceId,
            zoneId: input.zoneId,
            startTime: input.startTime,
            endTime: input.endTime,
            status: BookingStatus.RESERVED
          }
        });
      });
    },
    findMany() {
      return prisma.deviceBooking.findMany({
        orderBy: {
          createdAt: "desc"
        }
      });
    }
  };
}
