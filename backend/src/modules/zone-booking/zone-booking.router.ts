import { Router, type ErrorRequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { BookingConflictError, ConflictValidationError } from "../conflict/conflict.service.js";
import { ZoneBookingValidationError, type ZoneBookingService } from "./zone-booking.service.js";

export function createZoneBookingRouter(service: ZoneBookingService): Router {
  const router = Router();

  router.post(
    "/zone-bookings",
    asyncHandler(async (req, res) => {
      const booking = await service.create(req.body);
      res.status(201).json(booking);
    })
  );

  router.get(
    "/zone-bookings",
    asyncHandler(async (_req, res) => {
      res.json(await service.list());
    })
  );

  router.patch(
    "/zone-bookings/:id/cancel",
    asyncHandler(async (req, res) => {
      const booking = await service.cancel(req.params.id);

      if (booking === null) {
        res.status(404).json({ error: "ZoneBooking not found" });
        return;
      }

      res.json(booking);
    })
  );

  router.use(zoneBookingErrorHandler);

  return router;
}

const zoneBookingErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof BookingConflictError) {
    res.status(409).json({ error: error.message });
    return;
  }

  if (error instanceof ZoneBookingValidationError || error instanceof ConflictValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }

  next(error);
};
