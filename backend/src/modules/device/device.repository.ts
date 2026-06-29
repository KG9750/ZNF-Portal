import { Prisma, type PrismaClient } from "@prisma/client";

import type { CreateDeviceInput, DeviceRepository, UpdateDeviceStatusInput } from "./device.types.js";

export function createDeviceRepository(prisma: PrismaClient): DeviceRepository {
  return {
    create(input: CreateDeviceInput) {
      return prisma.device.create({
        data: input
      });
    },
    findMany() {
      return prisma.device.findMany({
        orderBy: {
          createdAt: "desc"
        }
      });
    },
    findById(id: string) {
      return prisma.device.findUnique({
        where: {
          id
        }
      });
    },
    async updateStatus(id: string, input: UpdateDeviceStatusInput) {
      try {
        return await prisma.device.update({
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
    },
    async findExistingZoneIds(ids: string[]) {
      const zones = await prisma.zone.findMany({
        where: {
          id: {
            in: [...new Set(ids)]
          }
        },
        select: {
          id: true
        }
      });

      return zones.map(zone => zone.id);
    }
  };
}
