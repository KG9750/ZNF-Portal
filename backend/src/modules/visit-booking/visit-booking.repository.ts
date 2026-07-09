import { BookingStatus, Prisma, type PrismaClient } from "@prisma/client";

import { createConflictRepository } from "../conflict/conflict.repository.js";
import { createConflictService } from "../conflict/conflict.service.js";
import type { CreateVisitBookingInput, VisitBookingRepository } from "./visit-booking.types.js";

export function createVisitBookingRepository(prisma: PrismaClient): VisitBookingRepository {
  return {
    create(input: CreateVisitBookingInput) {
      return prisma.$transaction(async tx => {
        await createConflictService(createConflictRepository(tx)).assertVisitAvailable(input);

        return tx.visitBooking.create({
          data: {
            startTime: input.startTime,
            endTime: input.endTime,
            visitorOrg: input.visitorOrg,
            visitorCount: input.visitorCount,
            needDemo: input.needDemo ?? false,
            status: BookingStatus.RESERVED
          }
        });
      });
    },
    findMany() {
      return prisma.visitBooking.findMany({
        orderBy: {
          createdAt: "desc"
        }
      });
    },
    async cancel(id: string) {
      const existing = await prisma.visitBooking.findUnique({
        where: {
          id
        }
      });

      if (existing === null || existing.status === BookingStatus.CANCELLED) {
        return existing;
      }

      try {
        return await prisma.visitBooking.update({
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
