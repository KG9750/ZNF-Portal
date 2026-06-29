import { ZoneStatus, type Zone } from "@prisma/client";

import type { CreateZoneInput, UpdateZoneInput, ZoneRepository } from "./zone.types.js";

export class ZoneValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZoneValidationError";
  }
}

export class ZoneService {
  constructor(private readonly repository: ZoneRepository) {}

  async create(input: unknown): Promise<Zone> {
    const data = parseCreateZoneInput(input);
    return this.repository.create(data);
  }

  list(): Promise<Zone[]> {
    return this.repository.findMany();
  }

  async get(id: string): Promise<Zone | null> {
    assertId(id);
    return this.repository.findById(id);
  }

  async update(id: string, input: unknown): Promise<Zone | null> {
    assertId(id);
    const data = parseUpdateZoneInput(input);
    return this.repository.update(id, data);
  }
}

export function createZoneService(repository: ZoneRepository): ZoneService {
  return new ZoneService(repository);
}

function parseCreateZoneInput(input: unknown): CreateZoneInput {
  if (!isRecord(input)) {
    throw new ZoneValidationError("Zone payload must be an object");
  }

  const name = readRequiredString(input, "name");
  const type = readRequiredString(input, "type");
  const status = readOptionalStatus(input);

  return {
    name,
    type,
    ...(status === undefined ? {} : { status })
  };
}

function parseUpdateZoneInput(input: unknown): UpdateZoneInput {
  if (!isRecord(input)) {
    throw new ZoneValidationError("Zone payload must be an object");
  }

  const data: UpdateZoneInput = {};

  if ("name" in input) {
    data.name = readRequiredString(input, "name");
  }

  if ("type" in input) {
    data.type = readRequiredString(input, "type");
  }

  const status = readOptionalStatus(input);

  if (status !== undefined) {
    data.status = status;
  }

  if (Object.keys(data).length === 0) {
    throw new ZoneValidationError("At least one Zone field must be provided");
  }

  return data;
}

function readRequiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new ZoneValidationError(`${key} must be a non-empty string`);
  }

  return value.trim();
}

function readOptionalStatus(input: Record<string, unknown>): ZoneStatus | undefined {
  if (!("status" in input) || input.status === undefined) {
    return undefined;
  }

  if (input.status !== ZoneStatus.ACTIVE && input.status !== ZoneStatus.INACTIVE) {
    throw new ZoneValidationError("status must be ACTIVE or INACTIVE");
  }

  return input.status;
}

function assertId(id: string): void {
  if (id.trim() === "") {
    throw new ZoneValidationError("id must be a non-empty string");
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
