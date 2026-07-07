import test from "node:test";
import assert from "node:assert/strict";
import { BookingStatus } from "@prisma/client";

import { VisitRecordService } from "../src/modules/visit-record/visit-record.service.js";
import { createMemoryVisitRecordRepository } from "./helpers/memory-visit-record-repository.js";

test("VisitRecordService creates execution records with parsed input", async () => {
  const service = new VisitRecordService(
    createMemoryVisitRecordRepository(new Map([["visit-booking-1", BookingStatus.RESERVED]]))
  );

  const record = await service.create({
    visitBookingId: " visit-booking-1 ",
    actualStartTime: "2026-01-01T10:05:00.000Z",
    actualEndTime: "2026-01-01T10:55:00.000Z",
    actualVisitorCount: 10
  });

  assert.equal(record.visitBookingId, "visit-booking-1");
  assert.equal(record.actualStartTime.toISOString(), "2026-01-01T10:05:00.000Z");
  assert.equal(record.actualEndTime.toISOString(), "2026-01-01T10:55:00.000Z");
  assert.equal(record.actualVisitorCount, 10);
});

test("VisitRecordService rejects invalid execution record payloads", async () => {
  const service = new VisitRecordService(
    createMemoryVisitRecordRepository(new Map([["visit-booking-1", BookingStatus.RESERVED]]))
  );

  await assert.rejects(
    () =>
      service.create({
        visitBookingId: "visit-booking-1",
        actualStartTime: "2026-01-01T10:55:00.000Z",
        actualEndTime: "2026-01-01T10:05:00.000Z",
        actualVisitorCount: 10
      }),
    /actualStartTime must be before actualEndTime/
  );
  await assert.rejects(
    () =>
      service.create({
        visitBookingId: "",
        actualStartTime: "2026-01-01T10:05:00.000Z",
        actualEndTime: "2026-01-01T10:55:00.000Z",
        actualVisitorCount: 10
      }),
    /visitBookingId must be a non-empty string/
  );
  await assert.rejects(
    () =>
      service.create({
        visitBookingId: "visit-booking-1",
        actualStartTime: "2026-01-01T10:05:00.000Z",
        actualEndTime: "2026-01-01T10:55:00.000Z",
        actualVisitorCount: 0
      }),
    /actualVisitorCount must be a positive integer/
  );
});

test("VisitRecordService requires a reserved VisitBooking without an existing record", async () => {
  const service = new VisitRecordService(
    createMemoryVisitRecordRepository(
      new Map([
        ["visit-booking-1", BookingStatus.RESERVED],
        ["visit-booking-2", BookingStatus.CANCELLED]
      ])
    )
  );

  await assert.rejects(
    () =>
      service.create({
        visitBookingId: "missing",
        actualStartTime: "2026-01-01T10:05:00.000Z",
        actualEndTime: "2026-01-01T10:55:00.000Z",
        actualVisitorCount: 10
      }),
    /visitBookingId must reference a reserved VisitBooking without an existing VisitRecord/
  );
  await assert.rejects(
    () =>
      service.create({
        visitBookingId: "visit-booking-2",
        actualStartTime: "2026-01-01T10:05:00.000Z",
        actualEndTime: "2026-01-01T10:55:00.000Z",
        actualVisitorCount: 10
      }),
    /visitBookingId must reference a reserved VisitBooking without an existing VisitRecord/
  );

  await service.create({
    visitBookingId: "visit-booking-1",
    actualStartTime: "2026-01-01T10:05:00.000Z",
    actualEndTime: "2026-01-01T10:55:00.000Z",
    actualVisitorCount: 10
  });

  await assert.rejects(
    () =>
      service.create({
        visitBookingId: "visit-booking-1",
        actualStartTime: "2026-01-01T10:05:00.000Z",
        actualEndTime: "2026-01-01T10:55:00.000Z",
        actualVisitorCount: 10
      }),
    /visitBookingId must reference a reserved VisitBooking without an existing VisitRecord/
  );
});

test("VisitRecordService lists execution records", async () => {
  const service = new VisitRecordService(
    createMemoryVisitRecordRepository(new Map([["visit-booking-1", BookingStatus.RESERVED]]))
  );

  await service.create({
    visitBookingId: "visit-booking-1",
    actualStartTime: "2026-01-01T10:05:00.000Z",
    actualEndTime: "2026-01-01T10:55:00.000Z",
    actualVisitorCount: 10
  });

  const records = await service.list();

  assert.equal(records.length, 1);
});
