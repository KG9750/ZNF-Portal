import { Router, type ErrorRequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { InquiryRecordValidationError, type InquiryRecordService } from "./inquiry-record.service.js";

export function createInquiryRecordRouter(service: InquiryRecordService): Router {
  const router = Router();

  router.post(
    "/inquiry-records",
    asyncHandler(async (req, res) => {
      const inquiryRecord = await service.create(req.body);
      res.status(201).json(inquiryRecord);
    })
  );

  router.get(
    "/inquiry-records",
    asyncHandler(async (_req, res) => {
      res.json(await service.list());
    })
  );

  router.use(inquiryRecordErrorHandler);

  return router;
}

const inquiryRecordErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof InquiryRecordValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }

  next(error);
};
