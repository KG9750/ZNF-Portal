import { Router, type ErrorRequestHandler } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";
import { WorkOrderValidationError, type WorkOrderService } from "./work-order.service.js";

export function createWorkOrderRouter(service: WorkOrderService): Router {
  const router = Router();

  router.post(
    "/work-orders",
    asyncHandler(async (req, res) => {
      const workOrder = await service.create(req.body);
      res.status(201).json(workOrder);
    })
  );

  router.get(
    "/work-orders",
    asyncHandler(async (_req, res) => {
      res.json(await service.list());
    })
  );

  router.patch(
    "/work-orders/:id/status",
    asyncHandler(async (req, res) => {
      const workOrder = await service.updateStatus(req.params.id, req.body);

      if (workOrder === null) {
        res.status(404).json({ error: "WorkOrder not found" });
        return;
      }

      res.json(workOrder);
    })
  );

  router.use(workOrderErrorHandler);

  return router;
}

const workOrderErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof WorkOrderValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }

  next(error);
};
