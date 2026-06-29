import type { ZoneBooking } from "@prisma/client";

import type { CreateZoneBookingInput, ZoneBookingRepository } from "./zone-booking.types.js";

export class ZoneBookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZoneBookingValidationError";
  }
}

export class ZoneBookingService {
  constructor(private readonly repository: ZoneBookingRepository) {}

  async create(input: unknown): Promise<ZoneBooking> {
    const data = parseCreateZoneBookingInput(input);
    const booking = await this.repository.create(data);

    if (booking === null) {
      throw new ZoneBookingValidationError("zoneId must reference an existing Zone");
    }

    return booking;
  }

  list(): Promise<ZoneBooking[]> {
    return this.repository.findMany();
  }

  async cancel(id: string): Promise<ZoneBooking | null> {
    assertId(id);
    return this.repository.cancel(id);
  }
}

export function createZoneBookingService(repository: ZoneBookingRepository): ZoneBookingService {
  return new ZoneBookingService(repository);
}

function parseCreateZoneBookingInput(input: unknown): CreateZoneBookingInput {
  if (!isRecord(input)) {
    throw new ZoneBookingValidationError("ZoneBooking payload must be an object");
  }

  const zoneId = readRequiredString(input, "zoneId");
  const startTime = readRequiredDate(input, "startTime");
  const endTime = readRequiredDate(input, "endTime");

  if (startTime >= endTime) {
    throw new ZoneBookingValidationError("startTime must be before endTime");
  }

  return {
    zoneId,
    startTime,
    endTime
  };
}

function readRequiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new ZoneBookingValidationError(`${key} must be a non-empty string`);
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
    throw new ZoneBookingValidationError(`${key} must be a valid date`);
  }

  return date;
}

function assertId(id: string): void {
  if (id.trim() === "") {
    throw new ZoneBookingValidationError("id must be a non-empty string");
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
