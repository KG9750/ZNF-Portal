import type { InquiryRecord } from "@prisma/client";

import type { CreateInquiryRecordInput, InquiryRecordRepository } from "./inquiry-record.types.js";

export class InquiryRecordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InquiryRecordValidationError";
  }
}

export class InquiryRecordService {
  constructor(private readonly repository: InquiryRecordRepository) {}

  async create(input: unknown): Promise<InquiryRecord> {
    return this.repository.create(parseCreateInquiryRecordInput(input));
  }

  list(): Promise<InquiryRecord[]> {
    return this.repository.findMany();
  }
}

export function createInquiryRecordService(repository: InquiryRecordRepository): InquiryRecordService {
  return new InquiryRecordService(repository);
}

function parseCreateInquiryRecordInput(input: unknown): CreateInquiryRecordInput {
  if (!isRecord(input)) {
    throw new InquiryRecordValidationError("InquiryRecord payload must be an object");
  }

  return {
    orgName: readRequiredString(input, "orgName"),
    contact: readRequiredString(input, "contact"),
    source: readRequiredString(input, "source"),
    note: readRequiredString(input, "note")
  };
}

function readRequiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new InquiryRecordValidationError(`${key} must be a non-empty string`);
  }

  return value.trim();
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
