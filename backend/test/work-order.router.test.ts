import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { WorkOrderStatus, WorkOrderType } from "@prisma/client";

import { createWorkOrderRouter } from "../src/modules/work-order/work-order.router.js";
import { WorkOrderService } from "../src/modules/work-order/work-order.service.js";
import { createMemoryWorkOrderRepository } from "./helpers/memory-work-order-repository.js";

test("WorkOrder router exposes create, list, and status update endpoints", async () => {
  const app = express();
  const service = new WorkOrderService(
    createMemoryWorkOrderRepository({
      deviceIds: new Set(["device-1"])
    })
  );

  app.use(express.json());
  app.use(createWorkOrderRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const createResponse = await fetch(`${baseUrl}/work-orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: WorkOrderType.FAULT,
        deviceId: "device-1"
      })
    });
    const created = await createResponse.json() as {
      id: string;
      type: string;
      deviceId: string | null;
      status: string;
    };

    assert.equal(createResponse.status, 201);
    assert.equal(created.type, WorkOrderType.FAULT);
    assert.equal(created.deviceId, "device-1");
    assert.equal(created.status, WorkOrderStatus.OPEN);

    const listResponse = await fetch(`${baseUrl}/work-orders`);
    const workOrders = await listResponse.json() as Array<{ id: string }>;

    assert.equal(listResponse.status, 200);
    assert.equal(workOrders.length, 1);

    const updateResponse = await fetch(`${baseUrl}/work-orders/${created.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: WorkOrderStatus.CLOSED
      })
    });
    const updated = await updateResponse.json() as { status: string };

    assert.equal(updateResponse.status, 200);
    assert.equal(updated.status, WorkOrderStatus.CLOSED);
  } finally {
    await closeServer(server);
  }
});

test("WorkOrder router returns validation and missing-resource errors", async () => {
  const app = express();
  const service = new WorkOrderService(
    createMemoryWorkOrderRepository({
      deviceIds: new Set(["device-1"]),
      zoneIds: new Set(["zone-1"])
    })
  );

  app.use(express.json());
  app.use(createWorkOrderRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const invalidTypeResponse = await fetch(`${baseUrl}/work-orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "UNKNOWN",
        deviceId: "device-1"
      })
    });
    const missingTargetResponse = await fetch(`${baseUrl}/work-orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: WorkOrderType.FAULT,
        deviceId: "missing"
      })
    });
    const invalidStatusResponse = await fetch(`${baseUrl}/work-orders/missing/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: "UNKNOWN"
      })
    });
    const missingOrderResponse = await fetch(`${baseUrl}/work-orders/missing/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: WorkOrderStatus.CLOSED
      })
    });

    assert.equal(invalidTypeResponse.status, 400);
    assert.equal(missingTargetResponse.status, 400);
    assert.equal(invalidStatusResponse.status, 400);
    assert.equal(missingOrderResponse.status, 404);
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
