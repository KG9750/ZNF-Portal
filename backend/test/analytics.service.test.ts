import test from "node:test";
import assert from "node:assert/strict";
import { BookingStatus, DeviceStatus, ZoneStatus } from "@prisma/client";

import { AnalyticsService } from "../src/modules/analytics/analytics.service.js";
import { createMemoryAnalyticsRepository } from "./helpers/memory-analytics-repository.js";

test("AnalyticsService returns basic utilization and visit metrics", async () => {
  const service = new AnalyticsService(
    createMemoryAnalyticsRepository({
      zones: [createZone("zone-1"), createZone("zone-2"), createZone("zone-3"), createZone("zone-4", ZoneStatus.INACTIVE)],
      devices: [createDevice("device-1"), createDevice("device-2"), createDevice("device-3", DeviceStatus.FAULT)],
      zoneBookings: [
        createZoneBooking("zone-booking-1", "zone-1", "2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z"),
        createZoneBooking("zone-booking-2", "zone-1", "2026-01-01T12:00:00.000Z", "2026-01-01T13:00:00.000Z"),
        createZoneBooking("zone-booking-3", "zone-2", "2026-01-02T10:00:00.000Z", "2026-01-02T11:00:00.000Z"),
        createZoneBooking(
          "zone-booking-4",
          "zone-3",
          "2026-01-01T14:00:00.000Z",
          "2026-01-01T15:00:00.000Z",
          BookingStatus.CANCELLED
        ),
        createZoneBooking("zone-booking-5", "zone-4", "2026-01-01T16:00:00.000Z", "2026-01-01T17:00:00.000Z")
      ],
      deviceBookings: [
        createDeviceBooking("device-booking-1", "device-1", "2025-12-31T23:00:00.000Z", "2026-01-01T01:00:00.000Z"),
        createDeviceBooking("device-booking-2", "device-3", "2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z")
      ],
      visitBookings: [
        createVisitBooking("visit-booking-1", "2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z"),
        createVisitBooking("visit-booking-2", "2026-01-02T10:00:00.000Z", "2026-01-02T11:00:00.000Z")
      ],
      visitRecords: [
        createVisitRecord("visit-record-1", "visit-booking-1", "2026-01-01T10:05:00.000Z", "2026-01-01T10:55:00.000Z", 12),
        createVisitRecord("visit-record-2", "visit-booking-2", "2026-01-02T10:05:00.000Z", "2026-01-02T10:55:00.000Z", 8)
      ]
    }),
    () => new Date("2026-01-01T08:00:00.000Z")
  );

  const overview = await service.getOverview();

  assert.deepEqual(overview.zoneUtilization, {
    total: 3,
    used: 1,
    rate: 0.3333
  });
  assert.deepEqual(overview.deviceUsage, {
    total: 2,
    used: 1,
    rate: 0.5
  });
  assert.deepEqual(overview.visitStats, {
    todayVisitBookings: 1,
    todayVisitRecords: 1,
    todayVisitors: 12
  });
});

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
    visitorCount: 12,
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
