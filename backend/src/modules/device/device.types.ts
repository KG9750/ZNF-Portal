import type { Device, DeviceStatus } from "@prisma/client";

export interface CreateDeviceInput {
  name: string;
  type: string;
  homeZoneId: string;
  currentZoneId: string;
  status?: DeviceStatus;
}

export interface UpdateDeviceStatusInput {
  status: DeviceStatus;
}

export interface DeviceRepository {
  create(input: CreateDeviceInput): Promise<Device>;
  findMany(): Promise<Device[]>;
  findById(id: string): Promise<Device | null>;
  updateStatus(id: string, input: UpdateDeviceStatusInput): Promise<Device | null>;
  findExistingZoneIds(ids: string[]): Promise<string[]>;
}
