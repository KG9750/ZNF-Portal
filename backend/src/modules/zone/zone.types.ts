import type { Zone, ZoneStatus } from "@prisma/client";

export interface CreateZoneInput {
  name: string;
  type: string;
  status?: ZoneStatus;
}

export interface UpdateZoneInput {
  name?: string;
  type?: string;
  status?: ZoneStatus;
}

export interface ZoneRepository {
  create(input: CreateZoneInput): Promise<Zone>;
  findMany(): Promise<Zone[]>;
  findById(id: string): Promise<Zone | null>;
  update(id: string, input: UpdateZoneInput): Promise<Zone | null>;
}
