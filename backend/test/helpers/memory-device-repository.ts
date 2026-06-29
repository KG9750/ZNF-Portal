import { DeviceStatus, type Device } from "@prisma/client";

import type {
  CreateDeviceInput,
  DeviceRepository,
  UpdateDeviceStatusInput
} from "../../src/modules/device/device.types.js";

export function createMemoryDeviceRepository(zoneIds = ["zone-1", "zone-2"]): DeviceRepository {
  const devices = new Map<string, Device>();
  const zones = new Set(zoneIds);

  return {
    async create(input: CreateDeviceInput) {
      const now = new Date();
      const device: Device = {
        id: `device-${devices.size + 1}`,
        name: input.name,
        type: input.type,
        homeZoneId: input.homeZoneId,
        currentZoneId: input.currentZoneId,
        status: input.status ?? DeviceStatus.AVAILABLE,
        createdAt: now,
        updatedAt: now
      };

      devices.set(device.id, device);
      return device;
    },
    async findMany() {
      return [...devices.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async findById(id: string) {
      return devices.get(id) ?? null;
    },
    async updateStatus(id: string, input: UpdateDeviceStatusInput) {
      const existing = devices.get(id);

      if (existing === undefined) {
        return null;
      }

      const updated: Device = {
        ...existing,
        status: input.status,
        updatedAt: new Date()
      };

      devices.set(id, updated);
      return updated;
    },
    async findExistingZoneIds(ids: string[]) {
      return ids.filter(id => zones.has(id));
    }
  };
}
