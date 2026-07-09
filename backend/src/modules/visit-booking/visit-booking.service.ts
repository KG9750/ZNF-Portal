import type { VisitBooking } from "@prisma/client";

import type { CreateVisitBookingInput, VisitBookingRepository } from "./visit-booking.types.js";

const TIMEZONE_AWARE_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/i;

export class VisitBookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisitBookingValidationError";
  }
}

export class VisitBookingService {
  constructor(private readonly repository: VisitBookingRepository) {}

  async create(input: unknown): Promise<VisitBooking> {
    return this.repository.create(parseCreateVisitBookingInput(input));
  }

  list(): Promise<VisitBooking[]> {
    return this.repository.findMany();
  }

  async cancel(id: string): Promise<VisitBooking | null> {
    assertId(id);
    return this.repository.cancel(id);
  }
}

export function createVisitBookingService(repository: VisitBookingRepository): VisitBookingService {
  return new VisitBookingService(repository);
}

function parseCreateVisitBookingInput(input: unknown): CreateVisitBookingInput {
  if (!isRecord(input)) {
    throw new VisitBookingValidationError("VisitBooking payload must be an object");
  }

  const startTime = readRequiredDate(input, "startTime");
  const endTime = readRequiredDate(input, "endTime");

  if (startTime >= endTime) {
    throw new VisitBookingValidationError("startTime must be before endTime");
  }

  return {
    startTime,
    endTime,
    visitorOrg: readRequiredString(input, "visitorOrg"),
    visitorCount: readPositiveInteger(input, "visitorCount"),
    needDemo: readOptionalBoolean(input, "needDemo")
  };
}

function readRequiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new VisitBookingValidationError(`${key} must be a non-empty string`);
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
    throw new VisitBookingValidationError(`${key} must be a valid date`);
  }

  return date;
}

function readTimezoneAwareDate(value: string, key: string): Date {
  if (!hasTimezoneOffset(value)) {
    throw new VisitBookingValidationError(`${key} must include a timezone offset`);
  }

  const date = new Date(value);

  if (!isValidTimezoneAwareDateTime(value) || Number.isNaN(date.getTime())) {
    throw new VisitBookingValidationError(`${key} must be a valid date`);
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

function readPositiveInteger(input: Record<string, unknown>, key: string): number {
  const value = input[key];

  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new VisitBookingValidationError(`${key} must be a positive integer`);
  }

  return value;
}

function readOptionalBoolean(input: Record<string, unknown>, key: string): boolean | undefined {
  if (!(key in input) || input[key] === undefined) {
    return undefined;
  }

  if (typeof input[key] !== "boolean") {
    throw new VisitBookingValidationError(`${key} must be a boolean`);
  }

  return input[key];
}

function assertId(id: string): void {
  if (id.trim() === "") {
    throw new VisitBookingValidationError("id must be a non-empty string");
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
