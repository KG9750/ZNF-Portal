import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  BookingStatus,
  DeviceStatus,
  PrismaClient,
  WorkOrderStatus,
  WorkOrderType
} from "@prisma/client";

import { createDashboardRepository } from "../src/modules/dashboard/dashboard.repository.js";

test("DashboardRepository aggregates today bookings, fault devices, and pending work orders with SQLite", async () => {
  const dbDir = await mkdtemp(join(tmpdir(), "znf-dashboard-"));
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
    await seedDashboardData(prisma);

    const overview = await createDashboardRepository(prisma).getOverview({
      start: new Date("2026-01-01T00:00:00.000Z"),
      end: new Date("2026-01-02T00:00:00.000Z")
    });

    assert.deepEqual(
      overview.todayZoneBookings.map(booking => booking.id),
      ["zone-booking-start", "zone-booking-end"]
    );
    assert.deepEqual(
      overview.todayDeviceBookings.map(booking => booking.id),
      ["device-booking-overlap"]
    );
    assert.deepEqual(
      overview.todayVisitBookings.map(booking => booking.id),
      ["visit-booking-day"]
    );
    assert.deepEqual(
      overview.faultDevices.map(device => device.id),
      ["device-fault"]
    );
    assert.deepEqual(
      overview.pendingWorkOrders.map(workOrder => workOrder.id),
      ["work-order-progress", "work-order-open"]
    );
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
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (zone_id) REFERENCES zone(id)
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
    CREATE TABLE work_order (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      device_id TEXT,
      zone_id TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function seedDashboardData(prisma: PrismaClient): Promise<void> {
  const now = new Date("2026-01-01T00:00:00.000Z");

  await prisma.zone.create({
    data: {
      id: "zone-1",
      name: "Training Zone",
      type: "LAB",
      createdAt: now,
      updatedAt: now
    }
  });
  await prisma.device.createMany({
    data: [
      createDevice("device-available", DeviceStatus.AVAILABLE, "2026-01-01T00:00:00.000Z"),
      createDevice("device-fault", DeviceStatus.FAULT, "2026-01-01T01:00:00.000Z"),
      createDevice("device-maintenance", DeviceStatus.MAINTENANCE, "2026-01-01T02:00:00.000Z")
    ]
  });
  await prisma.zoneBooking.createMany({
    data: [
      createZoneBooking("zone-booking-before", "2025-12-31T23:00:00.000Z", "2026-01-01T00:00:00.000Z"),
      createZoneBooking("zone-booking-start", "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z"),
      createZoneBooking("zone-booking-end", "2026-01-01T23:00:00.000Z", "2026-01-02T00:00:00.000Z"),
      createZoneBooking("zone-booking-after", "2026-01-02T00:00:00.000Z", "2026-01-02T01:00:00.000Z"),
      createZoneBooking(
        "zone-booking-cancelled",
        "2026-01-01T12:00:00.000Z",
        "2026-01-01T13:00:00.000Z",
        BookingStatus.CANCELLED
      )
    ]
  });
  await prisma.deviceBooking.createMany({
    data: [
      createDeviceBooking("device-booking-overlap", "2025-12-31T23:00:00.000Z", "2026-01-01T01:00:00.000Z"),
      createDeviceBooking(
        "device-booking-cancelled",
        "2026-01-01T10:00:00.000Z",
        "2026-01-01T11:00:00.000Z",
        BookingStatus.CANCELLED
      )
    ]
  });
  await prisma.visitBooking.createMany({
    data: [
      createVisitBooking("visit-booking-day", "2026-01-01T14:00:00.000Z", "2026-01-01T15:00:00.000Z"),
      createVisitBooking("visit-booking-after", "2026-01-02T10:00:00.000Z", "2026-01-02T11:00:00.000Z")
    ]
  });
  await prisma.workOrder.createMany({
    data: [
      createWorkOrder("work-order-open", WorkOrderStatus.OPEN, "2026-01-01T00:00:00.000Z"),
      createWorkOrder("work-order-progress", WorkOrderStatus.IN_PROGRESS, "2026-01-01T01:00:00.000Z"),
      createWorkOrder("work-order-closed", WorkOrderStatus.CLOSED, "2026-01-01T02:00:00.000Z")
    ]
  });
}

function createDevice(id: string, status: DeviceStatus, createdAt: string) {
  return {
    id,
    name: id,
    type: "ROBOT_ARM",
    homeZoneId: "zone-1",
    currentZoneId: "zone-1",
    status,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt)
  };
}

function createZoneBooking(
  id: string,
  startTime: string,
  endTime: string,
  status: BookingStatus = BookingStatus.RESERVED
) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    zoneId: "zone-1",
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    status,
    createdAt: now,
    updatedAt: now
  };
}

function createDeviceBooking(
  id: string,
  startTime: string,
  endTime: string,
  status: BookingStatus = BookingStatus.RESERVED
) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    deviceId: "device-available",
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

function createWorkOrder(id: string, status: WorkOrderStatus, createdAt: string) {
  return {
    id,
    type: WorkOrderType.FAULT,
    deviceId: "device-available",
    zoneId: null,
    status,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt)
  };
}
