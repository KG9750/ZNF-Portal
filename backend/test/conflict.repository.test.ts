import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

import { createConflictRepository } from "../src/modules/conflict/conflict.repository.js";

test("ConflictRepository checks Zone and Device overlaps with SQLite-backed SQL", async () => {
  const dbDir = await mkdtemp(join(tmpdir(), "znf-conflict-"));
  const databaseUrl = `file:${join(dbDir, "test.db")}`;
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  try {
    const repository = createConflictRepository(prisma);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE zone_booking (
        id TEXT PRIMARY KEY,
        zone_id TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status TEXT NOT NULL
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE device_booking (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        zone_id TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status TEXT NOT NULL
      )
    `);

    await prisma.$executeRaw`
      INSERT INTO zone_booking (id, zone_id, start_time, end_time, status)
      VALUES (
        'zone-booking-1',
        'zone-1',
        ${new Date("2026-01-01T10:00:00.000Z")},
        ${new Date("2026-01-01T11:00:00.000Z")},
        'RESERVED'
      )
    `;
    await prisma.$executeRaw`
      INSERT INTO device_booking (id, device_id, zone_id, start_time, end_time, status)
      VALUES (
        'device-booking-1',
        'device-1',
        'zone-1',
        ${new Date("2026-01-01T12:00:00.000Z")},
        ${new Date("2026-01-01T13:00:00.000Z")},
        'RESERVED'
      )
    `;
    await prisma.$executeRaw`
      INSERT INTO zone_booking (id, zone_id, start_time, end_time, status)
      VALUES (
        'zone-booking-2',
        'zone-1',
        ${new Date("2026-01-01T14:00:00.000Z")},
        ${new Date("2026-01-01T15:00:00.000Z")},
        'CANCELLED'
      )
    `;

    assert.equal(
      await repository.hasZoneConflict({
        zoneId: "zone-1",
        startTime: new Date("2026-01-01T10:30:00.000Z"),
        endTime: new Date("2026-01-01T11:30:00.000Z")
      }),
      true
    );
    assert.equal(
      await repository.hasZoneConflict({
        zoneId: "zone-1",
        startTime: new Date("2026-01-01T11:00:00.000Z"),
        endTime: new Date("2026-01-01T12:00:00.000Z")
      }),
      false
    );
    assert.equal(
      await repository.hasDeviceConflict({
        deviceId: "device-1",
        startTime: new Date("2026-01-01T12:30:00.000Z"),
        endTime: new Date("2026-01-01T13:30:00.000Z")
      }),
      true
    );
    assert.equal(
      await repository.hasZoneConflict({
        zoneId: "zone-1",
        startTime: new Date("2026-01-01T14:30:00.000Z"),
        endTime: new Date("2026-01-01T15:30:00.000Z")
      }),
      false
    );
  } finally {
    await prisma.$disconnect();
    await rm(dbDir, { recursive: true, force: true });
  }
});
