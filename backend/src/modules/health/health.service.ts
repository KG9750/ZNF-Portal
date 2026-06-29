import type { BackendConfig } from "../../config/env.js";

export interface HealthStatus {
  service: string;
  status: "ready";
  environment: string;
}

export function getHealthStatus(config: BackendConfig): HealthStatus {
  return {
    service: "znf-portal-backend",
    status: "ready",
    environment: config.nodeEnv
  };
}
