import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { BookingStatus, PrismaClient } from "@prisma/client";

import { BookingConflictError } from "../src/modules/conflict/conflict.service.js";
import { createZoneBookingRepository } from "../src/modules/zone-booking/zone-booking.repository.js";

test("ZoneBookingRepository creates, rejects conflicts, lists, and cancels with SQLite", async () => {
  const dbDir = await mkdtemp(join(tmpdir(), "znf-zone-booking-"));
  const databaseUrl = `file:${join(dbDir, "test.db")}`;
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  try {
    await createTables(prisma);
    await prisma.$executeRaw`
      INSERT INTO zone (id, name, type, status, created_at, updated_at)
      VALUES (
        'zone-1',
        'Training Hall',
        'LAB',
        'ACTIVE',
        ${new Date("2026-01-01T00:00:00.000Z")},
        ${new Date("2026-01-01T00:00:00.000Z")}
      )
    `;

    const repository = createZoneBookingRepository(prisma);
    const booking = await repository.create({
      zoneId: "zone-1",
      startTime: new Date("2026-01-01T10:00:00.000Z"),
      endTime: new Date("2026-01-01T11:00:00.000Z")
    });
    const missingZoneBooking = await repository.create({
      zoneId: "missing-zone",
      startTime: new Date("2026-01-01T12:00:00.000Z"),
      endTime: new Date("2026-01-01T13:00:00.000Z")
    });
    const bookings = await repository.findMany();

    assert.notEqual(booking, null);
    assert.equal(booking?.zoneId, "zone-1");
    assert.equal(booking?.status, BookingStatus.RESERVED);
    assert.equal(missingZoneBooking, null);
    assert.equal(bookings.length, 1);

    await assert.rejects(
      () =>
        repository.create({
          zoneId: "zone-1",
          startTime: new Date("2026-01-01T10:30:00.000Z"),
          endTime: new Date("2026-01-01T11:30:00.000Z")
        }),
      BookingConflictError
    );

    const rowCountAfterConflict = await countZoneBookings(prisma);
    const cancelled = await repository.cancel(booking?.id ?? "");
    const cancelledAgain = await repository.cancel(booking?.id ?? "");
    const missingCancel = await repository.cancel("missing");

    assert.equal(rowCountAfterConflict, 1);
    assert.equal(cancelled?.status, BookingStatus.CANCELLED);
    assert.equal(cancelledAgain?.updatedAt.getTime(), cancelled?.updatedAt.getTime());
    assert.equal(missingCancel, null);
  } finally {
    await prisma.$disconnect();
    await rm(dbDir, { recursive: true, force: true });
  }
});

async function createTables(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE zone (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE zone_booking (
      id TEXT PRIMARY KEY,
      zone_id TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'RESERVED',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (zone_id) REFERENCES zone(id)
    )
  `);
}

async function countZoneBookings(prisma: PrismaClient): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: number | bigint }>>`
    SELECT COUNT(*) AS count FROM zone_booking
  `;
  const count = rows[0]?.count ?? 0;

  return typeof count === "bigint" ? Number(count) : count;
}
