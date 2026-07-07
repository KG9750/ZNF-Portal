import { WorkOrderStatus, type WorkOrder } from "@prisma/client";

import type {
  CreateWorkOrderInput,
  UpdateWorkOrderStatusInput,
  WorkOrderRepository
} from "../../src/modules/work-order/work-order.types.js";

export function createMemoryWorkOrderRepository(options?: {
  deviceIds?: Set<string>;
  zoneIds?: Set<string>;
}): WorkOrderRepository {
  const deviceIds = options?.deviceIds ?? new Set<string>();
  const zoneIds = options?.zoneIds ?? new Set<string>();
  const workOrders = new Map<string, WorkOrder>();

  return {
    async create(input: CreateWorkOrderInput) {
      if (input.deviceId !== undefined && !deviceIds.has(input.deviceId)) {
        return null;
      }

      if (input.zoneId !== undefined && !zoneIds.has(input.zoneId)) {
        return null;
      }

      const now = new Date();
      const workOrder: WorkOrder = {
        id: `work-order-${workOrders.size + 1}`,
        type: input.type,
        deviceId: input.deviceId ?? null,
        zoneId: input.zoneId ?? null,
        status: WorkOrderStatus.OPEN,
        createdAt: now,
        updatedAt: now
      };

      workOrders.set(workOrder.id, workOrder);
      return workOrder;
    },
    async findMany() {
      return [...workOrders.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async updateStatus(id: string, input: UpdateWorkOrderStatusInput) {
      const existing = workOrders.get(id);

      if (existing === undefined) {
        return null;
      }

      const updated: WorkOrder = {
        ...existing,
        status: input.status,
        updatedAt: new Date()
      };

      workOrders.set(id, updated);
      return updated;
    }
  };
}
