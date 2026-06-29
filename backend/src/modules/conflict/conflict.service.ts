import type {
  ConflictRepository,
  ConflictWriteGuard,
  DeviceConflictInput,
  ZoneConflictInput
} from "./conflict.types.js";

export class ConflictValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictValidationError";
  }
}

export class BookingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingConflictError";
  }
}

export class ConflictService implements ConflictWriteGuard {
  constructor(private readonly repository: ConflictRepository) {}

  async hasZoneConflict(input: unknown): Promise<boolean> {
    return this.repository.hasZoneConflict(parseZoneConflictInput(input));
  }

  async hasDeviceConflict(input: unknown): Promise<boolean> {
    return this.repository.hasDeviceConflict(parseDeviceConflictInput(input));
  }

  async assertZoneAvailable(input: unknown): Promise<void> {
    const data = parseZoneConflictInput(input);

    if (await this.repository.hasZoneConflict(data)) {
      throw new BookingConflictError("Zone booking conflicts with existing reservation");
    }
  }

  async assertDeviceAvailable(input: unknown): Promise<void> {
    const data = parseDeviceConflictInput(input);

    if (await this.repository.hasDeviceConflict(data)) {
      throw new BookingConflictError("Device booking conflicts with existing reservation");
    }
  }
}

export function createConflictService(repository: ConflictRepository): ConflictService {
  return new ConflictService(repository);
}

function parseZoneConflictInput(input: unknown): ZoneConflictInput {
  const record = readRecord(input);
  const timeWindow = readTimeWindow(record);

  return {
    zoneId: readRequiredString(record, "zoneId"),
    ...timeWindow
  };
}

function parseDeviceConflictInput(input: unknown): DeviceConflictInput {
  const record = readRecord(input);
  const timeWindow = readTimeWindow(record);

  return {
    deviceId: readRequiredString(record, "deviceId"),
    ...timeWindow
  };
}

function readTimeWindow(input: Record<string, unknown>): { startTime: Date; endTime: Date } {
  const startTime = readRequiredDate(input, "startTime");
  const endTime = readRequiredDate(input, "endTime");

  if (startTime >= endTime) {
    throw new ConflictValidationError("startTime must be before endTime");
  }

  return {
    startTime,
    endTime
  };
}

function readRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ConflictValidationError("Conflict payload must be an object");
  }

  return input as Record<string, unknown>;
}

function readRequiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new ConflictValidationError(`${key} must be a non-empty string`);
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
    throw new ConflictValidationError(`${key} must be a valid date`);
  }

  return date;
}
