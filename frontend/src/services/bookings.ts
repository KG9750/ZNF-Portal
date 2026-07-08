import { isRecord, requestJson, type ApiRequestOptions } from "./api.js";

export type BookingStatus = "RESERVED" | "CANCELLED";

export interface ZoneBooking {
  id: string;
  zoneId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
}

export interface DeviceBooking {
  id: string;
  deviceId: string;
  zoneId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
}

export interface VisitBooking {
  id: string;
  startTime: string;
  endTime: string;
  visitorOrg: string;
  visitorCount: number;
  needDemo: boolean;
  status: BookingStatus;
}

export interface CreateZoneBookingInput {
  zoneId: string;
  startTime: string;
  endTime: string;
}

export interface CreateDeviceBookingInput {
  deviceId: string;
  zoneId: string;
  startTime: string;
  endTime: string;
}

export interface CreateVisitBookingInput {
  startTime: string;
  endTime: string;
  visitorOrg: string;
  visitorCount: number;
  needDemo: boolean;
}

interface MutationOptions {
  apiFetch?: typeof fetch;
}

export async function getZoneBookings(options: ApiRequestOptions = {}): Promise<ZoneBooking[]> {
  return parseArray(
    await requestJson("/zone-bookings", "ZoneBooking API request failed", options),
    "zoneBookings",
    parseZoneBooking
  );
}

export async function createZoneBooking(input: CreateZoneBookingInput, options: MutationOptions = {}): Promise<ZoneBooking> {
  return parseZoneBooking(
    await requestJson("/zone-bookings", "ZoneBooking API request failed", {
      apiFetch: options.apiFetch,
      body: input,
      method: "POST"
    }),
    "zoneBooking"
  );
}

export async function cancelZoneBooking(id: string, options: MutationOptions = {}): Promise<ZoneBooking> {
  return parseZoneBooking(
    await requestJson(`/zone-bookings/${id}/cancel`, "ZoneBooking API request failed", {
      apiFetch: options.apiFetch,
      method: "PATCH"
    }),
    "zoneBooking"
  );
}

export async function getDeviceBookings(options: ApiRequestOptions = {}): Promise<DeviceBooking[]> {
  return parseArray(
    await requestJson("/device-bookings", "DeviceBooking API request failed", options),
    "deviceBookings",
    parseDeviceBooking
  );
}

export async function createDeviceBooking(input: CreateDeviceBookingInput, options: MutationOptions = {}): Promise<DeviceBooking> {
  return parseDeviceBooking(
    await requestJson("/device-bookings", "DeviceBooking API request failed", {
      apiFetch: options.apiFetch,
      body: input,
      method: "POST"
    }),
    "deviceBooking"
  );
}

export async function getVisitBookings(options: ApiRequestOptions = {}): Promise<VisitBooking[]> {
  return parseArray(
    await requestJson("/visit-bookings", "VisitBooking API request failed", options),
    "visitBookings",
    parseVisitBooking
  );
}

export async function createVisitBooking(input: CreateVisitBookingInput, options: MutationOptions = {}): Promise<VisitBooking> {
  return parseVisitBooking(
    await requestJson("/visit-bookings", "VisitBooking API request failed", {
      apiFetch: options.apiFetch,
      body: input,
      method: "POST"
    }),
    "visitBooking"
  );
}

export async function cancelVisitBooking(id: string, options: MutationOptions = {}): Promise<VisitBooking> {
  return parseVisitBooking(
    await requestJson(`/visit-bookings/${id}/cancel`, "VisitBooking API request failed", {
      apiFetch: options.apiFetch,
      method: "PATCH"
    }),
    "visitBooking"
  );
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

function parseDeviceBooking(value: unknown, fieldName: string): DeviceBooking {
  const record = parseRecord(value, fieldName);

  return {
    id: parseString(record.id, `${fieldName}.id`),
    deviceId: parseString(record.deviceId, `${fieldName}.deviceId`),
    zoneId: parseString(record.zoneId, `${fieldName}.zoneId`),
    startTime: parseString(record.startTime, `${fieldName}.startTime`),
    endTime: parseString(record.endTime, `${fieldName}.endTime`),
    status: parseBookingStatus(record.status, `${fieldName}.status`)
  };
}

function parseVisitBooking(value: unknown, fieldName: string): VisitBooking {
  const record = parseRecord(value, fieldName);

  return {
    id: parseString(record.id, `${fieldName}.id`),
    startTime: parseString(record.startTime, `${fieldName}.startTime`),
    endTime: parseString(record.endTime, `${fieldName}.endTime`),
    visitorOrg: parseString(record.visitorOrg, `${fieldName}.visitorOrg`),
    visitorCount: parseNumber(record.visitorCount, `${fieldName}.visitorCount`),
    needDemo: parseBoolean(record.needDemo, `${fieldName}.needDemo`),
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

function parseNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number") {
    throw new Error(`${fieldName} API response is invalid`);
  }

  return value;
}

function parseBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} API response is invalid`);
  }

  return value;
}

function parseBookingStatus(value: unknown, fieldName: string): BookingStatus {
  if (value === "RESERVED" || value === "CANCELLED") {
    return value;
  }

  throw new Error(`${fieldName} API response is invalid`);
}
