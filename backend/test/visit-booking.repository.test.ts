import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { BookingStatus, PrismaClient } from "@prisma/client";

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
