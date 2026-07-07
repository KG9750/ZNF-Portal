import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import type { AnalyticsService } from "./analytics.service.js";

export function createAnalyticsRouter(service: AnalyticsService): Router {
  const router = Router();

  router.get(
    "/analytics",
    asyncHandler(async (_req, res) => {
      res.json(await service.getOverview());
    })
  );

  return router;
}
