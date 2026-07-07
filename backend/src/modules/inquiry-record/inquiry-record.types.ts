import type { InquiryRecord } from "@prisma/client";

export interface CreateInquiryRecordInput {
  orgName: string;
  contact: string;
  source: string;
  note: string;
}

export interface InquiryRecordRepository {
  create(input: CreateInquiryRecordInput): Promise<InquiryRecord>;
  findMany(): Promise<InquiryRecord[]>;
}
