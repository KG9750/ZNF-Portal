import { Router, type ErrorRequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { BookingConflictError, ConflictValidationError } from "../conflict/conflict.service.js";
import { VisitBookingValidationError, type VisitBookingService } from "./visit-booking.service.js";

export function createVisitBookingRouter(service: VisitBookingService): Router {
  const router = Router();

  router.post(
    "/visit-bookings",
    asyncHandler(async (req, res) => {
      const booking = await service.create(req.body);
      res.status(201).json(booking);
    })
  );

  router.get(
    "/visit-bookings",
    asyncHandler(async (_req, res) => {
      res.json(await service.list());
    })
  );

  router.patch(
    "/visit-bookings/:id/cancel",
    asyncHandler(async (req, res) => {
      const booking = await service.cancel(req.params.id);

      if (booking === null) {
        res.status(404).json({ error: "VisitBooking not found" });
        return;
      }

      res.json(booking);
    })
  );

  router.use(visitBookingErrorHandler);

  return router;
}

const visitBookingErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof BookingConflictError) {
    res.status(409).json({ error: error.message });
    return;
  }

  if (error instanceof VisitBookingValidationError || error instanceof ConflictValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }

  next(error);
};
