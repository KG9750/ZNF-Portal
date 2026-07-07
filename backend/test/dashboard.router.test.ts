import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { BookingStatus, DeviceStatus, WorkOrderStatus, WorkOrderType } from "@prisma/client";

import { createDashboardRouter } from "../src/modules/dashboard/dashboard.router.js";
import { DashboardService } from "../src/modules/dashboard/dashboard.service.js";
import { createMemoryDashboardRepository } from "./helpers/memory-dashboard-repository.js";

test("Dashboard router exposes overview endpoint", async () => {
  const app = express();
  const service = new DashboardService(createMemoryDashboardRepository({}), () => new Date("2026-01-01T08:00:00.000Z"));

  app.use(express.json());
  app.use(createDashboardRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const response = await fetch(`${baseUrl}/dashboard`);
    const overview = await response.json() as {
      todayZoneBookings: unknown[];
      todayDeviceBookings: unknown[];
      todayVisitBookings: unknown[];
      faultDevices: unknown[];
      pendingWorkOrders: unknown[];
    };

    assert.equal(response.status, 200);
    assert.deepEqual(overview.todayZoneBookings, []);
    assert.deepEqual(overview.todayDeviceBookings, []);
    assert.deepEqual(overview.todayVisitBookings, []);
    assert.deepEqual(overview.faultDevices, []);
    assert.deepEqual(overview.pendingWorkOrders, []);
  } finally {
    await closeServer(server);
  }
});

test("Dashboard router returns populated overview data", async () => {
  const app = express();
  const service = new DashboardService(
    createMemoryDashboardRepository({
      zoneBookings: [createZoneBooking("zone-booking-1", "2026-01-01T10:00:00.000Z", "2026-01-01T11:00:00.000Z")],
      deviceBookings: [
        createDeviceBooking("device-booking-1", "2026-01-01T12:00:00.000Z", "2026-01-01T13:00:00.000Z")
      ],
      visitBookings: [
        createVisitBooking("visit-booking-1", "2026-01-01T14:00:00.000Z", "2026-01-01T15:00:00.000Z")
      ],
      devices: [createDevice("device-1", DeviceStatus.FAULT)],
      workOrders: [createWorkOrder("work-order-1", WorkOrderStatus.OPEN)]
    }),
    () => new Date("2026-01-01T08:00:00.000Z")
  );

  app.use(express.json());
  app.use(createDashboardRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const response = await fetch(`${baseUrl}/dashboard`);
    const overview = await response.json() as {
      todayZoneBookings: Array<{ id: string }>;
      todayDeviceBookings: Array<{ id: string }>;
      todayVisitBookings: Array<{ id: string }>;
      faultDevices: Array<{ id: string }>;
      pendingWorkOrders: Array<{ id: string }>;
    };

    assert.equal(response.status, 200);
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
      ["work-order-1"]
    );
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

function createZoneBooking(id: string, startTime: string, endTime: string) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    zoneId: "zone-1",
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    status: BookingStatus.RESERVED,
    createdAt: now,
    updatedAt: now
  };
}

function createDeviceBooking(id: string, startTime: string, endTime: string) {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id,
    deviceId: "device-1",
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
