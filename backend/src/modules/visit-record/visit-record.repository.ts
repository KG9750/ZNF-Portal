import { BookingStatus, Prisma, type PrismaClient } from "@prisma/client";

import type { CreateVisitRecordInput, VisitRecordRepository } from "./visit-record.types.js";

export function createVisitRecordRepository(prisma: PrismaClient): VisitRecordRepository {
  return {
    async create(input: CreateVisitRecordInput) {
      const booking = await prisma.visitBooking.findUnique({
        where: {
          id: input.visitBookingId
        }
      });

      if (booking === null || booking.status !== BookingStatus.RESERVED) {
        return null;
      }

      try {
        return await prisma.visitRecord.create({
          data: {
            visitBookingId: input.visitBookingId,
            actualStartTime: input.actualStartTime,
            actualEndTime: input.actualEndTime,
            actualVisitorCount: input.actualVisitorCount
          }
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return null;
        }

        throw error;
      }
    },
    findMany() {
      return prisma.visitRecord.findMany({
        orderBy: {
          createdAt: "desc"
        }
      });
    }
  };
}
