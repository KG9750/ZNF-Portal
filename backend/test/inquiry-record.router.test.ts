import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { createInquiryRecordRouter } from "../src/modules/inquiry-record/inquiry-record.router.js";
import { InquiryRecordService } from "../src/modules/inquiry-record/inquiry-record.service.js";
import { createMemoryInquiryRecordRepository } from "./helpers/memory-inquiry-record-repository.js";

test("InquiryRecord router exposes create and list endpoints", async () => {
  const app = express();
  const service = new InquiryRecordService(createMemoryInquiryRecordRepository());

  app.use(express.json());
  app.use(createInquiryRecordRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const createResponse = await fetch(`${baseUrl}/inquiry-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        orgName: "Acme Labs",
        contact: "Jane Doe",
        source: "Website",
        note: "Wants a demo"
      })
    });
    const created = await createResponse.json() as {
      orgName: string;
      contact: string;
      source: string;
      note: string;
    };

    assert.equal(createResponse.status, 201);
    assert.equal(created.orgName, "Acme Labs");
    assert.equal(created.contact, "Jane Doe");
    assert.equal(created.source, "Website");
    assert.equal(created.note, "Wants a demo");

    const listResponse = await fetch(`${baseUrl}/inquiry-records`);
    const inquiryRecords = await listResponse.json() as Array<{ id: string }>;

    assert.equal(listResponse.status, 200);
    assert.equal(inquiryRecords.length, 1);
  } finally {
    await closeServer(server);
  }
});

test("InquiryRecord router returns validation errors", async () => {
  const app = express();
  const service = new InquiryRecordService(createMemoryInquiryRecordRepository());

  app.use(express.json());
  app.use(createInquiryRecordRouter(service));

  const server = app.listen(0);

  try {
    const baseUrl = getBaseUrl(server);
    const missingOrgResponse = await fetch(`${baseUrl}/inquiry-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        orgName: "",
        contact: "Jane Doe",
        source: "Website",
        note: "Wants a demo"
      })
    });
    const missingNoteResponse = await fetch(`${baseUrl}/inquiry-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        orgName: "Acme Labs",
        contact: "Jane Doe",
        source: "Website",
        note: ""
      })
    });

    assert.equal(missingOrgResponse.status, 400);
    assert.equal(missingNoteResponse.status, 400);
  } finally {
    await closeServer(server);
  }
});

function getBaseUrl(server: ReturnType<typeof express.application.listen>): string {
  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  if (address === null || typeof address === "string") {
    throw new Error("Expected TCP server address");
  }

  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: ReturnType<typeof express.application.listen>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
