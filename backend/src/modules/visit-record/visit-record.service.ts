import type { VisitRecord } from "@prisma/client";

import type { CreateVisitRecordInput, VisitRecordRepository } from "./visit-record.types.js";

export class VisitRecordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisitRecordValidationError";
  }
}

export class VisitRecordService {
  constructor(private readonly repository: VisitRecordRepository) {}

  async create(input: unknown): Promise<VisitRecord> {
    const record = await this.repository.create(parseCreateVisitRecordInput(input));

    if (record === null) {
      throw new VisitRecordValidationError(
        "visitBookingId must reference a reserved VisitBooking without an existing VisitRecord"
      );
    }

    return record;
  }

  list(): Promise<VisitRecord[]> {
    return this.repository.findMany();
  }
}

export function createVisitRecordService(repository: VisitRecordRepository): VisitRecordService {
  return new VisitRecordService(repository);
}

function parseCreateVisitRecordInput(input: unknown): CreateVisitRecordInput {
  if (!isRecord(input)) {
    throw new VisitRecordValidationError("VisitRecord payload must be an object");
  }

  const visitBookingId = readRequiredString(input, "visitBookingId");
  const actualStartTime = readRequiredDate(input, "actualStartTime");
  const actualEndTime = readRequiredDate(input, "actualEndTime");

  if (actualStartTime >= actualEndTime) {
    throw new VisitRecordValidationError("actualStartTime must be before actualEndTime");
  }

  return {
    visitBookingId,
    actualStartTime,
    actualEndTime,
    actualVisitorCount: readPositiveInteger(input, "actualVisitorCount")
  };
}

function readRequiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new VisitRecordValidationError(`${key} must be a non-empty string`);
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
    throw new VisitRecordValidationError(`${key} must be a valid date`);
  }

  return date;
}

function readPositiveInteger(input: Record<string, unknown>, key: string): number {
  const value = input[key];

  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new VisitRecordValidationError(`${key} must be a positive integer`);
  }

  return value;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
