import { BookingStatus, type VisitRecord } from "@prisma/client";

import type {
  CreateVisitRecordInput,
  VisitRecordRepository
} from "../../src/modules/visit-record/visit-record.types.js";

export function createMemoryVisitRecordRepository(
  bookingStatuses = new Map<string, BookingStatus>()
): VisitRecordRepository {
  const records = new Map<string, VisitRecord>();

  return {
    async create(input: CreateVisitRecordInput) {
      if (bookingStatuses.get(input.visitBookingId) !== BookingStatus.RESERVED) {
        return null;
      }

      for (const record of records.values()) {
        if (record.visitBookingId === input.visitBookingId) {
          return null;
        }
      }

      const now = new Date();
      const record: VisitRecord = {
        id: `visit-record-${records.size + 1}`,
        visitBookingId: input.visitBookingId,
        actualStartTime: input.actualStartTime,
        actualEndTime: input.actualEndTime,
        actualVisitorCount: input.actualVisitorCount,
        createdAt: now,
        updatedAt: now
      };

      records.set(record.id, record);
      return record;
    },
    async findMany() {
      return [...records.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  };
}
