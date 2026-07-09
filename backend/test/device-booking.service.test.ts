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

test("DeviceBookingService accepts explicit timezone offsets", async () => {
  const service = new DeviceBookingService(createMemoryDeviceBookingRepository());

  const booking = await service.create({
    deviceId: "device-1",
    zoneId: "zone-1",
    startTime: "2026-01-01T13:30:00+05:30",
    endTime: "2026-01-01T05:00:00-05:00"
  });

  assert.equal(booking.startTime.toISOString(), "2026-01-01T08:00:00.000Z");
  assert.equal(booking.endTime.toISOString(), "2026-01-01T10:00:00.000Z");
});

test("DeviceBookingService rejects invalid booking payloads", async () => {
  const service = new DeviceBookingService(createMemoryDeviceBookingRepository());

  await assert.rejects(
    () =>
      service.create({
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: "2026-01-01T10:00",
        endTime: "2026-01-01T11:00"
      }),
    /startTime must include a timezone offset/
  );
  await assert.rejects(
    () =>
      service.create({
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00"
      }),
    /endTime must include a timezone offset/
  );
  await assert.rejects(
    () =>
      service.create({
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: 1767261600000,
        endTime: "2026-01-01T11:00:00.000Z"
      }),
    /startTime must be a valid date/
  );
  await assert.rejects(
    () =>
      service.create({
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: "2026-02-31T10:00:00+08:00",
        endTime: "2026-02-31T11:00:00+08:00"
      }),
    /startTime must be a valid date/
  );
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
