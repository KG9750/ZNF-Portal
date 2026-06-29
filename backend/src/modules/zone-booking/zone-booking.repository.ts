import { BookingStatus, Prisma, type PrismaClient } from "@prisma/client";

import { createConflictRepository } from "../conflict/conflict.repository.js";
import { createConflictService } from "../conflict/conflict.service.js";
import type { CreateZoneBookingInput, ZoneBookingRepository } from "./zone-booking.types.js";

export function createZoneBookingRepository(prisma: PrismaClient): ZoneBookingRepository {
  return {
    create(input: CreateZoneBookingInput) {
      return prisma.$transaction(async tx => {
        const zone = await tx.zone.findUnique({
          where: {
            id: input.zoneId
          },
          select: {
            id: true
          }
        });

        if (zone === null) {
          return null;
        }

        await createConflictService(createConflictRepository(tx)).assertZoneAvailable(input);

        return tx.zoneBooking.create({
          data: {
            zoneId: input.zoneId,
            startTime: input.startTime,
            endTime: input.endTime,
            status: BookingStatus.RESERVED
          }
        });
      });
    },
    findMany() {
      return prisma.zoneBooking.findMany({
        orderBy: {
          createdAt: "desc"
        }
      });
    },
    async cancel(id: string) {
      const existing = await prisma.zoneBooking.findUnique({
        where: {
          id
        }
      });

      if (existing === null || existing.status === BookingStatus.CANCELLED) {
        return existing;
      }

      try {
        return await prisma.zoneBooking.update({
          where: {
            id: existing.id
          },
          data: {
            status: BookingStatus.CANCELLED
          }
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
          return null;
        }

        throw error;
      }
    }
  };
}
