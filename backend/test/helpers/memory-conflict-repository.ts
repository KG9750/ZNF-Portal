import type {
  ConflictRepository,
  DeviceConflictInput,
  TimeWindowInput,
  ZoneConflictInput
} from "../../src/modules/conflict/conflict.types.js";

interface MemoryZoneBooking extends TimeWindowInput {
  zoneId: string;
  status?: "RESERVED" | "CANCELLED";
}

interface MemoryDeviceBooking extends TimeWindowInput {
  deviceId: string;
  status?: "RESERVED" | "CANCELLED";
}

interface MemoryConflictRepositoryOptions {
  zoneBookings?: MemoryZoneBooking[];
  deviceBookings?: MemoryDeviceBooking[];
}

export function createMemoryConflictRepository(options: MemoryConflictRepositoryOptions = {}): ConflictRepository {
  const zoneBookings = options.zoneBookings ?? [];
  const deviceBookings = options.deviceBookings ?? [];

  return {
    async hasZoneConflict(input: ZoneConflictInput) {
      return zoneBookings.some(
        booking =>
          booking.zoneId === input.zoneId &&
          (booking.status ?? "RESERVED") === "RESERVED" &&
          input.startTime < booking.endTime &&
          input.endTime > booking.startTime
      );
    },
    async hasDeviceConflict(input: DeviceConflictInput) {
      return deviceBookings.some(
        booking =>
          booking.deviceId === input.deviceId &&
          (booking.status ?? "RESERVED") === "RESERVED" &&
          input.startTime < booking.endTime &&
          input.endTime > booking.startTime
      );
    }
  };
}
