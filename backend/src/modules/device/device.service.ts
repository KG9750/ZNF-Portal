import { DeviceStatus, type Device } from "@prisma/client";

import type { CreateDeviceInput, DeviceRepository, UpdateDeviceStatusInput } from "./device.types.js";

export class DeviceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeviceValidationError";
  }
}

export class DeviceService {
  constructor(private readonly repository: DeviceRepository) {}

  async create(input: unknown): Promise<Device> {
    const data = parseCreateDeviceInput(input);
    await assertZonesExist(this.repository, data.homeZoneId, data.currentZoneId);
    return this.repository.create(data);
  }

  list(): Promise<Device[]> {
    return this.repository.findMany();
  }

  async get(id: string): Promise<Device | null> {
    assertId(id);
    return this.repository.findById(id);
  }

  async updateStatus(id: string, input: unknown): Promise<Device | null> {
    assertId(id);
    const data = parseUpdateDeviceStatusInput(input);
    return this.repository.updateStatus(id, data);
  }
}

export function createDeviceService(repository: DeviceRepository): DeviceService {
  return new DeviceService(repository);
}

function parseCreateDeviceInput(input: unknown): CreateDeviceInput {
  if (!isRecord(input)) {
    throw new DeviceValidationError("Device payload must be an object");
  }

  const name = readRequiredString(input, "name");
  const type = readRequiredString(input, "type");
  const homeZoneId = readRequiredString(input, "homeZoneId");
  const currentZoneId = readRequiredString(input, "currentZoneId");
  const status = readOptionalStatus(input);

  return {
    name,
    type,
    homeZoneId,
    currentZoneId,
    ...(status === undefined ? {} : { status })
  };
}

function parseUpdateDeviceStatusInput(input: unknown): UpdateDeviceStatusInput {
  if (!isRecord(input)) {
    throw new DeviceValidationError("Device payload must be an object");
  }

  if (!("status" in input)) {
    throw new DeviceValidationError("status must be provided");
  }

  return {
    status: readStatus(input.status)
  };
}

async function assertZonesExist(repository: DeviceRepository, homeZoneId: string, currentZoneId: string): Promise<void> {
  const existingZoneIds = new Set(await repository.findExistingZoneIds([homeZoneId, currentZoneId]));

  if (!existingZoneIds.has(homeZoneId)) {
    throw new DeviceValidationError("homeZoneId must reference an existing Zone");
  }

  if (!existingZoneIds.has(currentZoneId)) {
    throw new DeviceValidationError("currentZoneId must reference an existing Zone");
  }
}

function readRequiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new DeviceValidationError(`${key} must be a non-empty string`);
  }

  return value.trim();
}

function readOptionalStatus(input: Record<string, unknown>): DeviceStatus | undefined {
  if (!("status" in input) || input.status === undefined) {
    return undefined;
  }

  return readStatus(input.status);
}

function readStatus(value: unknown): DeviceStatus {
  if (
    value !== DeviceStatus.AVAILABLE &&
    value !== DeviceStatus.IN_USE &&
    value !== DeviceStatus.FAULT &&
    value !== DeviceStatus.MAINTENANCE
  ) {
    throw new DeviceValidationError("status must be AVAILABLE, IN_USE, FAULT, or MAINTENANCE");
  }

  return value;
}

function assertId(id: string): void {
  if (id.trim() === "") {
    throw new DeviceValidationError("id must be a non-empty string");
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
