import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { BookingStatus, DeviceStatus, ZoneStatus } from "@prisma/client";

import { createAnalyticsRouter } from "../src/modules/analytics/analytics.router.js";
import { AnalyticsService } from "../src/modules/analytics/analytics.service.js";
import { createMemoryAnalyticsRepository } from "./helpers/memory-analytics-repository.js";

test("Analytics router exposes overview endpoint", async () => {
  const app = express();
  const service = new AnalyticsService(
    createMemoryAnalyticsRepository({
      zones: [createZone("zone-1"), createZone("zone-2")],
      devices: [createDevice("device-1")],
      zoneBookings: [
        createZoneBooking("zone-booking-1", "zone-1", "2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z")
      ],
      deviceBookings: [
        createDeviceBooking("device-booking-1", "device-1", "2026-01-01T12:00:00.000Z", "2026-01-01T13:00:00.000Z")
      ],
      visitBookings: [
        createVisitBooking("visit-booking-1", "2026-01-01T14:00:00.000Z", "2026-01-01T15:00:00.000Z")
      ],
      visitRecords: [
        createVisitRecord("visit-record-1", "visit-booking-1", "2026-01-01T14:05:00.000Z", "2026-01-01T14:55:00.000Z", 7)
      ]
    }),
    () => new Date("2026-01-01T08:00:00.000Z")
  );

  app.use(express.json());
  app.use(createAnalyticsRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const response = await fetch(`${baseUrl}/analytics`);
    const overview = await response.json() as {
      zoneUtilization: { total: number; used: number; rate: number };
      deviceUsage: { total: number; used: number; rate: number };
      visitStats: { todayVisitBookings: number; todayVisitRecords: number; todayVisitors: number };
    };

    assert.equal(response.status, 200);
    assert.deepEqual(overview.zoneUtilization, {
      total: 2,
      used: 1,
      rate: 0.5
    });
    assert.deepEqual(overview.deviceUsage, {
      total: 1,
      used: 1,
      rate: 1
    });
    assert.deepEqual(overview.visitStats, {
      todayVisitBookings: 1,
      todayVisitRecords: 1,
      todayVisitors: 7
    });
  } finally {
    await closeServer(server);
  }
});

function getBaseUrl(server: ReturnType<typeof express.application.listen>): string {
  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  if (address === null || typeof address === "string") {
    throw new Error("Expected TCP server address");
  }

  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: ReturnType<typeof express.application.listen>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function createZone(id: string) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    name: id,
    type: "LAB",
    status: ZoneStatus.ACTIVE,
    createdAt: now,
    updatedAt: now
  };
}

function createDevice(id: string) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    name: id,
    type: "ROBOT_ARM",
    homeZoneId: "zone-1",
    currentZoneId: "zone-1",
    status: DeviceStatus.AVAILABLE,
    createdAt: now,
    updatedAt: now
  };
}

function createZoneBooking(id: string, zoneId: string, startTime: string, endTime: string) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    zoneId,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    status: BookingStatus.RESERVED,
    createdAt: now,
    updatedAt: now
  };
}

function createDeviceBooking(id: string, deviceId: string, startTime: string, endTime: string) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    deviceId,
    zoneId: "zone-1",
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    status: BookingStatus.RESERVED,
    createdAt: now,
    updatedAt: now
  };
}

function createVisitBooking(id: string, startTime: string, endTime: string) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    visitorOrg: "Acme Labs",
    visitorCount: 7,
    needDemo: false,
    status: BookingStatus.RESERVED,
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
