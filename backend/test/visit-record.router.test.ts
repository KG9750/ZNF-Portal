import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { BookingStatus } from "@prisma/client";

import { createVisitRecordRouter } from "../src/modules/visit-record/visit-record.router.js";
import { VisitRecordService } from "../src/modules/visit-record/visit-record.service.js";
import { createMemoryVisitRecordRepository } from "./helpers/memory-visit-record-repository.js";

test("VisitRecord router exposes create and list endpoints", async () => {
  const app = express();
  const service = new VisitRecordService(
    createMemoryVisitRecordRepository(new Map([["visit-booking-1", BookingStatus.RESERVED]]))
  );

  app.use(express.json());
  app.use(createVisitRecordRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const createResponse = await fetch(`${baseUrl}/visit-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        visitBookingId: "visit-booking-1",
        actualStartTime: "2026-01-01T10:05:00.000Z",
        actualEndTime: "2026-01-01T10:55:00.000Z",
        actualVisitorCount: 10
      })
    });
    const created = await createResponse.json() as {
      visitBookingId: string;
      actualStartTime: string;
      actualEndTime: string;
      actualVisitorCount: number;
    };

    assert.equal(createResponse.status, 201);
    assert.equal(created.visitBookingId, "visit-booking-1");
    assert.equal(created.actualStartTime, "2026-01-01T10:05:00.000Z");
    assert.equal(created.actualEndTime, "2026-01-01T10:55:00.000Z");
    assert.equal(created.actualVisitorCount, 10);

    const listResponse = await fetch(`${baseUrl}/visit-records`);
    const records = await listResponse.json() as Array<{ id: string }>;

    assert.equal(listResponse.status, 200);
    assert.equal(records.length, 1);
  } finally {
    await closeServer(server);
  }
});

test("VisitRecord router returns validation errors", async () => {
  const app = express();
  const service = new VisitRecordService(
    createMemoryVisitRecordRepository(
      new Map([
        ["visit-booking-1", BookingStatus.RESERVED],
        ["visit-booking-2", BookingStatus.CANCELLED]
      ])
    )
  );

  app.use(express.json());
  app.use(createVisitRecordRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const invalidWindowResponse = await fetch(`${baseUrl}/visit-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        visitBookingId: "visit-booking-1",
        actualStartTime: "2026-01-01T10:55:00.000Z",
        actualEndTime: "2026-01-01T10:05:00.000Z",
        actualVisitorCount: 10
      })
    });
    const missingBookingResponse = await fetch(`${baseUrl}/visit-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        visitBookingId: "missing",
        actualStartTime: "2026-01-01T10:05:00.000Z",
        actualEndTime: "2026-01-01T10:55:00.000Z",
        actualVisitorCount: 10
      })
    });
    const invalidCountResponse = await fetch(`${baseUrl}/visit-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        visitBookingId: "visit-booking-1",
        actualStartTime: "2026-01-01T10:05:00.000Z",
        actualEndTime: "2026-01-01T10:55:00.000Z",
        actualVisitorCount: 0
      })
    });
    const cancelledBookingResponse = await fetch(`${baseUrl}/visit-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        visitBookingId: "visit-booking-2",
        actualStartTime: "2026-01-01T10:05:00.000Z",
        actualEndTime: "2026-01-01T10:55:00.000Z",
        actualVisitorCount: 10
      })
    });

    assert.equal(invalidWindowResponse.status, 400);
    assert.equal(missingBookingResponse.status, 400);
    assert.equal(invalidCountResponse.status, 400);
    assert.equal(cancelledBookingResponse.status, 400);
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
