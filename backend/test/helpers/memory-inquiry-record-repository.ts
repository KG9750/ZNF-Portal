import type { InquiryRecord } from "@prisma/client";

import type {
  CreateInquiryRecordInput,
  InquiryRecordRepository
} from "../../src/modules/inquiry-record/inquiry-record.types.js";

export function createMemoryInquiryRecordRepository(): InquiryRecordRepository {
  const inquiryRecords = new Map<string, InquiryRecord>();

  return {
    async create(input: CreateInquiryRecordInput) {
      const now = new Date();
      const inquiryRecord: InquiryRecord = {
        id: `inquiry-record-${inquiryRecords.size + 1}`,
        orgName: input.orgName,
        contact: input.contact,
        source: input.source,
        note: input.note,
        createdAt: now,
        updatedAt: now
      };

      inquiryRecords.set(inquiryRecord.id, inquiryRecord);
      return inquiryRecord;
    },
    async findMany() {
      return [...inquiryRecords.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  };
}
