import { Router, type ErrorRequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { ZoneValidationError, type ZoneService } from "./zone.service.js";

export function createZoneRouter(service: ZoneService): Router {
  const router = Router();

  router.post(
    "/zones",
    asyncHandler(async (req, res) => {
      const zone = await service.create(req.body);
      res.status(201).json(zone);
    })
  );

  router.get(
    "/zones",
    asyncHandler(async (_req, res) => {
      res.json(await service.list());
    })
  );

  router.get(
    "/zones/:id",
    asyncHandler(async (req, res) => {
      const zone = await service.get(req.params.id);

      if (zone === null) {
        res.status(404).json({ error: "Zone not found" });
        return;
      }

      res.json(zone);
    })
  );

  router.patch(
    "/zones/:id",
    asyncHandler(async (req, res) => {
      const zone = await service.update(req.params.id, req.body);

      if (zone === null) {
        res.status(404).json({ error: "Zone not found" });
        return;
      }

      res.json(zone);
    })
  );

  router.use(zoneValidationErrorHandler);

  return router;
}

const zoneValidationErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof ZoneValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }

  next(error);
};
