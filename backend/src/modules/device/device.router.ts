import { Router, type ErrorRequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { DeviceValidationError, type DeviceService } from "./device.service.js";

export function createDeviceRouter(service: DeviceService): Router {
  const router = Router();

  router.post(
    "/devices",
    asyncHandler(async (req, res) => {
      const device = await service.create(req.body);
      res.status(201).json(device);
    })
  );

  router.get(
    "/devices",
    asyncHandler(async (_req, res) => {
      res.json(await service.list());
    })
  );

  router.get(
    "/devices/:id",
    asyncHandler(async (req, res) => {
      const device = await service.get(req.params.id);

      if (device === null) {
        res.status(404).json({ error: "Device not found" });
        return;
      }

      res.json(device);
    })
  );

  router.patch(
    "/devices/:id",
    asyncHandler(async (req, res) => {
      const device = await service.updateStatus(req.params.id, req.body);

      if (device === null) {
        res.status(404).json({ error: "Device not found" });
        return;
      }

      res.json(device);
    })
  );

  router.use(deviceValidationErrorHandler);

  return router;
}

const deviceValidationErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof DeviceValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }

  next(error);
};
