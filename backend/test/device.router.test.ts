import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { createDeviceRouter } from "../src/modules/device/device.router.js";
import { DeviceService } from "../src/modules/device/device.service.js";
import { createMemoryDeviceRepository } from "./helpers/memory-device-repository.js";

test("Device router exposes create, list, detail, and status update endpoints", async () => {
  const app = express();
  const service = new DeviceService(createMemoryDeviceRepository(["zone-1", "zone-2"]));

  app.use(express.json());
  app.use(createDeviceRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const createResponse = await fetch(`${baseUrl}/devices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Microscope",
        type: "LAB_EQUIPMENT",
        homeZoneId: "zone-1",
        currentZoneId: "zone-2"
      })
    });
    const created = await createResponse.json() as { id: string; homeZoneId: string };

    assert.equal(createResponse.status, 201);
    assert.equal(created.homeZoneId, "zone-1");

    const listResponse = await fetch(`${baseUrl}/devices`);
    const devices = await listResponse.json() as Array<{ id: string }>;

    assert.equal(listResponse.status, 200);
    assert.equal(devices.length, 1);

    const detailResponse = await fetch(`${baseUrl}/devices/${created.id}`);
    const detail = await detailResponse.json() as { id: string };

    assert.equal(detailResponse.status, 200);
    assert.equal(detail.id, created.id);

    const updateResponse = await fetch(`${baseUrl}/devices/${created.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: "IN_USE"
      })
    });
    const updated = await updateResponse.json() as { status: string };

    assert.equal(updateResponse.status, 200);
    assert.equal(updated.status, "IN_USE");
  } finally {
    await closeServer(server);
  }
});

test("Device router returns validation errors and missing-device 404s", async () => {
  const app = express();
  const service = new DeviceService(createMemoryDeviceRepository(["zone-1"]));

  app.use(express.json());
  app.use(createDeviceRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const invalidResponse = await fetch(`${baseUrl}/devices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Microscope",
        type: "LAB_EQUIPMENT",
        homeZoneId: "zone-1",
        currentZoneId: "missing-zone"
      })
    });
    const missingResponse = await fetch(`${baseUrl}/devices/missing`);

    assert.equal(invalidResponse.status, 400);
    assert.equal(missingResponse.status, 404);
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
