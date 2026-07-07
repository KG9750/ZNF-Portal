import type { WorkOrder } from "@prisma/client";

export interface CreateWorkOrderInput {
  type: WorkOrder["type"];
  deviceId?: string;
  zoneId?: string;
}

export interface UpdateWorkOrderStatusInput {
  status: WorkOrder["status"];
}

export interface WorkOrderRepository {
  create(input: CreateWorkOrderInput): Promise<WorkOrder | null>;
  findMany(): Promise<WorkOrder[]>;
  updateStatus(id: string, input: UpdateWorkOrderStatusInput): Promise<WorkOrder | null>;
}
