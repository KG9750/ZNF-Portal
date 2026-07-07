import type { DeviceBooking } from "@prisma/client";

export interface CreateDeviceBookingInput {
  deviceId: string;
  zoneId: string;
  startTime: Date;
  endTime: Date;
}

export interface DeviceBookingRepository {
  create(input: CreateDeviceBookingInput): Promise<DeviceBooking | null>;
  findMany(): Promise<DeviceBooking[]>;
}
