import type { VisitBooking } from "@prisma/client";

export interface CreateVisitBookingInput {
  startTime: Date;
  endTime: Date;
  visitorOrg: string;
  visitorCount: number;
  needDemo?: boolean;
}

export interface VisitBookingRepository {
  create(input: CreateVisitBookingInput): Promise<VisitBooking>;
  findMany(): Promise<VisitBooking[]>;
  cancel(id: string): Promise<VisitBooking | null>;
}
