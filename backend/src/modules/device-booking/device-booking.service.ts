import type { DeviceBooking } from "@prisma/client";

import type { CreateDeviceBookingInput, DeviceBookingRepository } from "./device-booking.types.js";

export class DeviceBookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeviceBookingValidationError";
  }
}

export class DeviceBookingService {
  constructor(private readonly repository: DeviceBookingRepository) {}

  async create(input: unknown): Promise<DeviceBooking> {
    const data = parseCreateDeviceBookingInput(input);
    const booking = await this.repository.create(data);

    if (booking === null) {
      throw new DeviceBookingValidationError("deviceId must reference a Device bound to zoneId");
    }

    return booking;
  }

  list(): Promise<DeviceBooking[]> {
    return this.repository.findMany();
  }
}

export function createDeviceBookingService(repository: DeviceBookingRepository): DeviceBookingService {
  return new DeviceBookingService(repository);
}

function parseCreateDeviceBookingInput(input: unknown): CreateDeviceBookingInput {
  if (!isRecord(input)) {
    throw new DeviceBookingValidationError("DeviceBooking payload must be an object");
  }

  const deviceId = readRequiredString(input, "deviceId");
  const zoneId = readRequiredString(input, "zoneId");
  const startTime = readRequiredDate(input, "startTime");
  const endTime = readRequiredDate(input, "endTime");

  if (startTime >= endTime) {
    throw new DeviceBookingValidationError("startTime must be before endTime");
  }

  return {
    deviceId,
    zoneId,
    startTime,
    endTime
  };
}

function readRequiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new DeviceBookingValidationError(`${key} must be a non-empty string`);
  }

  return value.trim();
}

function readRequiredDate(input: Record<string, unknown>, key: string): Date {
  const value = input[key];
  const date =
    value instanceof Date
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? new Date(value)
        : typeof value === "number"
          ? new Date(value)
          : null;

  if (date === null || Number.isNaN(date.getTime())) {
    throw new DeviceBookingValidationError(`${key} must be a valid date`);
  }

  return date;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
