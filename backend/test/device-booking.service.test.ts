import test from "node:test";
import assert from "node:assert/strict";
import { BookingStatus } from "@prisma/client";

import { BookingConflictError } from "../src/modules/conflict/conflict.service.js";
import { DeviceBookingService } from "../src/modules/device-booking/device-booking.service.js";
import { createMemoryDeviceBookingRepository } from "./helpers/memory-device-booking-repository.js";

test("DeviceBookingService creates reservations with parsed time windows", async () => {
  const service = new DeviceBookingService(createMemoryDeviceBookingRepository());

  const booking = await service.create({
    deviceId: " device-1 ",
    zoneId: " zone-1 ",
    startTime: "2026-01-01T10:00:00.000Z",
    endTime: "2026-01-01T11:00:00.000Z"
  });

  assert.equal(booking.deviceId, "device-1");
  assert.equal(booking.zoneId, "zone-1");
  assert.equal(booking.status, BookingStatus.RESERVED);
  assert.equal(booking.startTime.toISOString(), "2026-01-01T10:00:00.000Z");
});

test("DeviceBookingService rejects invalid booking payloads", async () => {
  const service = new DeviceBookingService(createMemoryDeviceBookingRepository());

  await assert.rejects(
    () =>
      service.create({
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: "2026-01-01T11:00:00.000Z",
        endTime: "2026-01-01T10:00:00.000Z"
      }),
    /startTime must be before endTime/
  );
});

test("DeviceBookingService requires Device to be bound to Zone", async () => {
  const service = new DeviceBookingService(createMemoryDeviceBookingRepository());

  await assert.rejects(
    () =>
      service.create({
        deviceId: "device-1",
        zoneId: "zone-2",
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00:00.000Z"
      }),
    /deviceId must reference a Device bound to zoneId/
  );
});

test("DeviceBookingService blocks conflicting reservations", async () => {
  const service = new DeviceBookingService(createMemoryDeviceBookingRepository());

  await service.create({
    deviceId: "device-1",
    zoneId: "zone-1",
    startTime: "2026-01-01T10:00:00.000Z",
    endTime: "2026-01-01T11:00:00.000Z"
  });

  await assert.rejects(
    () =>
      service.create({
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: "2026-01-01T10:30:00.000Z",
        endTime: "2026-01-01T11:30:00.000Z"
      }),
    BookingConflictError
  );
});

test("DeviceBookingService lists reservations", async () => {
  const service = new DeviceBookingService(createMemoryDeviceBookingRepository());

  await service.create({
    deviceId: "device-1",
    zoneId: "zone-1",
    startTime: "2026-01-01T10:00:00.000Z",
    endTime: "2026-01-01T11:00:00.000Z"
  });

  const bookings = await service.list();

  assert.equal(bookings.length, 1);
});
