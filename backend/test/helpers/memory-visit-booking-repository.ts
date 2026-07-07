import { BookingStatus, type VisitBooking } from "@prisma/client";

import type {
  CreateVisitBookingInput,
  VisitBookingRepository
} from "../../src/modules/visit-booking/visit-booking.types.js";

export function createMemoryVisitBookingRepository(): VisitBookingRepository {
  const bookings = new Map<string, VisitBooking>();

  return {
    async create(input: CreateVisitBookingInput) {
      const now = new Date();
      const booking: VisitBooking = {
        id: `visit-booking-${bookings.size + 1}`,
        startTime: input.startTime,
        endTime: input.endTime,
        visitorOrg: input.visitorOrg,
        visitorCount: input.visitorCount,
        needDemo: input.needDemo ?? false,
        status: BookingStatus.RESERVED,
        createdAt: now,
        updatedAt: now
      };

      bookings.set(booking.id, booking);
      return booking;
    },
    async findMany() {
      return [...bookings.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async cancel(id: string) {
      const existing = bookings.get(id);

      if (existing === undefined) {
        return null;
      }

      if (existing.status === BookingStatus.CANCELLED) {
        return existing;
      }

      const cancelled: VisitBooking = {
        ...existing,
        status: BookingStatus.CANCELLED,
        updatedAt: new Date()
      };

      bookings.set(id, cancelled);
      return cancelled;
    }
  };
}
