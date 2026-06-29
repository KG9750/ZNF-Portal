import test from "node:test";
import assert from "node:assert/strict";

import { ConflictService } from "../src/modules/conflict/conflict.service.js";
import { createMemoryConflictRepository } from "./helpers/memory-conflict-repository.js";

test("ConflictService detects overlapping Zone time windows", async () => {
  const service = new ConflictService(
    createMemoryConflictRepository({
      zoneBookings: [
        {
          zoneId: "zone-1",
          startTime: new Date("2026-01-01T10:00:00.000Z"),
          endTime: new Date("2026-01-01T11:00:00.000Z")
        }
      ]
    })
  );

  const hasConflict = await service.hasZoneConflict({
    zoneId: "zone-1",
    startTime: "2026-01-01T10:30:00.000Z",
    endTime: "2026-01-01T11:30:00.000Z"
  });

  assert.equal(hasConflict, true);
});

test("ConflictService treats adjacent time windows as available", async () => {
  const service = new ConflictService(
    createMemoryConflictRepository({
      deviceBookings: [
        {
          deviceId: "device-1",
          startTime: new Date("2026-01-01T10:00:00.000Z"),
          endTime: new Date("2026-01-01T11:00:00.000Z")
        }
      ]
    })
  );

  const hasConflict = await service.hasDeviceConflict({
    deviceId: "device-1",
    startTime: new Date("2026-01-01T11:00:00.000Z"),
    endTime: new Date("2026-01-01T12:00:00.000Z")
  });

  assert.equal(hasConflict, false);
});

test("ConflictService treats upper-bound adjacency as available", async () => {
  const service = new ConflictService(
    createMemoryConflictRepository({
      zoneBookings: [
        {
          zoneId: "zone-1",
          startTime: new Date("2026-01-01T10:00:00.000Z"),
          endTime: new Date("2026-01-01T11:00:00.000Z")
        }
      ]
    })
  );

  const hasConflict = await service.hasZoneConflict({
    zoneId: "zone-1",
    startTime: new Date("2026-01-01T09:00:00.000Z"),
    endTime: new Date("2026-01-01T10:00:00.000Z")
  });

  assert.equal(hasConflict, false);
});

test("ConflictService detects enclosed Device time windows", async () => {
  const service = new ConflictService(
    createMemoryConflictRepository({
      deviceBookings: [
        {
          deviceId: "device-1",
          startTime: new Date("2026-01-01T10:00:00.000Z"),
          endTime: new Date("2026-01-01T12:00:00.000Z")
        }
      ]
    })
  );

  const hasConflict = await service.hasDeviceConflict({
    deviceId: "device-1",
    startTime: new Date("2026-01-01T10:30:00.000Z"),
    endTime: new Date("2026-01-01T11:30:00.000Z")
  });

  assert.equal(hasConflict, true);
});

test("ConflictService ignores cancelled reservations", async () => {
  const service = new ConflictService(
    createMemoryConflictRepository({
      zoneBookings: [
        {
          zoneId: "zone-1",
          status: "CANCELLED",
          startTime: new Date("2026-01-01T10:00:00.000Z"),
          endTime: new Date("2026-01-01T11:00:00.000Z")
        }
      ]
    })
  );

  const hasConflict = await service.hasZoneConflict({
    zoneId: "zone-1",
    startTime: new Date("2026-01-01T10:30:00.000Z"),
    endTime: new Date("2026-01-01T11:30:00.000Z")
  });

  assert.equal(hasConflict, false);
});

test("ConflictService blocks conflicting booking writes", async () => {
  const service = new ConflictService(
    createMemoryConflictRepository({
      deviceBookings: [
        {
          deviceId: "device-1",
          startTime: new Date("2026-01-01T10:00:00.000Z"),
          endTime: new Date("2026-01-01T11:00:00.000Z")
        }
      ]
    })
  );

  await assert.rejects(
    () =>
      service.assertDeviceAvailable({
        deviceId: "device-1",
        startTime: new Date("2026-01-01T10:30:00.000Z"),
        endTime: new Date("2026-01-01T11:30:00.000Z")
      }),
    /Device booking conflicts with existing reservation/
  );
});

test("ConflictService rejects invalid time windows", async () => {
  const service = new ConflictService(createMemoryConflictRepository());

  await assert.rejects(
    () =>
      service.assertZoneAvailable({
        zoneId: "zone-1",
        startTime: "2026-01-01T11:00:00.000Z",
        endTime: "2026-01-01T10:00:00.000Z"
      }),
    /startTime must be before endTime/
  );
});

test("ConflictService rejects missing resource IDs and empty date strings", async () => {
  const service = new ConflictService(createMemoryConflictRepository());

  await assert.rejects(
    () =>
      service.hasZoneConflict({
        startTime: "2026-01-01T10:00:00.000Z",
        endTime: "2026-01-01T11:00:00.000Z"
      }),
    /zoneId must be a non-empty string/
  );
  await assert.rejects(
    () =>
      service.hasDeviceConflict({
        deviceId: "device-1",
        startTime: "",
        endTime: "2026-01-01T11:00:00.000Z"
      }),
    /startTime must be a valid date/
  );
});

test("ConflictService accepts numeric timestamps", async () => {
  const service = new ConflictService(createMemoryConflictRepository());

  const hasConflict = await service.hasZoneConflict({
    zoneId: "zone-1",
    startTime: Date.parse("2026-01-01T10:00:00.000Z"),
    endTime: Date.parse("2026-01-01T11:00:00.000Z")
  });

  assert.equal(hasConflict, false);
});
