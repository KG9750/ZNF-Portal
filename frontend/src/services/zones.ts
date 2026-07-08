import { createApiUrl } from "./api.js";

export type ZoneStatus = "ACTIVE" | "INACTIVE";
export type BookingStatus = "RESERVED" | "CANCELLED";

export interface Zone {
  id: string;
  name: string;
  type: string;
  status: ZoneStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ZoneBooking {
  id: string;
  zoneId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
}

interface ApiRequestOptions {
  apiFetch?: typeof fetch;
  signal?: AbortSignal;
}

export async function getZones(options: ApiRequestOptions = {}): Promise<Zone[]> {
  return parseArray(await requestJson("/zones", "Zone API request failed", options), "zones", parseZone);
}

export async function getZoneBookings(options: ApiRequestOptions = {}): Promise<ZoneBooking[]> {
  return parseArray(
    await requestJson("/zone-bookings", "Zone booking API request failed", options),
    "zoneBookings",
    parseZoneBooking
  );
}

async function requestJson(path: string, errorPrefix: string, options: ApiRequestOptions): Promise<unknown> {
  const apiFetch = options.apiFetch ?? fetch;
  const response = await apiFetch(createApiUrl(path), {
    signal: options.signal
  });

  if (!response.ok) {
    throw new Error(await createApiRequestError(response, errorPrefix));
  }

  return await response.json() as unknown;
}

function parseZone(value: unknown, fieldName: string): Zone {
  const record = parseRecord(value, fieldName);

  return {
    id: parseString(record.id, `${fieldName}.id`),
    name: parseString(record.name, `${fieldName}.name`),
    type: parseString(record.type, `${fieldName}.type`),
    status: parseZoneStatus(record.status, `${fieldName}.status`),
    createdAt: parseString(record.createdAt, `${fieldName}.createdAt`),
    updatedAt: parseString(record.updatedAt, `${fieldName}.updatedAt`)
  };
}

function parseZoneBooking(value: unknown, fieldName: string): ZoneBooking {
  const record = parseRecord(value, fieldName);

  return {
    id: parseString(record.id, `${fieldName}.id`),
    zoneId: parseString(record.zoneId, `${fieldName}.zoneId`),
    startTime: parseString(record.startTime, `${fieldName}.startTime`),
    endTime: parseString(record.endTime, `${fieldName}.endTime`),
    status: parseBookingStatus(record.status, `${fieldName}.status`)
  };
}

function parseArray<TItem>(value: unknown, fieldName: string, parseItem: (item: unknown, itemName: string) => TItem): TItem[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} API response is invalid`);
  }

  return value.map((item, index) => parseItem(item, `${fieldName}[${index}]`));
}

function parseRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${fieldName} API response is invalid`);
  }

  return value;
}

function parseString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} API response is invalid`);
  }

  return value;
}

function parseZoneStatus(value: unknown, fieldName: string): ZoneStatus {
  if (value === "ACTIVE" || value === "INACTIVE") {
    return value;
  }

  throw new Error(`${fieldName} API response is invalid`);
}

function parseBookingStatus(value: unknown, fieldName: string): BookingStatus {
  if (value === "RESERVED" || value === "CANCELLED") {
    return value;
  }

  throw new Error(`${fieldName} API response is invalid`);
}

async function createApiRequestError(response: Response, prefix: string): Promise<string> {
  const fallback = `${prefix}: ${response.status}`;

  try {
    const body = await response.json() as unknown;

    if (isRecord(body)) {
      if (typeof body.error === "string") {
        return `${fallback} - ${body.error}`;
      }

      if (typeof body.message === "string") {
        return `${fallback} - ${body.message}`;
      }
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}