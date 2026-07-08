import { isRecord, requestJson, type ApiRequestOptions } from "./api.js";

export type BookingStatus = "RESERVED" | "CANCELLED";
export type DeviceStatus = "AVAILABLE" | "IN_USE" | "FAULT" | "MAINTENANCE";
export type WorkOrderStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";
export type WorkOrderType = "FAULT" | "MAINTENANCE" | "CLEAN";

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

export interface Device {
  id: string;
  name: string;
  type: string;
  homeZoneId: string;
  currentZoneId: string;
  status: DeviceStatus;
}

export interface WorkOrder {
  id: string;
  type: WorkOrderType;
  deviceId: string | null;
  zoneId: string | null;
  status: WorkOrderStatus;
}

export interface DashboardOverview {
  todayZoneBookings: ZoneBooking[];
  todayDeviceBookings: DeviceBooking[];
  todayVisitBookings: VisitBooking[];
  faultDevices: Device[];
  pendingWorkOrders: WorkOrder[];
}

export async function getDashboardOverview(options: ApiRequestOptions = {}): Promise<DashboardOverview> {
  return parseDashboardOverview(await requestJson("/dashboard", "Dashboard API request failed", options));
}

function parseDashboardOverview(value: unknown): DashboardOverview {
  if (!isRecord(value)) {
    throw new Error("Dashboard API response is invalid");
  }

  const overview = {
    todayZoneBookings: parseArray(value.todayZoneBookings, "todayZoneBookings", parseZoneBooking),
    todayDeviceBookings: parseArray(value.todayDeviceBookings, "todayDeviceBookings", parseDeviceBooking),
    todayVisitBookings: parseArray(value.todayVisitBookings, "todayVisitBookings", parseVisitBooking),
    faultDevices: parseArray(value.faultDevices, "faultDevices", parseDevice),
    pendingWorkOrders: parseArray(value.pendingWorkOrders, "pendingWorkOrders", parseWorkOrder)
  };

  return overview;
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

function parseDevice(value: unknown, fieldName: string): Device {
  const record = parseRecord(value, fieldName);

  return {
    id: parseString(record.id, `${fieldName}.id`),
    name: parseString(record.name, `${fieldName}.name`),
    type: parseString(record.type, `${fieldName}.type`),
    homeZoneId: parseString(record.homeZoneId, `${fieldName}.homeZoneId`),
    currentZoneId: parseString(record.currentZoneId, `${fieldName}.currentZoneId`),
    status: parseDeviceStatus(record.status, `${fieldName}.status`)
  };
}

function parseWorkOrder(value: unknown, fieldName: string): WorkOrder {
  const record = parseRecord(value, fieldName);

  return {
    id: parseString(record.id, `${fieldName}.id`),
    type: parseWorkOrderType(record.type, `${fieldName}.type`),
    deviceId: parseNullableString(record.deviceId, `${fieldName}.deviceId`),
    zoneId: parseNullableString(record.zoneId, `${fieldName}.zoneId`),
    status: parseWorkOrderStatus(record.status, `${fieldName}.status`)
  };
}

function parseArray<TItem>(value: unknown, fieldName: string, parseItem: (item: unknown, itemName: string) => TItem): TItem[] {
  if (!Array.isArray(value)) {
    throw new Error(`Dashboard API response field ${fieldName} is invalid`);
  }

  return value.map((item, index) => parseItem(item, `${fieldName}[${index}]`));
}

function parseRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Dashboard API response field ${fieldName} is invalid`);
  }

  return value;
}

function parseString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`Dashboard API response field ${fieldName} is invalid`);
  }

  return value;
}

function parseNullableString(value: unknown, fieldName: string): string | null {
  if (value === null) {
    return null;
  }

  return parseString(value, fieldName);
}

function parseNumber(value: unknown, fieldName: string): number {
  if (typeof value !== "number") {
    throw new Error(`Dashboard API response field ${fieldName} is invalid`);
  }

  return value;
}

function parseBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Dashboard API response field ${fieldName} is invalid`);
  }

  return value;
}

function parseBookingStatus(value: unknown, fieldName: string): BookingStatus {
  if (value === "RESERVED" || value === "CANCELLED") {
    return value;
  }

  throw new Error(`Dashboard API response field ${fieldName} is invalid`);
}

function parseDeviceStatus(value: unknown, fieldName: string): DeviceStatus {
  if (value === "AVAILABLE" || value === "IN_USE" || value === "FAULT" || value === "MAINTENANCE") {
    return value;
  }

  throw new Error(`Dashboard API response field ${fieldName} is invalid`);
}

function parseWorkOrderStatus(value: unknown, fieldName: string): WorkOrderStatus {
  if (value === "OPEN" || value === "IN_PROGRESS" || value === "CLOSED") {
    return value;
  }

  throw new Error(`Dashboard API response field ${fieldName} is invalid`);
}

function parseWorkOrderType(value: unknown, fieldName: string): WorkOrderType {
  if (value === "FAULT" || value === "MAINTENANCE" || value === "CLEAN") {
    return value;
  }

  throw new Error(`Dashboard API response field ${fieldName} is invalid`);
}
