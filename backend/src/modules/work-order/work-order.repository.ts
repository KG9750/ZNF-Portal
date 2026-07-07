import { Prisma, type PrismaClient } from "@prisma/client";

import type { CreateWorkOrderInput, UpdateWorkOrderStatusInput, WorkOrderRepository } from "./work-order.types.js";

export function createWorkOrderRepository(prisma: PrismaClient): WorkOrderRepository {
  return {
    async create(input: CreateWorkOrderInput) {
      if ((input.deviceId === undefined && input.zoneId === undefined) || (input.deviceId !== undefined && input.zoneId !== undefined)) {
        return null;
      }

      return prisma.$transaction(async tx => {
        const targetExists =
          input.deviceId !== undefined
            ? (await tx.device.findUnique({ where: { id: input.deviceId } })) !== null
            : (await tx.zone.findUnique({ where: { id: input.zoneId } })) !== null;

        if (!targetExists) {
          return null;
        }

        try {
          return await tx.workOrder.create({
            data: {
              type: input.type,
              deviceId: input.deviceId,
              zoneId: input.zoneId
            }
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
            return null;
          }

          throw error;
        }
      });
    },
    findMany() {
      return prisma.workOrder.findMany({
        orderBy: {
          createdAt: "desc"
        }
      });
    },
    async updateStatus(id: string, input: UpdateWorkOrderStatusInput) {
      try {
        return await prisma.workOrder.update({
          where: {
            id
          },
          data: input
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
          return null;
        }

        throw error;
      }
    }
  };
}
