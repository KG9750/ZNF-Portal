import type { DeviceBooking } from "@prisma/client";

import type { CreateDeviceBookingInput, DeviceBookingRepository } from "./device-booking.types.js";

const TIMEZONE_AWARE_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/i;

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
        ? readTimezoneAwareDate(value.trim(), key)
        : null;

  if (date === null || Number.isNaN(date.getTime())) {
    throw new DeviceBookingValidationError(`${key} must be a valid date`);
  }

  return date;
}

function readTimezoneAwareDate(value: string, key: string): Date {
  if (!hasTimezoneOffset(value)) {
    throw new DeviceBookingValidationError(`${key} must include a timezone offset`);
  }

  const date = new Date(value);

  if (!isValidTimezoneAwareDateTime(value) || Number.isNaN(date.getTime())) {
    throw new DeviceBookingValidationError(`${key} must be a valid date`);
  }

  return date;
}

function hasTimezoneOffset(value: string): boolean {
  return /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
}

function isValidTimezoneAwareDateTime(value: string): boolean {
  const match = TIMEZONE_AWARE_DATE_TIME_PATTERN.exec(value);

  if (match === null) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59
  );
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
