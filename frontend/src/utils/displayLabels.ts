const deviceTypeLabels: Record<string, string> = {
  LAB_EQUIPMENT: "实验设备",
  MOTION: "运动平台",
  ROBOT_ARM: "机械臂"
};

const workOrderTypeLabels: Record<string, string> = {
  CLEAN: "清洁",
  FAULT: "故障",
  MAINTENANCE: "维护"
};

const zoneTypeLabels: Record<string, string> = {
  LAB: "实验训练区"
};

export function formatDeviceType(type: string): string {
  return deviceTypeLabels[type] ?? type.replaceAll("_", " ");
}

export function formatWorkOrderType(type: string): string {
  return workOrderTypeLabels[type] ?? type.replaceAll("_", " ");
}

export function formatZoneType(type: string): string {
  return zoneTypeLabels[type] ?? type.replaceAll("_", " ");
}
