import { Prisma, type PrismaClient } from "@prisma/client";

import type { CreateZoneInput, UpdateZoneInput, ZoneRepository } from "./zone.types.js";

export function createZoneRepository(prisma: PrismaClient): ZoneRepository {
  return {
    create(input) {
      return prisma.zone.create({
        data: input
      });
    },
    findMany() {
      return prisma.zone.findMany({
        orderBy: {
          createdAt: "desc"
        }
      });
    },
    findById(id) {
      return prisma.zone.findUnique({
        where: {
          id
        }
      });
    },
    async update(id, input) {
      try {
        return await prisma.zone.update({
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
