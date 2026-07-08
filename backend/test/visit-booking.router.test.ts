import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { createVisitBookingRouter } from "../src/modules/visit-booking/visit-booking.router.js";
import { VisitBookingService } from "../src/modules/visit-booking/visit-booking.service.js";
import { createMemoryVisitBookingRepository } from "./helpers/memory-visit-booking-repository.js";

test("VisitBooking router exposes create, list, and cancel endpoints", async () => {
  const app = express();
  const service = new VisitBookingService(createMemoryVisitBookingRepository());

  app.use(express.json());
  app.use(createVisitBookingRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const createResponse = await fetch(`${baseUrl}/visit-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00:00.000Z",
        visitorOrg: "Acme Labs",
        visitorCount: 12,
        needDemo: true
      })
    });
    const created = await createResponse.json() as {
      id: string;
      status: string;
      startTime: string;
      endTime: string;
      needDemo: boolean;
    };

    assert.equal(createResponse.status, 201);
    assert.equal(created.status, "RESERVED");
    assert.equal(created.startTime, "2026-01-01T10:00:00.000Z");
    assert.equal(created.endTime, "2026-01-01T11:00:00.000Z");
    assert.equal(created.needDemo, true);

    const listResponse = await fetch(`${baseUrl}/visit-bookings`);
    const bookings = await listResponse.json() as Array<{ id: string }>;

    assert.equal(listResponse.status, 200);
    assert.equal(bookings.length, 1);

    const cancelResponse = await fetch(`${baseUrl}/visit-bookings/${created.id}/cancel`, {
      method: "PATCH"
    });
    const cancelled = await cancelResponse.json() as { status: string };
    const cancelAgainResponse = await fetch(`${baseUrl}/visit-bookings/${created.id}/cancel`, {
      method: "PATCH"
    });
    const cancelledAgain = await cancelAgainResponse.json() as { status: string };

    assert.equal(cancelResponse.status, 200);
    assert.equal(cancelled.status, "CANCELLED");
    assert.equal(cancelAgainResponse.status, 200);
    assert.equal(cancelledAgain.status, "CANCELLED");
  } finally {
    await closeServer(server);
  }
});

test("VisitBooking router returns validation and missing-booking errors", async () => {
  const app = express();
  const service = new VisitBookingService(createMemoryVisitBookingRepository());

  app.use(express.json());
  app.use(createVisitBookingRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const invalidResponse = await fetch(`${baseUrl}/visit-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startTime: "2026-01-01T11:00:00.000Z",
        endTime: "2026-01-01T10:00:00.000Z",
        visitorOrg: "Acme Labs",
        visitorCount: 12
      })
    });
    const missingResponse = await fetch(`${baseUrl}/visit-bookings/missing/cancel`, {
      method: "PATCH"
    });
    const emptyOrgResponse = await fetch(`${baseUrl}/visit-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00:00.000Z",
        visitorOrg: "",
        visitorCount: 12
      })
    });
    const invalidCountResponse = await fetch(`${baseUrl}/visit-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00:00.000Z",
        visitorOrg: "Acme Labs",
        visitorCount: 0
      })
    });
    const missingStartResponse = await fetch(`${baseUrl}/visit-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        endTime: "2026-01-01T11:00:00.000Z",
        visitorOrg: "Acme Labs",
        visitorCount: 12
      })
    });
    const invalidNeedDemoResponse = await fetch(`${baseUrl}/visit-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00:00.000Z",
        visitorOrg: "Acme Labs",
        visitorCount: 12,
        needDemo: "yes"
      })
    });

    assert.equal(invalidResponse.status, 400);
    assert.equal(missingResponse.status, 404);
    assert.equal(emptyOrgResponse.status, 400);
    assert.equal(invalidCountResponse.status, 400);
    assert.equal(missingStartResponse.status, 400);
    assert.equal(invalidNeedDemoResponse.status, 400);
  } finally {
    await closeServer(server);
  }
});

test("VisitBooking router returns conflict errors for overlapping visits", async () => {
  const app = express();
  const service = new VisitBookingService(createMemoryVisitBookingRepository());

  app.use(express.json());
  app.use(createVisitBookingRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);

    await fetch(`${baseUrl}/visit-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00:00.000Z",
        visitorOrg: "Acme Labs",
        visitorCount: 12
      })
    });

    const conflictResponse = await fetch(`${baseUrl}/visit-bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        startTime: "2026-01-01T10:30:00.000Z",
        endTime: "2026-01-01T11:30:00.000Z",
        visitorOrg: "Overlap Labs",
        visitorCount: 4
      })
    });
    const conflict = await conflictResponse.json() as { error: string };

    assert.equal(conflictResponse.status, 409);
    assert.equal(conflict.error, "Visit booking conflicts with existing reservation");
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
