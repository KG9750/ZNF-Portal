import type { VisitRecord } from "@prisma/client";

export interface CreateVisitRecordInput {
  visitBookingId: string;
  actualStartTime: Date;
  actualEndTime: Date;
  actualVisitorCount: number;
}

export interface VisitRecordRepository {
  create(input: CreateVisitRecordInput): Promise<VisitRecord | null>;
  findMany(): Promise<VisitRecord[]>;
}
