import test from "node:test";
import assert from "node:assert/strict";

import { InquiryRecordService } from "../src/modules/inquiry-record/inquiry-record.service.js";
import { createMemoryInquiryRecordRepository } from "./helpers/memory-inquiry-record-repository.js";

test("InquiryRecordService creates inquiry records with trimmed input", async () => {
  const service = new InquiryRecordService(createMemoryInquiryRecordRepository());

  const inquiryRecord = await service.create({
    orgName: " Acme Labs ",
    contact: " Jane Doe ",
    source: " Website ",
    note: " Wants a demo "
  });

  assert.equal(inquiryRecord.orgName, "Acme Labs");
  assert.equal(inquiryRecord.contact, "Jane Doe");
  assert.equal(inquiryRecord.source, "Website");
  assert.equal(inquiryRecord.note, "Wants a demo");
});

test("InquiryRecordService rejects invalid inquiry payloads", async () => {
  const service = new InquiryRecordService(createMemoryInquiryRecordRepository());

  await assert.rejects(
    () =>
      service.create({
        orgName: "",
        contact: "Jane Doe",
        source: "Website",
        note: "Wants a demo"
      }),
    /orgName must be a non-empty string/
  );
  await assert.rejects(
    () =>
      service.create({
        orgName: "Acme Labs",
        contact: "",
        source: "Website",
        note: "Wants a demo"
      }),
    /contact must be a non-empty string/
  );
  await assert.rejects(
    () =>
      service.create({
        orgName: "Acme Labs",
        contact: "Jane Doe",
        source: "",
        note: "Wants a demo"
      }),
    /source must be a non-empty string/
  );
  await assert.rejects(
    () =>
      service.create({
        orgName: "Acme Labs",
        contact: "Jane Doe",
        source: "Website",
        note: ""
      }),
    /note must be a non-empty string/
  );
});

test("InquiryRecordService lists inquiry records", async () => {
  const service = new InquiryRecordService(createMemoryInquiryRecordRepository());

  await service.create({
    orgName: "Acme Labs",
    contact: "Jane Doe",
    source: "Website",
    note: "Wants a demo"
  });

  const inquiryRecords = await service.list();

  assert.equal(inquiryRecords.length, 1);
});
