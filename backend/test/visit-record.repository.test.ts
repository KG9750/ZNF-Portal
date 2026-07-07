import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { BookingStatus, PrismaClient } from "@prisma/client";

import { createVisitRecordRepository } from "../src/modules/visit-record/visit-record.repository.js";

test("VisitRecordRepository creates and lists execution records with SQLite", async () => {
  const dbDir = await mkdtemp(join(tmpdir(), "znf-visit-record-"));
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
    await prisma.$executeRawUnsafe(`
      CREATE TABLE visit_record (
        id TEXT PRIMARY KEY,
        visit_booking_id TEXT NOT NULL UNIQUE,
        actual_start_time DATETIME NOT NULL,
        actual_end_time DATETIME NOT NULL,
        actual_visitor_count INTEGER NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.visitBooking.create({
      data: {
        id: "visit-booking-1",
        startTime: new Date("2026-01-01T10:00:00.000Z"),
        endTime: new Date("2026-01-01T11:00:00.000Z"),
        visitorOrg: "Acme Labs",
        visitorCount: 12
      }
    });
    await prisma.visitBooking.create({
      data: {
        id: "visit-booking-2",
        startTime: new Date("2026-01-01T12:00:00.000Z"),
        endTime: new Date("2026-01-01T13:00:00.000Z"),
        visitorOrg: "Acme Labs",
        visitorCount: 8,
        status: BookingStatus.CANCELLED
      }
    });

    const repository = createVisitRecordRepository(prisma);
    const record = await repository.create({
      visitBookingId: "visit-booking-1",
      actualStartTime: new Date("2026-01-01T10:05:00.000Z"),
      actualEndTime: new Date("2026-01-01T10:55:00.000Z"),
      actualVisitorCount: 10
    });
    const records = await repository.findMany();
    const duplicate = await repository.create({
      visitBookingId: "visit-booking-1",
      actualStartTime: new Date("2026-01-01T10:10:00.000Z"),
      actualEndTime: new Date("2026-01-01T10:50:00.000Z"),
      actualVisitorCount: 9
    });
    const missing = await repository.create({
      visitBookingId: "missing",
      actualStartTime: new Date("2026-01-01T10:05:00.000Z"),
      actualEndTime: new Date("2026-01-01T10:55:00.000Z"),
      actualVisitorCount: 10
    });
    const cancelled = await repository.create({
      visitBookingId: "visit-booking-2",
      actualStartTime: new Date("2026-01-01T12:05:00.000Z"),
      actualEndTime: new Date("2026-01-01T12:55:00.000Z"),
      actualVisitorCount: 8
    });

    assert.equal(record?.visitBookingId, "visit-booking-1");
    assert.equal(record?.actualVisitorCount, 10);
    assert.equal(records.length, 1);
    assert.equal(duplicate, null);
    assert.equal(missing, null);
    assert.equal(cancelled, null);
  } finally {
    await prisma.$disconnect();
    await rm(dbDir, { recursive: true, force: true });
  }
});
