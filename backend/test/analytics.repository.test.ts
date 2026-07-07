import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  BookingStatus,
  DeviceStatus,
  PrismaClient,
  ZoneStatus
} from "@prisma/client";

import { createAnalyticsRepository } from "../src/modules/analytics/analytics.repository.js";

test("AnalyticsRepository calculates basic utilization and visit metrics with SQLite", async () => {
  const dbDir = await mkdtemp(join(tmpdir(), "znf-analytics-"));
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
    await seedAnalyticsData(prisma);

    const overview = await createAnalyticsRepository(prisma).getOverview({
      start: new Date("2026-01-01T00:00:00.000Z"),
      end: new Date("2026-01-02T00:00:00.000Z")
    });

    assert.deepEqual(overview.zoneUtilization, {
      total: 3,
      used: 2,
      rate: 0.6667
    });
    assert.deepEqual(overview.deviceUsage, {
      total: 2,
      used: 1,
      rate: 0.5
    });
    assert.deepEqual(overview.visitStats, {
      todayVisitBookings: 2,
      todayVisitRecords: 2,
      todayVisitors: 17
    });
  } finally {
    await prisma.$disconnect();
    await rm(dbDir, { recursive: true, force: true });
  }
});

test("AnalyticsRepository returns zero rates for an empty SQLite database", async () => {
  const dbDir = await mkdtemp(join(tmpdir(), "znf-analytics-empty-"));
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

    const overview = await createAnalyticsRepository(prisma).getOverview({
      start: new Date("2026-01-01T00:00:00.000Z"),
      end: new Date("2026-01-02T00:00:00.000Z")
    });

    assert.deepEqual(overview.zoneUtilization, {
      total: 0,
      used: 0,
      rate: 0
    });
    assert.deepEqual(overview.deviceUsage, {
      total: 0,
      used: 0,
      rate: 0
    });
    assert.deepEqual(overview.visitStats, {
      todayVisitBookings: 0,
      todayVisitRecords: 0,
      todayVisitors: 0
    });
  } finally {
    await prisma.$disconnect();
    await rm(dbDir, { recursive: true, force: true });
  }
});

test("AnalyticsRepository ignores cancelled bookings for utilization", async () => {
  const dbDir = await mkdtemp(join(tmpdir(), "znf-analytics-cancelled-"));
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
    await prisma.zone.create({
      data: createZone("zone-1")
    });
    await prisma.device.create({
      data: createDevice("device-1")
    });
    await prisma.zoneBooking.create({
      data: createZoneBooking(
        "zone-booking-cancelled-only",
        "zone-1",
        "2026-01-01T10:00:00.000Z",
        "2026-01-01T11:00:00.000Z",
        BookingStatus.CANCELLED
      )
    });
    await prisma.deviceBooking.create({
      data: createDeviceBooking(
        "device-booking-cancelled-only",
        "device-1",
        "2026-01-01T10:00:00.000Z",
        "2026-01-01T11:00:00.000Z",
        BookingStatus.CANCELLED
      )
    });
    await prisma.visitBooking.create({
      data: createVisitBooking(
        "visit-booking-cancelled-only",
        "2026-01-01T10:00:00.000Z",
        "2026-01-01T11:00:00.000Z",
        BookingStatus.CANCELLED
      )
    });

    const overview = await createAnalyticsRepository(prisma).getOverview({
      start: new Date("2026-01-01T00:00:00.000Z"),
      end: new Date("2026-01-02T00:00:00.000Z")
    });

    assert.deepEqual(overview.zoneUtilization, {
      total: 1,
      used: 0,
      rate: 0
    });
    assert.deepEqual(overview.deviceUsage, {
      total: 1,
      used: 0,
      rate: 0
    });
    assert.deepEqual(overview.visitStats, {
      todayVisitBookings: 0,
      todayVisitRecords: 0,
      todayVisitors: 0
    });
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
    CREATE TABLE device (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      home_zone_id TEXT NOT NULL,
      current_zone_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
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
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
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
}

async function seedAnalyticsData(prisma: PrismaClient): Promise<void> {
  const now = new Date("2026-01-01T00:00:00.000Z");

  await prisma.zone.createMany({
    data: [
      createZone("zone-1"),
      createZone("zone-2"),
      createZone("zone-3"),
      createZone("zone-4", ZoneStatus.INACTIVE)
    ]
  });
  await prisma.device.createMany({
    data: [
      createDevice("device-1"),
      createDevice("device-2"),
      createDevice("device-3", DeviceStatus.FAULT)
    ]
  });
  await prisma.zoneBooking.createMany({
    data: [
      createZoneBooking("zone-booking-1", "zone-1", "2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z"),
      createZoneBooking("zone-booking-2", "zone-1", "2026-01-01T12:00:00.000Z", "2026-01-01T13:00:00.000Z"),
      createZoneBooking("zone-booking-3", "zone-2", "2025-12-31T23:00:00.000Z", "2026-01-01T01:00:00.000Z"),
      createZoneBooking("zone-booking-before", "zone-3", "2025-12-31T23:00:00.000Z", "2026-01-01T00:00:00.000Z"),
      createZoneBooking("zone-booking-after", "zone-3", "2026-01-02T00:00:00.000Z", "2026-01-02T01:00:00.000Z"),
      createZoneBooking(
        "zone-booking-cancelled",
        "zone-3",
        "2026-01-01T14:00:00.000Z",
        "2026-01-01T15:00:00.000Z",
        BookingStatus.CANCELLED
      ),
      createZoneBooking("zone-booking-inactive", "zone-4", "2026-01-01T16:00:00.000Z", "2026-01-01T17:00:00.000Z")
    ]
  });
  await prisma.deviceBooking.createMany({
    data: [
      createDeviceBooking("device-booking-1", "device-1", "2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z"),
      createDeviceBooking("device-booking-2", "device-1", "2026-01-01T12:00:00.000Z", "2026-01-01T13:00:00.000Z"),
      createDeviceBooking("device-booking-fault", "device-3", "2026-01-01T13:00:00.000Z", "2026-01-01T14:00:00.000Z"),
      createDeviceBooking("device-booking-after", "device-2", "2026-01-02T10:00:00.000Z", "2026-01-02T11:00:00.000Z")
    ]
  });
  await prisma.visitBooking.createMany({
    data: [
      createVisitBooking("visit-booking-1", "2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z"),
      createVisitBooking("visit-booking-2", "2025-12-31T23:00:00.000Z", "2026-01-01T01:00:00.000Z"),
      createVisitBooking(
        "visit-booking-cancelled",
        "2026-01-01T14:00:00.000Z",
        "2026-01-01T15:00:00.000Z",
        BookingStatus.CANCELLED
      )
    ]
  });
  await prisma.visitRecord.createMany({
    data: [
      createVisitRecord("visit-record-1", "visit-booking-1", "2026-01-01T10:05:00.000Z", "2026-01-01T10:55:00.000Z", 10),
      createVisitRecord("visit-record-2", "visit-booking-2", "2025-12-31T23:30:00.000Z", "2026-01-01T00:30:00.000Z", 7),
      createVisitRecord(
        "visit-record-after",
        "visit-booking-cancelled",
        "2026-01-02T10:00:00.000Z",
        "2026-01-02T11:00:00.000Z",
        4
      )
    ]
  });

  await prisma.zone.updateMany({
    data: {
      updatedAt: now
    }
  });
}

function createZone(id: string, status: ZoneStatus = ZoneStatus.ACTIVE) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    name: id,
    type: "LAB",
    status,
    createdAt: now,
    updatedAt: now
  };
}

function createDevice(id: string, status: DeviceStatus = DeviceStatus.AVAILABLE) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    name: id,
    type: "ROBOT_ARM",
    homeZoneId: "zone-1",
    currentZoneId: "zone-1",
    status,
    createdAt: now,
    updatedAt: now
  };
}

function createZoneBooking(
  id: string,
  zoneId: string,
  startTime: string,
  endTime: string,
  status: BookingStatus = BookingStatus.RESERVED
) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    zoneId,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    status,
    createdAt: now,
    updatedAt: now
  };
}

function createDeviceBooking(
  id: string,
  deviceId: string,
  startTime: string,
  endTime: string,
  status: BookingStatus = BookingStatus.RESERVED
) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    deviceId,
    zoneId: "zone-1",
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    status,
    createdAt: now,
    updatedAt: now
  };
}

function createVisitBooking(
  id: string,
  startTime: string,
  endTime: string,
  status: BookingStatus = BookingStatus.RESERVED
) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    visitorOrg: "Acme Labs",
    visitorCount: 12,
    needDemo: false,
    status,
    createdAt: now,
    updatedAt: now
  };
}

function createVisitRecord(
  id: string,
  visitBookingId: string,
  actualStartTime: string,
  actualEndTime: string,
  actualVisitorCount: number
) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    visitBookingId,
    actualStartTime: new Date(actualStartTime),
    actualEndTime: new Date(actualEndTime),
    actualVisitorCount,
    createdAt: now,
    updatedAt: now
  };
}
