import test from "node:test";
import assert from "node:assert/strict";
import { ZoneStatus } from "@prisma/client";

import { ZoneService } from "../src/modules/zone/zone.service.js";
import { createMemoryZoneRepository } from "./helpers/memory-zone-repository.js";

test("ZoneService creates zones with trimmed input", async () => {
  const repository = createMemoryZoneRepository();
  const service = new ZoneService(repository);

  const zone = await service.create({
    name: " Training Hall ",
    type: " LAB "
  });

  assert.equal(zone.name, "Training Hall");
  assert.equal(zone.type, "LAB");
  assert.equal(zone.status, ZoneStatus.ACTIVE);
});

test("ZoneService rejects invalid create payloads", async () => {
  const service = new ZoneService(createMemoryZoneRepository());

  await assert.rejects(() => service.create({ name: "", type: "LAB" }), /name must be a non-empty string/);
});

test("ZoneService updates zones and returns null for missing zones", async () => {
  const service = new ZoneService(createMemoryZoneRepository());
  const zone = await service.create({ name: "A", type: "LAB" });

  const updated = await service.update(zone.id, {
    status: ZoneStatus.INACTIVE
  });
  const missing = await service.update("missing", {
    name: "Missing"
  });

  assert.equal(updated?.status, ZoneStatus.INACTIVE);
  assert.equal(missing, null);
});
