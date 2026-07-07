import type { PrismaClient } from "@prisma/client";

import type { CreateInquiryRecordInput, InquiryRecordRepository } from "./inquiry-record.types.js";

export function createInquiryRecordRepository(prisma: PrismaClient): InquiryRecordRepository {
  return {
    create(input: CreateInquiryRecordInput) {
      return prisma.inquiryRecord.create({
        data: input
      });
    },
    findMany() {
      return prisma.inquiryRecord.findMany({
        orderBy: {
          createdAt: "desc"
        }
      });
    }
  };
}
