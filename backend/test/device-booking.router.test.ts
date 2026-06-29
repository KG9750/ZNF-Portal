import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { createDeviceBookingRouter } from "../src/modules/device-booking/device-booking.router.js";
import { DeviceBookingService } from "../src/modules/device-booking/device-booking.service.js";
import { createMemoryDeviceBookingRepository } from "./helpers/memory-device-booking-repository.js";

test("DeviceBooking router exposes create and list endpoints", async () => {
  const app = express();
  const service = new DeviceBookingService(createMemoryDeviceBookingRepository());

  app.use(express.json());
  app.use(createDeviceBookingRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const createResponse = await fetch(`${baseUrl}/device-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00:00.000Z"
      })
    });
    const created = await createResponse.json() as {
      id: string;
      status: string;
      startTime: string;
      endTime: string;
      createdAt: string;
      updatedAt: string;
    };

    assert.equal(createResponse.status, 201);
    assert.equal(created.status, "RESERVED");
    assert.equal(created.startTime, "2026-01-01T10:00:00.000Z");
    assert.equal(created.endTime, "2026-01-01T11:00:00.000Z");
    assert.equal(Number.isNaN(new Date(created.createdAt).getTime()), false);
    assert.equal(Number.isNaN(new Date(created.updatedAt).getTime()), false);

    const listResponse = await fetch(`${baseUrl}/device-bookings`);
    const bookings = await listResponse.json() as Array<{ id: string }>;

    assert.equal(listResponse.status, 200);
    assert.equal(bookings.length, 1);
  } finally {
    await closeServer(server);
  }
});

test("DeviceBooking router returns validation and conflict errors", async () => {
  const app = express();
  const service = new DeviceBookingService(createMemoryDeviceBookingRepository());

  app.use(express.json());
  app.use(createDeviceBookingRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    await fetch(`${baseUrl}/device-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00:00.000Z"
      })
    });

    const validationResponse = await fetch(`${baseUrl}/device-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deviceId: "device-1",
        zoneId: "zone-2",
        startTime: "2026-01-01T12:00:00.000Z",
        endTime: "2026-01-01T13:00:00.000Z"
      })
    });
    const conflictResponse = await fetch(`${baseUrl}/device-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: "2026-01-01T10:30:00.000Z",
        endTime: "2026-01-01T11:30:00.000Z"
      })
    });

    assert.equal(validationResponse.status, 400);
    assert.equal(conflictResponse.status, 409);
  } finally {
    await closeServer(server);
  }
});

test("DeviceBooking router returns validation errors for malformed booking fields", async () => {
  const app = express();
  const service = new DeviceBookingService(createMemoryDeviceBookingRepository());

  app.use(express.json());
  app.use(createDeviceBookingRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const missingDeviceResponse = await fetch(`${baseUrl}/device-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        zoneId: "zone-1",
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00:00.000Z"
      })
    });
    const invalidWindowResponse = await fetch(`${baseUrl}/device-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: "2026-01-01T11:00:00.000Z",
        endTime: "2026-01-01T10:00:00.000Z"
      })
    });

    assert.equal(missingDeviceResponse.status, 400);
    assert.equal(invalidWindowResponse.status, 400);
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
