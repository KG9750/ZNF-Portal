import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { BookingStatus, PrismaClient } from "@prisma/client";

import { BookingConflictError } from "../src/modules/conflict/conflict.service.js";
import { createVisitBookingRepository } from "../src/modules/visit-booking/visit-booking.repository.js";

test("VisitBookingRepository creates, lists, and cancels visits with SQLite", async () => {
  const dbDir = await mkdtemp(join(tmpdir(), "znf-visit-booking-"));
  const databaseUrl = `file:${join(dbDir, "test.db")}`;
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE visit_booking (
        id TEXT PRIMARY KEY,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        visitor_org TEXT NOT NULL,
        visitor_count INTEGER NOT NULL,
        need_demo BOOLEAN NOT NULL DEFAULT false,
        status TEXT NOT NULL DEFAULT 'RESERVED',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const repository = createVisitBookingRepository(prisma);
    const booking = await repository.create({
      startTime: new Date("2026-01-01T10:00:00.000Z"),
      endTime: new Date("2026-01-01T11:00:00.000Z"),
      visitorOrg: "Acme Labs",
      visitorCount: 12,
      needDemo: true
    });
    const bookings = await repository.findMany();
    const cancelled = await repository.cancel(booking.id);
    const cancelledAgain = await repository.cancel(booking.id);
    const missing = await repository.cancel("missing");

    assert.equal(booking.status, BookingStatus.RESERVED);
    assert.equal(booking.needDemo, true);
    assert.equal(bookings.length, 1);
    assert.equal(cancelled?.status, BookingStatus.CANCELLED);
    assert.equal(cancelledAgain?.updatedAt.getTime(), cancelled?.updatedAt.getTime());
    assert.equal(missing, null);
  } finally {
    await prisma.$disconnect();
    await rm(dbDir, { recursive: true, force: true });
  }
});

test("VisitBookingRepository rejects overlapping reserved visits with SQLite", async () => {
  const dbDir = await mkdtemp(join(tmpdir(), "znf-visit-booking-conflict-"));
  const databaseUrl = `file:${join(dbDir, "test.db")}`;
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE visit_booking (
        id TEXT PRIMARY KEY,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        visitor_org TEXT NOT NULL,
        visitor_count INTEGER NOT NULL,
        need_demo BOOLEAN NOT NULL DEFAULT false,
        status TEXT NOT NULL DEFAULT 'RESERVED',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const repository = createVisitBookingRepository(prisma);
    const booking = await repository.create({
      startTime: new Date("2026-01-01T10:00:00.000Z"),
      endTime: new Date("2026-01-01T11:00:00.000Z"),
      visitorOrg: "Acme Labs",
      visitorCount: 12,
      needDemo: false
    });
    const adjacent = await repository.create({
      startTime: new Date("2026-01-01T11:00:00.000Z"),
      endTime: new Date("2026-01-01T12:00:00.000Z"),
      visitorOrg: "Beta Labs",
      visitorCount: 6,
      needDemo: true
    });

    await assert.rejects(
      () =>
        repository.create({
          startTime: new Date("2026-01-01T10:30:00.000Z"),
          endTime: new Date("2026-01-01T11:30:00.000Z"),
          visitorOrg: "Overlap Labs",
          visitorCount: 4,
          needDemo: false
        }),
      BookingConflictError
    );

    await repository.cancel(booking.id);
    const replacement = await repository.create({
      startTime: new Date("2026-01-01T10:30:00.000Z"),
      endTime: new Date("2026-01-01T10:45:00.000Z"),
      visitorOrg: "Replacement Labs",
      visitorCount: 3,
      needDemo: false
    });

    assert.equal(adjacent.status, BookingStatus.RESERVED);
    assert.equal(replacement.status, BookingStatus.RESERVED);
    assert.equal(await countVisitBookings(prisma), 3);
  } finally {
    await prisma.$disconnect();
    await rm(dbDir, { recursive: true, force: true });
  }
});

async function countVisitBookings(prisma: PrismaClient): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: number | bigint }>>`
    SELECT COUNT(*) AS count FROM visit_booking
  `;
  const count = rows[0]?.count ?? 0;

  return typeof count === "bigint" ? Number(count) : count;
}
