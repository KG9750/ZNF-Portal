import { createApiUrl } from "./api.js";

export type DeviceStatus = "AVAILABLE" | "IN_USE" | "FAULT" | "MAINTENANCE";

export interface Device {
  id: string;
  name: string;
  type: string;
  homeZoneId: string;
  currentZoneId: string;
  status: DeviceStatus;
  createdAt: string;
  updatedAt: string;
}

interface ApiRequestOptions {
  apiFetch?: typeof fetch;
  signal?: AbortSignal;
}

export async function getDevices(options: ApiRequestOptions = {}): Promise<Device[]> {
  const apiFetch = options.apiFetch ?? fetch;
  const response = await apiFetch(createApiUrl("/devices"), {
    signal: options.signal
  });

  if (!response.ok) {
    throw new Error(await createDeviceRequestError(response));
  }

  return parseArray(await response.json(), "devices", parseDevice);
}

function parseDevice(value: unknown, fieldName: string): Device {
  const record = parseRecord(value, fieldName);

  return {
    id: parseString(record.id, `${fieldName}.id`),
    name: parseString(record.name, `${fieldName}.name`),
    type: parseString(record.type, `${fieldName}.type`),
    homeZoneId: parseString(record.homeZoneId, `${fieldName}.homeZoneId`),
    currentZoneId: parseString(record.currentZoneId, `${fieldName}.currentZoneId`),
    status: parseDeviceStatus(record.status, `${fieldName}.status`),
    createdAt: parseString(record.createdAt, `${fieldName}.createdAt`),
    updatedAt: parseString(record.updatedAt, `${fieldName}.updatedAt`)
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

function parseDeviceStatus(value: unknown, fieldName: string): DeviceStatus {
  if (value === "AVAILABLE" || value === "IN_USE" || value === "FAULT" || value === "MAINTENANCE") {
    return value;
  }

  throw new Error(`${fieldName} API response is invalid`);
}

async function createDeviceRequestError(response: Response): Promise<string> {
  const fallback = `Device API request failed: ${response.status}`;

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
