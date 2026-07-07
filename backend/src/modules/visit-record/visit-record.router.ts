import { Router, type ErrorRequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { VisitRecordValidationError, type VisitRecordService } from "./visit-record.service.js";

export function createVisitRecordRouter(service: VisitRecordService): Router {
  const router = Router();

  router.post(
    "/visit-records",
    asyncHandler(async (req, res) => {
      const record = await service.create(req.body);
      res.status(201).json(record);
    })
  );

  router.get(
    "/visit-records",
    asyncHandler(async (_req, res) => {
      res.json(await service.list());
    })
  );

  router.use(visitRecordErrorHandler);

  return router;
}

const visitRecordErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof VisitRecordValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }

  next(error);
};
