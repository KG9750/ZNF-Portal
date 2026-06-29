import { Router, type ErrorRequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { BookingConflictError, ConflictValidationError } from "../conflict/conflict.service.js";
import { DeviceBookingValidationError, type DeviceBookingService } from "./device-booking.service.js";

export function createDeviceBookingRouter(service: DeviceBookingService): Router {
  const router = Router();

  router.post(
    "/device-bookings",
    asyncHandler(async (req, res) => {
      const booking = await service.create(req.body);
      res.status(201).json(booking);
    })
  );

  router.get(
    "/device-bookings",
    asyncHandler(async (_req, res) => {
      res.json(await service.list());
    })
  );

  router.use(deviceBookingErrorHandler);

  return router;
}

const deviceBookingErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof BookingConflictError) {
    res.status(409).json({ error: error.message });
    return;
  }

  if (error instanceof DeviceBookingValidationError || error instanceof ConflictValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }

  next(error);
};
