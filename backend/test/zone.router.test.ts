import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { createZoneRouter } from "../src/modules/zone/zone.router.js";
import { ZoneService } from "../src/modules/zone/zone.service.js";
import { createMemoryZoneRepository } from "./helpers/memory-zone-repository.js";

test("Zone router exposes CRUD endpoints", async () => {
  const app = express();
  const service = new ZoneService(createMemoryZoneRepository());

  app.use(express.json());
  app.use(createZoneRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const createResponse = await fetch(`${baseUrl}/zones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Training Hall",
        type: "LAB"
      })
    });
    const created = await createResponse.json() as { id: string; name: string };

    assert.equal(createResponse.status, 201);
    assert.equal(created.name, "Training Hall");

    const listResponse = await fetch(`${baseUrl}/zones`);
    const zones = await listResponse.json() as Array<{ id: string }>;

    assert.equal(listResponse.status, 200);
    assert.equal(zones.length, 1);

    const detailResponse = await fetch(`${baseUrl}/zones/${created.id}`);
    const detail = await detailResponse.json() as { id: string };

    assert.equal(detailResponse.status, 200);
    assert.equal(detail.id, created.id);

    const updateResponse = await fetch(`${baseUrl}/zones/${created.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: "INACTIVE"
      })
    });
    const updated = await updateResponse.json() as { status: string };

    assert.equal(updateResponse.status, 200);
    assert.equal(updated.status, "INACTIVE");
  } finally {
    await closeServer(server);
  }
});

test("Zone router returns validation errors and missing-zone 404s", async () => {
  const app = express();
  const service = new ZoneService(createMemoryZoneRepository());

  app.use(express.json());
  app.use(createZoneRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const invalidResponse = await fetch(`${baseUrl}/zones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "",
        type: "LAB"
      })
    });
    const missingResponse = await fetch(`${baseUrl}/zones/missing`);

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
