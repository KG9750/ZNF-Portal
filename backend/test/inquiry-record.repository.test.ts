import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

import { createInquiryRecordRepository } from "../src/modules/inquiry-record/inquiry-record.repository.js";

test("InquiryRecordRepository creates and lists inquiry records with SQLite", async () => {
  const dbDir = await mkdtemp(join(tmpdir(), "znf-inquiry-record-"));
  const databaseUrl = `file:${join(dbDir, "test.db")}`;
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE inquiry_record (
        id TEXT PRIMARY KEY,
        org_name TEXT NOT NULL,
        contact TEXT NOT NULL,
        source TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const repository = createInquiryRecordRepository(prisma);
    const inquiryRecord = await repository.create({
      orgName: "Acme Labs",
      contact: "Jane Doe",
      source: "Website",
      note: "Wants a demo"
    });
    const inquiryRecords = await repository.findMany();

    assert.equal(inquiryRecord.orgName, "Acme Labs");
    assert.equal(inquiryRecord.contact, "Jane Doe");
    assert.equal(inquiryRecord.source, "Website");
    assert.equal(inquiryRecord.note, "Wants a demo");
    assert.equal(inquiryRecords.length, 1);
  } finally {
    await prisma.$disconnect();
    await rm(dbDir, { recursive: true, force: true });
  }
});
