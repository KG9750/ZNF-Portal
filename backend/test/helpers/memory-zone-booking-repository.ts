import { BookingStatus, type ZoneBooking } from "@prisma/client";

import { BookingConflictError } from "../../src/modules/conflict/conflict.service.js";
import type {
  CreateZoneBookingInput,
  ZoneBookingRepository
} from "../../src/modules/zone-booking/zone-booking.types.js";

export function createMemoryZoneBookingRepository(zoneIds = ["zone-1"]): ZoneBookingRepository {
  const zones = new Set(zoneIds);
  const bookings = new Map<string, ZoneBooking>();

  return {
    async create(input: CreateZoneBookingInput) {
      if (!zones.has(input.zoneId)) {
        return null;
      }

      if (hasConflict([...bookings.values()], input)) {
        throw new BookingConflictError("Zone booking conflicts with existing reservation");
      }

      const now = new Date();
      const booking: ZoneBooking = {
        id: `zone-booking-${bookings.size + 1}`,
        zoneId: input.zoneId,
        startTime: input.startTime,
        endTime: input.endTime,
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

      const cancelled: ZoneBooking = {
        ...existing,
        status: BookingStatus.CANCELLED,
        updatedAt: new Date()
      };

      bookings.set(id, cancelled);
      return cancelled;
    }
  };
}

function hasConflict(bookings: ZoneBooking[], input: CreateZoneBookingInput): boolean {
  return bookings.some(
    booking =>
      booking.zoneId === input.zoneId &&
      booking.status === BookingStatus.RESERVED &&
      input.startTime < booking.endTime &&
      input.endTime > booking.startTime
  );
}
