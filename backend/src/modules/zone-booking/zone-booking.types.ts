import type { ZoneBooking } from "@prisma/client";

export interface CreateZoneBookingInput {
  zoneId: string;
  startTime: Date;
  endTime: Date;
}

export interface ZoneBookingRepository {
  create(input: CreateZoneBookingInput): Promise<ZoneBooking | null>;
  findMany(): Promise<ZoneBooking[]>;
  cancel(id: string): Promise<ZoneBooking | null>;
}
