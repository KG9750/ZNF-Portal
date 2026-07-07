import { WorkOrderStatus, WorkOrderType, type WorkOrder } from "@prisma/client";

import type { CreateWorkOrderInput, UpdateWorkOrderStatusInput, WorkOrderRepository } from "./work-order.types.js";

export class WorkOrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkOrderValidationError";
  }
}

export class WorkOrderService {
  constructor(private readonly repository: WorkOrderRepository) {}

  async create(input: unknown): Promise<WorkOrder> {
    const workOrder = await this.repository.create(parseCreateWorkOrderInput(input));

    if (workOrder === null) {
      throw new WorkOrderValidationError("WorkOrder target must reference an existing Zone or Device");
    }

    return workOrder;
  }

  list(): Promise<WorkOrder[]> {
    return this.repository.findMany();
  }

  async updateStatus(id: string, input: unknown): Promise<WorkOrder | null> {
    assertId(id);
    return this.repository.updateStatus(id, parseUpdateWorkOrderStatusInput(input));
  }
}

export function createWorkOrderService(repository: WorkOrderRepository): WorkOrderService {
  return new WorkOrderService(repository);
}

function parseCreateWorkOrderInput(input: unknown): CreateWorkOrderInput {
  if (!isRecord(input)) {
    throw new WorkOrderValidationError("WorkOrder payload must be an object");
  }

  const type = readWorkOrderType(input.type);
  const deviceId = readOptionalString(input, "deviceId");
  const zoneId = readOptionalString(input, "zoneId");

  if ((deviceId === undefined && zoneId === undefined) || (deviceId !== undefined && zoneId !== undefined)) {
    throw new WorkOrderValidationError("WorkOrder must reference exactly one Zone or Device");
  }

  return {
    type,
    ...(deviceId === undefined ? {} : { deviceId }),
    ...(zoneId === undefined ? {} : { zoneId })
  };
}

function parseUpdateWorkOrderStatusInput(input: unknown): UpdateWorkOrderStatusInput {
  if (!isRecord(input)) {
    throw new WorkOrderValidationError("WorkOrder payload must be an object");
  }

  return {
    status: readWorkOrderStatus(input.status)
  };
}

function readWorkOrderType(value: unknown): WorkOrderType {
  if (value !== WorkOrderType.FAULT && value !== WorkOrderType.MAINTENANCE && value !== WorkOrderType.CLEAN) {
    throw new WorkOrderValidationError("type must be FAULT, MAINTENANCE, or CLEAN");
  }

  return value;
}

function readWorkOrderStatus(value: unknown): WorkOrderStatus {
  if (value !== WorkOrderStatus.OPEN && value !== WorkOrderStatus.IN_PROGRESS && value !== WorkOrderStatus.CLOSED) {
    throw new WorkOrderValidationError("status must be OPEN, IN_PROGRESS, or CLOSED");
  }

  return value;
}

function readOptionalString(input: Record<string, unknown>, key: string): string | undefined {
  if (!(key in input) || input[key] === undefined) {
    return undefined;
  }

  const value = input[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new WorkOrderValidationError(`${key} must be a non-empty string`);
  }

  return value.trim();
}

function assertId(id: string): void {
  if (id.trim() === "") {
    throw new WorkOrderValidationError("id must be a non-empty string");
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
