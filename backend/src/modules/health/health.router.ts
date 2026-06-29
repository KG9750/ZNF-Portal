import { Router } from "express";

import type { BackendConfig } from "../../config/env.js";
import { getHealthStatus } from "./health.service.js";

export function createHealthRouter(config: BackendConfig): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json(getHealthStatus(config));
  });

  return router;
}
