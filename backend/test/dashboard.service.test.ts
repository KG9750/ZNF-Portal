import test from "node:test";
import assert from "node:assert/strict";
import { BookingStatus, DeviceStatus, WorkOrderStatus, WorkOrderType } from "@prisma/client";

import { DashboardService } from "../src/modules/dashboard/dashboard.service.js";
import { createMemoryDashboardRepository } from "./helpers/memory-dashboard-repository.js";

test("DashboardService returns today's bookings, fault devices, and pending work orders", async () => {
  const service = new DashboardService(
    createMemoryDashboardRepository({
      zoneBookings: [
        createZoneBooking("zone-booking-1", "2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z"),
        createZoneBooking("zone-booking-2", "2026-01-02T10:00:00.000Z", "2026-01-02T11:00:00.000Z"),
        createZoneBooking("zone-booking-3", "2026-01-01T12:00:00.000Z", "2026-01-01T13:00:00.000Z", BookingStatus.CANCELLED)
      ],
      deviceBookings: [
        createDeviceBooking("device-booking-1", "2025-12-31T23:00:00.000Z", "2026-01-01T01:00:00.000Z")
      ],
      visitBookings: [
        createVisitBooking("visit-booking-1", "2026-01-01T14:00:00.000Z", "2026-01-01T15:00:00.000Z")
      ],
      devices: [createDevice("device-1", DeviceStatus.FAULT), createDevice("device-2", DeviceStatus.AVAILABLE)],
      workOrders: [
        createWorkOrder("work-order-1", WorkOrderStatus.OPEN),
        createWorkOrder("work-order-2", WorkOrderStatus.IN_PROGRESS),
        createWorkOrder("work-order-3", WorkOrderStatus.CLOSED)
      ]
    }),
    () => new Date("2026-01-01T08:00:00.000Z")
  );

  const overview = await service.getOverview();

  assert.deepEqual(
    overview.todayZoneBookings.map(booking => booking.id),
    ["zone-booking-1"]
  );
  assert.deepEqual(
    overview.todayDeviceBookings.map(booking => booking.id),
    ["device-booking-1"]
  );
  assert.deepEqual(
    overview.todayVisitBookings.map(booking => booking.id),
    ["visit-booking-1"]
  );
  assert.deepEqual(
    overview.faultDevices.map(device => device.id),
    ["device-1"]
  );
  assert.deepEqual(
    overview.pendingWorkOrders.map(workOrder => workOrder.id),
    ["work-order-1", "work-order-2"]
  );
});

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
    deviceId: "device-1",
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

function createDevice(id: string, status: DeviceStatus) {
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

function createWorkOrder(id: string, status: WorkOrderStatus) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    type: WorkOrderType.FAULT,
    deviceId: "device-1",
    zoneId: null,
    status,
    createdAt: now,
    updatedAt: now
  };
}
