import { Prisma, type PrismaClient } from "@prisma/client";

import type { ConflictRepository, DeviceConflictInput, TimeWindowInput, ZoneConflictInput } from "./conflict.types.js";

type ConflictPrismaClient = Pick<PrismaClient, "$queryRaw">;

type ConflictQueryRow = {
  has_conflict: boolean | number | bigint | null;
};

export function createConflictRepository(prisma: ConflictPrismaClient): ConflictRepository {
  return {
    async hasZoneConflict(input: ZoneConflictInput) {
      const rows = await prisma.$queryRaw<ConflictQueryRow[]>(Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM zone_booking
          WHERE zone_id = ${input.zoneId}
            AND status = 'RESERVED'
            AND start_time < ${input.endTime}
            AND end_time > ${input.startTime}
        ) AS has_conflict
      `);

      return readHasConflict(rows);
    },
    async hasDeviceConflict(input: DeviceConflictInput) {
      const rows = await prisma.$queryRaw<ConflictQueryRow[]>(Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM device_booking
          WHERE device_id = ${input.deviceId}
            AND status = 'RESERVED'
            AND start_time < ${input.endTime}
            AND end_time > ${input.startTime}
        ) AS has_conflict
      `);

      return readHasConflict(rows);
    },
    async hasVisitConflict(input: TimeWindowInput) {
      const rows = await prisma.$queryRaw<ConflictQueryRow[]>(Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM visit_booking
          WHERE status = 'RESERVED'
            AND start_time < ${input.endTime}
            AND end_time > ${input.startTime}
        ) AS has_conflict
      `);

      return readHasConflict(rows);
    }
  };
}

function readHasConflict(rows: ConflictQueryRow[]): boolean {
  const value = rows[0]?.has_conflict ?? 0;
  return value === true || value === 1 || value === 1n;
}
