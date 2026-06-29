import { ZoneStatus, type Zone } from "@prisma/client";

import type { CreateZoneInput, UpdateZoneInput, ZoneRepository } from "../../src/modules/zone/zone.types.js";

export function createMemoryZoneRepository(): ZoneRepository {
  const zones = new Map<string, Zone>();

  return {
    async create(input: CreateZoneInput) {
      const now = new Date();
      const zone: Zone = {
        id: `zone-${zones.size + 1}`,
        name: input.name,
        type: input.type,
        status: input.status ?? ZoneStatus.ACTIVE,
        createdAt: now,
        updatedAt: now
      };

      zones.set(zone.id, zone);
      return zone;
    },
    async findMany() {
      return [...zones.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async findById(id: string) {
      return zones.get(id) ?? null;
    },
    async update(id: string, input: UpdateZoneInput) {
      const existing = zones.get(id);

      if (existing === undefined) {
        return null;
      }

      const updated: Zone = {
        ...existing,
        ...input,
        updatedAt: new Date()
      };

      zones.set(id, updated);
      return updated;
    }
  };
}
