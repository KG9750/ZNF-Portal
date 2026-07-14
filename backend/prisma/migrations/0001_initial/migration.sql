-- CreateTable
CREATE TABLE "zone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "home_zone_id" TEXT NOT NULL,
    "current_zone_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "device_home_zone_id_fkey" FOREIGN KEY ("home_zone_id") REFERENCES "zone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "device_current_zone_id_fkey" FOREIGN KEY ("current_zone_id") REFERENCES "zone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "zone_booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zone_id" TEXT NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "zone_booking_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "device_booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "device_id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "device_booking_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "device_booking_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "visit_booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "visitor_org" TEXT NOT NULL,
    "visitor_count" INTEGER NOT NULL,
    "need_demo" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "visit_record" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visit_booking_id" TEXT NOT NULL,
    "actual_start_time" DATETIME NOT NULL,
    "actual_end_time" DATETIME NOT NULL,
    "actual_visitor_count" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "visit_record_visit_booking_id_fkey" FOREIGN KEY ("visit_booking_id") REFERENCES "visit_booking" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "work_order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "device_id" TEXT,
    "zone_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "work_order_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "device" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "work_order_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zone" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "inquiry_record" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "org_name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "device_home_zone_id_idx" ON "device"("home_zone_id");

-- CreateIndex
CREATE INDEX "device_current_zone_id_idx" ON "device"("current_zone_id");

-- CreateIndex
CREATE INDEX "zone_booking_zone_id_start_time_end_time_idx" ON "zone_booking"("zone_id", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "device_booking_device_id_start_time_end_time_idx" ON "device_booking"("device_id", "start_time", "end_time");

-- CreateIndex
CREATE INDEX "device_booking_zone_id_idx" ON "device_booking"("zone_id");

-- CreateIndex
CREATE INDEX "visit_booking_start_time_end_time_idx" ON "visit_booking"("start_time", "end_time");

-- CreateIndex
CREATE UNIQUE INDEX "visit_record_visit_booking_id_key" ON "visit_record"("visit_booking_id");

-- CreateIndex
CREATE INDEX "work_order_device_id_idx" ON "work_order"("device_id");

-- CreateIndex
CREATE INDEX "work_order_zone_id_idx" ON "work_order"("zone_id");
