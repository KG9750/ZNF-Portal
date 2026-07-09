import test from "node:test";
import assert from "node:assert/strict";
import { BookingStatus } from "@prisma/client";

import { VisitBookingService } from "../src/modules/visit-booking/visit-booking.service.js";
import { createMemoryVisitBookingRepository } from "./helpers/memory-visit-booking-repository.js";

test("VisitBookingService creates visit reservations with parsed input", async () => {
  const service = new VisitBookingService(createMemoryVisitBookingRepository());

  const booking = await service.create({
    startTime: "2026-01-01T10:00:00.000Z",
    endTime: "2026-01-01T11:00:00.000Z",
    visitorOrg: " Acme Labs ",
    visitorCount: 12,
    needDemo: true
  });

  assert.equal(booking.visitorOrg, "Acme Labs");
  assert.equal(booking.visitorCount, 12);
  assert.equal(booking.needDemo, true);
  assert.equal(booking.status, BookingStatus.RESERVED);
});

test("VisitBookingService defaults needDemo to false", async () => {
  const service = new VisitBookingService(createMemoryVisitBookingRepository());

  const booking = await service.create({
    startTime: "2026-01-01T10:00:00.000Z",
    endTime: "2026-01-01T11:00:00.000Z",
    visitorOrg: "Acme Labs",
    visitorCount: 12
  });

  assert.equal(booking.needDemo, false);
});

test("VisitBookingService accepts explicit timezone offsets", async () => {
  const service = new VisitBookingService(createMemoryVisitBookingRepository());

  const booking = await service.create({
    startTime: "2026-01-01T13:30:00+05:30",
    endTime: "2026-01-01T05:00:00-05:00",
    visitorOrg: "Acme Labs",
    visitorCount: 12
  });

  assert.equal(booking.startTime.toISOString(), "2026-01-01T08:00:00.000Z");
  assert.equal(booking.endTime.toISOString(), "2026-01-01T10:00:00.000Z");
});

test("VisitBookingService rejects invalid visit payloads", async () => {
  const service = new VisitBookingService(createMemoryVisitBookingRepository());

  await assert.rejects(
    () =>
      service.create({
        startTime: "2026-01-01T10:00",
        endTime: "2026-01-01T11:00",
        visitorOrg: "Acme Labs",
        visitorCount: 12
      }),
    /startTime must include a timezone offset/
  );
  await assert.rejects(
    () =>
      service.create({
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00",
        visitorOrg: "Acme Labs",
        visitorCount: 12
      }),
    /endTime must include a timezone offset/
  );
  await assert.rejects(
    () =>
      service.create({
        startTime: 1767261600000,
        endTime: "2026-01-01T11:00:00.000Z",
        visitorOrg: "Acme Labs",
        visitorCount: 12
      }),
    /startTime must be a valid date/
  );
  await assert.rejects(
    () =>
      service.create({
        startTime: "2026-02-31T10:00:00+08:00",
        endTime: "2026-02-31T11:00:00+08:00",
        visitorOrg: "Acme Labs",
        visitorCount: 12
      }),
    /startTime must be a valid date/
  );
  await assert.rejects(
    () =>
      service.create({
        startTime: "2026-01-01T11:00:00.000Z",
        endTime: "2026-01-01T10:00:00.000Z",
        visitorOrg: "Acme Labs",
        visitorCount: 12
      }),
    /startTime must be before endTime/
  );
  await assert.rejects(
    () =>
      service.create({
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00:00.000Z",
        visitorOrg: "",
        visitorCount: 12
      }),
    /visitorOrg must be a non-empty string/
  );
  await assert.rejects(
    () =>
      service.create({
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00:00.000Z",
        visitorOrg: "Acme Labs",
        visitorCount: 0
      }),
    /visitorCount must be a positive integer/
  );
});

test("VisitBookingService lists and cancels visits idempotently", async () => {
  const service = new VisitBookingService(createMemoryVisitBookingRepository());
  const booking = await service.create({
    startTime: "2026-01-01T10:00:00.000Z",
    endTime: "2026-01-01T11:00:00.000Z",
    visitorOrg: "Acme Labs",
    visitorCount: 12
  });

  const bookings = await service.list();
  const cancelled = await service.cancel(booking.id);
  const cancelledAgain = await service.cancel(booking.id);
  const missing = await service.cancel("missing");

  assert.equal(bookings.length, 1);
  assert.equal(cancelled?.status, BookingStatus.CANCELLED);
  assert.equal(cancelledAgain?.updatedAt.getTime(), cancelled?.updatedAt.getTime());
  assert.equal(missing, null);
});
