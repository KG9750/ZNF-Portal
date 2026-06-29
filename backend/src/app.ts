import express, { type Express } from "express";

import type { BackendConfig } from "./config/env.js";
import { createHealthRouter } from "./modules/health/health.router.js";

export function createApp(config: BackendConfig): Express {
  const app = express();

  app.use(express.json());
  app.use(createHealthRouter(config));

  return app;
}
