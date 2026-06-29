import test from "node:test";
import assert from "node:assert/strict";

import { createPrismaClient } from "../src/prisma/client.js";

test("createPrismaClient initializes Prisma with database URL", async () => {
  const prisma = createPrismaClient("file:./test.db");

  assert.equal(typeof prisma.$connect, "function");
  assert.equal(typeof prisma.$disconnect, "function");

  await prisma.$disconnect();
});
