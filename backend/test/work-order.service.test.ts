import test from "node:test";
import assert from "node:assert/strict";
import { WorkOrderStatus, WorkOrderType } from "@prisma/client";

import { WorkOrderService } from "../src/modules/work-order/work-order.service.js";
import { createMemoryWorkOrderRepository } from "./helpers/memory-work-order-repository.js";

test("WorkOrderService creates device and zone work orders", async () => {
  const service = new WorkOrderService(
    createMemoryWorkOrderRepository({
      deviceIds: new Set(["device-1"]),
      zoneIds: new Set(["zone-1"])
    })
  );

  const deviceOrder = await service.create({
    type: WorkOrderType.FAULT,
    deviceId: " device-1 "
  });
  const zoneOrder = await service.create({
    type: WorkOrderType.CLEAN,
    zoneId: " zone-1 "
  });

  assert.equal(deviceOrder.type, WorkOrderType.FAULT);
  assert.equal(deviceOrder.deviceId, "device-1");
  assert.equal(deviceOrder.zoneId, null);
  assert.equal(deviceOrder.status, WorkOrderStatus.OPEN);
  assert.equal(zoneOrder.type, WorkOrderType.CLEAN);
  assert.equal(zoneOrder.deviceId, null);
  assert.equal(zoneOrder.zoneId, "zone-1");
});

test("WorkOrderService rejects invalid create payloads", async () => {
  const service = new WorkOrderService(
    createMemoryWorkOrderRepository({
      deviceIds: new Set(["device-1"]),
      zoneIds: new Set(["zone-1"])
    })
  );

  await assert.rejects(
    () =>
      service.create({
        type: "UNKNOWN",
        deviceId: "device-1"
      }),
    /type must be FAULT, MAINTENANCE, or CLEAN/
  );
  await assert.rejects(
    () =>
      service.create({
        type: WorkOrderType.FAULT
      }),
    /WorkOrder must reference exactly one Zone or Device/
  );
  await assert.rejects(
    () =>
      service.create({
        type: WorkOrderType.FAULT,
        deviceId: "device-1",
        zoneId: "zone-1"
      }),
    /WorkOrder must reference exactly one Zone or Device/
  );
  await assert.rejects(
    () =>
      service.create({
        type: WorkOrderType.FAULT,
        deviceId: ""
      }),
    /deviceId must be a non-empty string/
  );
});

test("WorkOrderService requires an existing target", async () => {
  const service = new WorkOrderService(createMemoryWorkOrderRepository());

  await assert.rejects(
    () =>
      service.create({
        type: WorkOrderType.FAULT,
        deviceId: "missing"
      }),
    /WorkOrder target must reference an existing Zone or Device/
  );
});

test("WorkOrderService lists and updates work order status", async () => {
  const service = new WorkOrderService(
    createMemoryWorkOrderRepository({
      deviceIds: new Set(["device-1"])
    })
  );
  const workOrder = await service.create({
    type: WorkOrderType.MAINTENANCE,
    deviceId: "device-1"
  });

  const updated = await service.updateStatus(workOrder.id, {
    status: WorkOrderStatus.IN_PROGRESS
  });
  const missing = await service.updateStatus("missing", {
    status: WorkOrderStatus.CLOSED
  });
  const workOrders = await service.list();

  assert.equal(updated?.status, WorkOrderStatus.IN_PROGRESS);
  assert.equal(missing, null);
  assert.equal(workOrders.length, 1);
});

test("WorkOrderService rejects invalid status updates", async () => {
  const service = new WorkOrderService(createMemoryWorkOrderRepository());

  await assert.rejects(
    () =>
      service.updateStatus("work-order-1", {
        status: "INVALID"
      }),
    /status must be OPEN, IN_PROGRESS, or CLOSED/
  );
  await assert.rejects(
    () => service.updateStatus("", { status: WorkOrderStatus.CLOSED }),
    /id must be a non-empty string/
  );
});
