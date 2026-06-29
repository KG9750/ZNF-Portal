import test from "node:test";
import assert from "node:assert/strict";

import { createPrismaClient } from "../src/prisma/client.js";

test("createPrismaClient initializes Prisma with database URL", async () => {
  const prisma = createPrismaClient("file:./test-prisma.db");

  assert.equal(typeof prisma.$connect, "function");
  assert.equal(typeof prisma.$disconnect, "function");

  await prisma.$connect();

  const rows = await prisma.$queryRaw<Array<{ result: bigint }>>`SELECT 1 AS result`;

  assert.equal(rows.length, 1);
  assert.equal(Number(rows[0]?.result), 1);

  await prisma.$disconnect();
});
