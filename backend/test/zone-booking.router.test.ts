import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { createZoneBookingRouter } from "../src/modules/zone-booking/zone-booking.router.js";
import { ZoneBookingService } from "../src/modules/zone-booking/zone-booking.service.js";
import { createMemoryZoneBookingRepository } from "./helpers/memory-zone-booking-repository.js";

test("ZoneBooking router exposes create, list, and cancel endpoints", async () => {
  const app = express();
  const service = new ZoneBookingService(createMemoryZoneBookingRepository(["zone-1"]));

  app.use(express.json());
  app.use(createZoneBookingRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const createResponse = await fetch(`${baseUrl}/zone-bookings`, {
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

    const listResponse = await fetch(`${baseUrl}/zone-bookings`);
    const bookings = await listResponse.json() as Array<{ id: string }>;

    assert.equal(listResponse.status, 200);
    assert.equal(bookings.length, 1);

    const cancelResponse = await fetch(`${baseUrl}/zone-bookings/${created.id}/cancel`, {
      method: "PATCH"
    });
    const cancelled = await cancelResponse.json() as { status: string };

    assert.equal(cancelResponse.status, 200);
    assert.equal(cancelled.status, "CANCELLED");
  } finally {
    await closeServer(server);
  }
});

test("ZoneBooking router returns validation, conflict, and missing-booking errors", async () => {
  const app = express();
  const service = new ZoneBookingService(createMemoryZoneBookingRepository(["zone-1"]));

  app.use(express.json());
  app.use(createZoneBookingRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    await fetch(`${baseUrl}/zone-bookings`, {
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

    const validationResponse = await fetch(`${baseUrl}/zone-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        zoneId: "missing-zone",
        startTime: "2026-01-01T12:00:00.000Z",
        endTime: "2026-01-01T13:00:00.000Z"
      })
    });
    const conflictResponse = await fetch(`${baseUrl}/zone-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        zoneId: "zone-1",
        startTime: "2026-01-01T10:30:00.000Z",
        endTime: "2026-01-01T11:30:00.000Z"
      })
    });
    const missingResponse = await fetch(`${baseUrl}/zone-bookings/missing/cancel`, {
      method: "PATCH"
    });

    assert.equal(validationResponse.status, 400);
    assert.equal(conflictResponse.status, 409);
    assert.equal(missingResponse.status, 404);
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
