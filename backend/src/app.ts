import express, { type Express } from "express";
import type { PrismaClient } from "@prisma/client";

import type { BackendConfig } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createDeviceRepository } from "./modules/device/device.repository.js";
import { createDeviceRouter } from "./modules/device/device.router.js";
import { createDeviceService } from "./modules/device/device.service.js";
import { createHealthRouter } from "./modules/health/health.router.js";
import { createZoneRepository } from "./modules/zone/zone.repository.js";
import { createZoneRouter } from "./modules/zone/zone.router.js";
import { createZoneService } from "./modules/zone/zone.service.js";

export function createApp(config: BackendConfig, prisma?: PrismaClient): Express {
  const app = express();

  app.use(express.json());
  app.use(createHealthRouter(config));

  if (prisma !== undefined) {
    app.use(createZoneRouter(createZoneService(createZoneRepository(prisma))));
    app.use(createDeviceRouter(createDeviceService(createDeviceRepository(prisma))));
  }

  app.use(errorHandler);

  return app;
}
