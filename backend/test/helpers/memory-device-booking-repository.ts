import { BookingStatus, type DeviceBooking } from "@prisma/client";

import { createConflictService } from "../../src/modules/conflict/conflict.service.js";
import type {
  CreateDeviceBookingInput,
  DeviceBookingRepository
} from "../../src/modules/device-booking/device-booking.types.js";
import { createMemoryConflictRepository } from "./memory-conflict-repository.js";

export function createMemoryDeviceBookingRepository(deviceZones = new Map([["device-1", "zone-1"]])): DeviceBookingRepository {
  const bookings = new Map<string, DeviceBooking>();

  return {
    async create(input: CreateDeviceBookingInput) {
      if (deviceZones.get(input.deviceId) !== input.zoneId) {
        return null;
      }

      await createConflictService(createMemoryConflictRepository({ deviceBookings: [...bookings.values()] })).assertDeviceAvailable(input);

      const now = new Date();
      const booking: DeviceBooking = {
        id: `device-booking-${bookings.size + 1}`,
        deviceId: input.deviceId,
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
    }
  };
}
