import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";

const schemaPath = new URL("../prisma/schema.prisma", import.meta.url);

test("Prisma schema includes all V1 core models", async () => {
  const schema = await readFile(schemaPath, "utf8");
  const requiredModels = [
    "Zone",
    "Device",
    "ZoneBooking",
    "DeviceBooking",
    "VisitBooking",
    "VisitRecord",
    "WorkOrder",
    "InquiryRecord"
  ];

  for (const model of requiredModels) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
});

test("Prisma schema defines UUID primary keys and standard timestamps", async () => {
  const schema = await readFile(schemaPath, "utf8");
  const modelBlocks = schema.match(/model \w+ \{[\s\S]*?\n\}/g) ?? [];

  assert.equal(modelBlocks.length, 8);

  for (const block of modelBlocks) {
    assert.match(block, /id\s+String\s+@id\s+@default\(uuid\(\)\)/);
    assert.match(block, /createdAt\s+DateTime\s+@default\(now\(\)\)/);
    assert.match(block, /updatedAt\s+DateTime\s+@updatedAt/);
  }
});

test("Prisma schema maps database tables and columns to snake case", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /@@map\("zone_booking"\)/);
  assert.match(schema, /@@map\("device_booking"\)/);
  assert.match(schema, /@@map\("visit_booking"\)/);
  assert.match(schema, /@@map\("visit_record"\)/);
  assert.match(schema, /@@map\("zone"\)/);
  assert.match(schema, /@@map\("device"\)/);
  assert.match(schema, /@@map\("work_order"\)/);
  assert.match(schema, /@@map\("inquiry_record"\)/);
  assert.match(schema, /homeZoneId\s+String\s+@map\("home_zone_id"\)/);
  assert.match(schema, /currentZoneId\s+String\s+@map\("current_zone_id"\)/);
  assert.match(schema, /startTime\s+DateTime\s+@map\("start_time"\)/);
  assert.match(schema, /visitorOrg\s+String\s+@map\("visitor_org"\)/);
  assert.match(schema, /visitBookingId\s+String\s+@unique\s+@map\("visit_booking_id"\)/);
  assert.match(schema, /actualStartTime\s+DateTime\s+@map\("actual_start_time"\)/);
  assert.match(schema, /actualEndTime\s+DateTime\s+@map\("actual_end_time"\)/);
  assert.match(schema, /actualVisitorCount\s+Int\s+@map\("actual_visitor_count"\)/);
  assert.match(schema, /status\s+BookingStatus\s+@default\(RESERVED\)/);
  assert.match(schema, /needDemo\s+Boolean\s+@default\(false\)\s+@map\("need_demo"\)/);
});

test("Prisma schema keeps future task fields out of completed backend tasks", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.doesNotMatch(schema, /note\s+String/);
});

test("Prisma schema includes conflict-oriented booking indexes", async () => {
  const schema = await readFile(schemaPath, "utf8");

  assert.match(schema, /@@index\(\[zoneId,\s*startTime,\s*endTime\]\)/);
  assert.match(schema, /@@index\(\[deviceId,\s*startTime,\s*endTime\]\)/);
});
