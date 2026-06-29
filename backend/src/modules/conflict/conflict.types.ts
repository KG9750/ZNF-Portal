export interface TimeWindowInput {
  startTime: Date;
  endTime: Date;
}

export interface ZoneConflictInput extends TimeWindowInput {
  zoneId: string;
}

export interface DeviceConflictInput extends TimeWindowInput {
  deviceId: string;
}

export interface ConflictRepository {
  hasZoneConflict(input: ZoneConflictInput): Promise<boolean>;
  hasDeviceConflict(input: DeviceConflictInput): Promise<boolean>;
}

// Booking write paths must call this guard in the same database transaction as the insert.
export interface ConflictWriteGuard {
  assertZoneAvailable(input: ZoneConflictInput): Promise<void>;
  assertDeviceAvailable(input: DeviceConflictInput): Promise<void>;
}
