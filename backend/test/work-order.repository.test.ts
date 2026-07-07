import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient, WorkOrderStatus, WorkOrderType } from "@prisma/client";

import { createWorkOrderRepository } from "../src/modules/work-order/work-order.repository.js";

test("WorkOrderRepository creates, lists, and updates work orders with SQLite", async () => {
  const dbDir = await mkdtemp(join(tmpdir(), "znf-work-order-"));
  const databaseUrl = `file:${join(dbDir, "test.db")}`;
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE zone (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE device (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        home_zone_id TEXT NOT NULL,
        current_zone_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'AVAILABLE',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE work_order (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        device_id TEXT,
        zone_id TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.zone.create({
      data: {
        id: "zone-1",
        name: "Training Zone",
        type: "LAB"
      }
    });
    await prisma.device.create({
      data: {
        id: "device-1",
        name: "Arm A",
        type: "ROBOT_ARM",
        homeZoneId: "zone-1",
        currentZoneId: "zone-1"
      }
    });

    const repository = createWorkOrderRepository(prisma);
    const deviceOrder = await repository.create({
      type: WorkOrderType.FAULT,
      deviceId: "device-1"
    });
    const zoneOrder = await repository.create({
      type: WorkOrderType.CLEAN,
      zoneId: "zone-1"
    });
    const missing = await repository.create({
      type: WorkOrderType.FAULT,
      deviceId: "missing"
    });
    const updated = await repository.updateStatus(deviceOrder?.id ?? "", {
      status: WorkOrderStatus.IN_PROGRESS
    });
    const missingUpdate = await repository.updateStatus("missing", {
      status: WorkOrderStatus.CLOSED
    });
    const workOrders = await repository.findMany();

    assert.equal(deviceOrder?.deviceId, "device-1");
    assert.equal(deviceOrder?.status, WorkOrderStatus.OPEN);
    assert.equal(zoneOrder?.zoneId, "zone-1");
    assert.equal(missing, null);
    assert.equal(updated?.status, WorkOrderStatus.IN_PROGRESS);
    assert.equal(missingUpdate, null);
    assert.equal(workOrders.length, 2);
  } finally {
    await prisma.$disconnect();
    await rm(dbDir, { recursive: true, force: true });
  }
});
