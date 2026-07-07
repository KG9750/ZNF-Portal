import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import type { DashboardService } from "./dashboard.service.js";

export function createDashboardRouter(service: DashboardService): Router {
  const router = Router();

  router.get(
    "/dashboard",
    asyncHandler(async (_req, res) => {
      res.json(await service.getOverview());
    })
  );

  return router;
}
