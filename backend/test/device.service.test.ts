import test from "node:test";
import assert from "node:assert/strict";
import { DeviceStatus } from "@prisma/client";

import { DeviceService } from "../src/modules/device/device.service.js";
import { createMemoryDeviceRepository } from "./helpers/memory-device-repository.js";

test("DeviceService creates devices bound to home and current zones", async () => {
  const service = new DeviceService(createMemoryDeviceRepository(["home-zone", "current-zone"]));

  const device = await service.create({
    name: " Microscope ",
    type: " LAB_EQUIPMENT ",
    homeZoneId: " home-zone ",
    currentZoneId: " current-zone "
  });

  assert.equal(device.name, "Microscope");
  assert.equal(device.type, "LAB_EQUIPMENT");
  assert.equal(device.homeZoneId, "home-zone");
  assert.equal(device.currentZoneId, "current-zone");
  assert.equal(device.status, DeviceStatus.AVAILABLE);
});

test("DeviceService rejects missing zone bindings", async () => {
  const service = new DeviceService(createMemoryDeviceRepository(["home-zone"]));

  await assert.rejects(
    () =>
      service.create({
        name: "Microscope",
        type: "LAB_EQUIPMENT",
        homeZoneId: "home-zone",
        currentZoneId: "missing-zone"
      }),
    /currentZoneId must reference an existing Zone/
  );
});

test("DeviceService rejects invalid status values", async () => {
  const service = new DeviceService(createMemoryDeviceRepository());

  await assert.rejects(
    () =>
      service.updateStatus("device-1", {
        status: "BROKEN"
      }),
    /status must be AVAILABLE, IN_USE, FAULT, or MAINTENANCE/
  );
});

test("DeviceService updates status and returns null for missing devices", async () => {
  const service = new DeviceService(createMemoryDeviceRepository());
  const device = await service.create({
    name: "Microscope",
    type: "LAB_EQUIPMENT",
    homeZoneId: "zone-1",
    currentZoneId: "zone-2"
  });

  const updated = await service.updateStatus(device.id, {
    status: DeviceStatus.MAINTENANCE
  });
  const missing = await service.updateStatus("missing", {
    status: DeviceStatus.FAULT
  });

  assert.equal(updated?.status, DeviceStatus.MAINTENANCE);
  assert.equal(missing, null);
});
