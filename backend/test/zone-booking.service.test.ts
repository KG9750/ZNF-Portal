import test from "node:test";
import assert from "node:assert/strict";
import { BookingStatus } from "@prisma/client";

import { BookingConflictError } from "../src/modules/conflict/conflict.service.js";
import { ZoneBookingService } from "../src/modules/zone-booking/zone-booking.service.js";
import { createMemoryZoneBookingRepository } from "./helpers/memory-zone-booking-repository.js";

test("ZoneBookingService creates reservations with parsed time windows", async () => {
  const service = new ZoneBookingService(createMemoryZoneBookingRepository(["zone-1"]));

  const booking = await service.create({
    zoneId: " zone-1 ",
    startTime: "2026-01-01T10:00:00.000Z",
    endTime: "2026-01-01T11:00:00.000Z"
  });

  assert.equal(booking.zoneId, "zone-1");
  assert.equal(booking.status, BookingStatus.RESERVED);
  assert.equal(booking.startTime.toISOString(), "2026-01-01T10:00:00.000Z");
});

test("ZoneBookingService rejects invalid booking payloads", async () => {
  const service = new ZoneBookingService(createMemoryZoneBookingRepository());

  await assert.rejects(
    () =>
      service.create({
        zoneId: "zone-1",
        startTime: "2026-01-01T11:00:00.000Z",
        endTime: "2026-01-01T10:00:00.000Z"
      }),
    /startTime must be before endTime/
  );
});

test("ZoneBookingService requires an existing Zone", async () => {
  const service = new ZoneBookingService(createMemoryZoneBookingRepository(["zone-1"]));

  await assert.rejects(
    () =>
      service.create({
        zoneId: "missing-zone",
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00:00.000Z"
      }),
    /zoneId must reference an existing Zone/
  );
});

test("ZoneBookingService blocks conflicting reservations", async () => {
  const service = new ZoneBookingService(createMemoryZoneBookingRepository(["zone-1"]));

  await service.create({
    zoneId: "zone-1",
    startTime: "2026-01-01T10:00:00.000Z",
    endTime: "2026-01-01T11:00:00.000Z"
  });

  await assert.rejects(
    () =>
      service.create({
        zoneId: "zone-1",
        startTime: "2026-01-01T10:30:00.000Z",
        endTime: "2026-01-01T11:30:00.000Z"
      }),
    BookingConflictError
  );
});

test("ZoneBookingService lists and cancels reservations", async () => {
  const service = new ZoneBookingService(createMemoryZoneBookingRepository(["zone-1"]));
  const booking = await service.create({
    zoneId: "zone-1",
    startTime: "2026-01-01T10:00:00.000Z",
    endTime: "2026-01-01T11:00:00.000Z"
  });

  const bookings = await service.list();
  const cancelled = await service.cancel(booking.id);
  const missing = await service.cancel("missing");

  assert.equal(bookings.length, 1);
  assert.equal(cancelled?.status, BookingStatus.CANCELLED);
  assert.equal(missing, null);
});

test("ZoneBookingService keeps repeated cancellation idempotent", async () => {
  const service = new ZoneBookingService(createMemoryZoneBookingRepository(["zone-1"]));
  const booking = await service.create({
    zoneId: "zone-1",
    startTime: "2026-01-01T10:00:00.000Z",
    endTime: "2026-01-01T11:00:00.000Z"
  });

  const cancelled = await service.cancel(booking.id);
  const cancelledAgain = await service.cancel(booking.id);

  assert.equal(cancelledAgain?.status, BookingStatus.CANCELLED);
  assert.equal(cancelledAgain?.updatedAt.getTime(), cancelled?.updatedAt.getTime());
});
