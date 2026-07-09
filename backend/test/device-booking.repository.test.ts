import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { BookingStatus, PrismaClient, type DeviceBooking } from "@prisma/client";

import { BookingConflictError } from "../src/modules/conflict/conflict.service.js";
import { createDeviceBookingRepository } from "../src/modules/device-booking/device-booking.repository.js";

test("DeviceBookingRepository creates, rejects conflicts, validates binding, and lists with SQLite", async () => {
  const dbDir = await mkdtemp(join(tmpdir(), "znf-device-booking-"));
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
    await seedDevice(prisma);

    const repository = createDeviceBookingRepository(prisma);
    const booking = await repository.create({
      deviceId: "device-1",
      zoneId: "zone-1",
      startTime: new Date("2026-01-01T10:00:00.000Z"),
      endTime: new Date("2026-01-01T11:00:00.000Z")
    });
    const mismatchedZoneBooking = await repository.create({
      deviceId: "device-1",
      zoneId: "zone-2",
      startTime: new Date("2026-01-01T12:00:00.000Z"),
      endTime: new Date("2026-01-01T13:00:00.000Z")
    });
    const bookings = await repository.findMany();

    assert.notEqual(booking, null);
    assert.equal(booking?.deviceId, "device-1");
    assert.equal(booking?.zoneId, "zone-1");
    assert.equal(booking?.status, BookingStatus.RESERVED);
    assert.equal(mismatchedZoneBooking, null);
    assert.equal(bookings.length, 1);

    await assert.rejects(
      () =>
        repository.create({
          deviceId: "device-1",
          zoneId: "zone-1",
          startTime: new Date("2026-01-01T10:30:00.000Z"),
          endTime: new Date("2026-01-01T11:30:00.000Z")
        }),
      BookingConflictError
    );

    const adjacent = await repository.create({
      deviceId: "device-1",
      zoneId: "zone-1",
      startTime: new Date("2026-01-01T11:00:00.000Z"),
      endTime: new Date("2026-01-01T12:00:00.000Z")
    });

    assert.equal(adjacent?.status, BookingStatus.RESERVED);
    assert.equal(await countDeviceBookings(prisma), 2);
  } finally {
    await prisma.$disconnect();
    await rm(dbDir, { recursive: true, force: true });
  }
});

test("DeviceBookingRepository serializes concurrent overlapping creates", async () => {
  const dbDir = await mkdtemp(join(tmpdir(), "znf-device-booking-concurrent-"));
  const databaseUrl = `file:${join(dbDir, "test.db")}`;
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
  let secondPrisma: PrismaClient | null = null;

  try {
    await createTables(prisma);
    await seedDevice(prisma);

    secondPrisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    });
    const repository = createDeviceBookingRepository(prisma);
    const secondRepository = createDeviceBookingRepository(secondPrisma);
    const results = await Promise.allSettled([
      repository.create({
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: new Date("2026-01-01T10:00:00.000Z"),
        endTime: new Date("2026-01-01T11:00:00.000Z")
      }),
      secondRepository.create({
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: new Date("2026-01-01T10:30:00.000Z"),
        endTime: new Date("2026-01-01T11:30:00.000Z")
      })
    ]);
    const adjacentResults = await Promise.allSettled([
      repository.create({
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: new Date("2026-01-01T11:30:00.000Z"),
        endTime: new Date("2026-01-01T12:30:00.000Z")
      }),
      secondRepository.create({
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: new Date("2026-01-01T12:30:00.000Z"),
        endTime: new Date("2026-01-01T13:30:00.000Z")
      })
    ]);

    const fulfilled = results.filter(isDeviceBookingFulfilled);
    const rejected = results.filter(result => result.status === "rejected");
    const adjacentFulfilled = adjacentResults.filter(isDeviceBookingFulfilled);

    assert.equal(fulfilled.length, 1);
    assert.notEqual(fulfilled[0]?.value, null);
    assert.equal(fulfilled[0]?.value?.status, BookingStatus.RESERVED);
    assert.equal(rejected.length, 1);
    assert.ok(rejected[0]?.reason instanceof BookingConflictError);
    assert.equal(adjacentFulfilled.length, 2);
    assert.equal(adjacentFulfilled[0]?.value?.status, BookingStatus.RESERVED);
    assert.equal(adjacentFulfilled[1]?.value?.status, BookingStatus.RESERVED);
    assert.equal(await countDeviceBookings(prisma), 3);
  } finally {
    await secondPrisma?.$disconnect();
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
    CREATE TABLE device (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      home_zone_id TEXT NOT NULL,
      current_zone_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (home_zone_id) REFERENCES zone(id),
      FOREIGN KEY (current_zone_id) REFERENCES zone(id)
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE device_booking (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      zone_id TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'RESERVED',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (device_id) REFERENCES device(id),
      FOREIGN KEY (zone_id) REFERENCES zone(id)
    )
  `);
}

async function seedDevice(prisma: PrismaClient): Promise<void> {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");

  await prisma.$executeRaw`
    INSERT INTO zone (id, name, type, status, created_at, updated_at)
    VALUES ('zone-1', 'Training Hall', 'LAB', 'ACTIVE', ${createdAt}, ${createdAt})
  `;
  await prisma.$executeRaw`
    INSERT INTO zone (id, name, type, status, created_at, updated_at)
    VALUES ('zone-2', 'Storage', 'ROOM', 'ACTIVE', ${createdAt}, ${createdAt})
  `;
  await prisma.$executeRaw`
    INSERT INTO device (id, name, type, home_zone_id, current_zone_id, status, created_at, updated_at)
    VALUES ('device-1', 'Microscope', 'LAB_EQUIPMENT', 'zone-1', 'zone-1', 'AVAILABLE', ${createdAt}, ${createdAt})
  `;
}

async function countDeviceBookings(prisma: PrismaClient): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: number | bigint }>>`
    SELECT COUNT(*) AS count FROM device_booking
  `;
  const count = rows[0]?.count ?? 0;

  return typeof count === "bigint" ? Number(count) : count;
}

function isDeviceBookingFulfilled(
  result: PromiseSettledResult<DeviceBooking | null>
): result is PromiseFulfilledResult<DeviceBooking | null> {
  return result.status === "fulfilled";
}
