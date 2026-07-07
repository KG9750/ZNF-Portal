import express, { type Express } from "express";
import type { PrismaClient } from "@prisma/client";

import type { BackendConfig } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createDashboardRepository } from "./modules/dashboard/dashboard.repository.js";
import { createDashboardRouter } from "./modules/dashboard/dashboard.router.js";
import { createDashboardService } from "./modules/dashboard/dashboard.service.js";
import { createDeviceBookingRepository } from "./modules/device-booking/device-booking.repository.js";
import { createDeviceBookingRouter } from "./modules/device-booking/device-booking.router.js";
import { createDeviceBookingService } from "./modules/device-booking/device-booking.service.js";
import { createDeviceRepository } from "./modules/device/device.repository.js";
import { createDeviceRouter } from "./modules/device/device.router.js";
import { createDeviceService } from "./modules/device/device.service.js";
import { createHealthRouter } from "./modules/health/health.router.js";
import { createInquiryRecordRepository } from "./modules/inquiry-record/inquiry-record.repository.js";
import { createInquiryRecordRouter } from "./modules/inquiry-record/inquiry-record.router.js";
import { createInquiryRecordService } from "./modules/inquiry-record/inquiry-record.service.js";
import { createVisitBookingRepository } from "./modules/visit-booking/visit-booking.repository.js";
import { createVisitBookingRouter } from "./modules/visit-booking/visit-booking.router.js";
import { createVisitBookingService } from "./modules/visit-booking/visit-booking.service.js";
import { createVisitRecordRepository } from "./modules/visit-record/visit-record.repository.js";
import { createVisitRecordRouter } from "./modules/visit-record/visit-record.router.js";
import { createVisitRecordService } from "./modules/visit-record/visit-record.service.js";
import { createWorkOrderRepository } from "./modules/work-order/work-order.repository.js";
import { createWorkOrderRouter } from "./modules/work-order/work-order.router.js";
import { createWorkOrderService } from "./modules/work-order/work-order.service.js";
import { createZoneBookingRepository } from "./modules/zone-booking/zone-booking.repository.js";
import { createZoneBookingRouter } from "./modules/zone-booking/zone-booking.router.js";
import { createZoneBookingService } from "./modules/zone-booking/zone-booking.service.js";
import { createZoneRepository } from "./modules/zone/zone.repository.js";
import { createZoneRouter } from "./modules/zone/zone.router.js";
import { createZoneService } from "./modules/zone/zone.service.js";

export function createApp(config: BackendConfig, prisma?: PrismaClient): Express {
  const app = express();

  app.use(express.json());
  app.use(createHealthRouter(config));

  if (prisma !== undefined) {
    app.use(createDashboardRouter(createDashboardService(createDashboardRepository(prisma))));
    app.use(createZoneRouter(createZoneService(createZoneRepository(prisma))));
    app.use(createDeviceRouter(createDeviceService(createDeviceRepository(prisma))));
    app.use(createZoneBookingRouter(createZoneBookingService(createZoneBookingRepository(prisma))));
    app.use(createDeviceBookingRouter(createDeviceBookingService(createDeviceBookingRepository(prisma))));
    app.use(createVisitBookingRouter(createVisitBookingService(createVisitBookingRepository(prisma))));
    app.use(createVisitRecordRouter(createVisitRecordService(createVisitRecordRepository(prisma))));
    app.use(createWorkOrderRouter(createWorkOrderService(createWorkOrderRepository(prisma))));
    app.use(createInquiryRecordRouter(createInquiryRecordService(createInquiryRecordRepository(prisma))));
  }

  app.use(errorHandler);

  return app;
}
