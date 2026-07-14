import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import type { PrismaClient } from "@prisma/client";

import { createApp } from "../src/app.js";
import { createPrismaClient } from "../src/prisma/client.js";

const execFileAsync = promisify(execFile);
const backendDirectory = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const packagePath = join(backendDirectory, "package.json");
const prismaCliPath = join(backendDirectory, "node_modules", "prisma", "build", "index.js");
const schemaPath = join(backendDirectory, "prisma", "schema.prisma");

test("database migration remains an explicit deployment step", async () => {
  const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
    scripts: Record<string, string>;
  };

  assert.equal(packageJson.scripts["db:migrate"], "prisma migrate deploy");
  assert.doesNotMatch(packageJson.scripts.start ?? "", /migrat/i);
  assert.doesNotMatch(packageJson.scripts.dev ?? "", /migrat/i);
});

test("committed migration cold-starts fresh Prisma-backed applications", async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "znf-portal-bootstrap-"));

  try {
    for (const databaseName of ["first.db", "second.db"]) {
      await verifyColdStart(join(temporaryDirectory, databaseName));
    }
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
});

async function verifyColdStart(databasePath: string): Promise<void> {
  const databaseUrl = `file:${databasePath}`;

  await writeFile(databasePath, "");
  await deployMigrations(databaseUrl);
  await deployMigrations(databaseUrl);

  const prisma = createPrismaClient(databaseUrl);
  let server: Server | undefined;

  try {
    await prisma.$connect();

    const app = createApp({
      databaseUrl,
      nodeEnv: "test",
      port: 0
    }, prisma);

    server = app.listen(0);
    const baseUrl = getBaseUrl(server);
    const createResponse = await fetch(`${baseUrl}/zones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Cold Start Zone",
        type: "LAB"
      })
    });
    const created = await createResponse.json() as {
      id: string;
      name: string;
      status: string;
      type: string;
    };

    assert.equal(createResponse.status, 201);
    assert.equal(created.name, "Cold Start Zone");
    assert.equal(created.type, "LAB");
    assert.equal(created.status, "ACTIVE");

    const detailResponse = await fetch(`${baseUrl}/zones/${created.id}`);
    const detail = await detailResponse.json() as typeof created;

    assert.equal(detailResponse.status, 200);
    assert.deepEqual(detail, created);
  } finally {
    if (server !== undefined) {
      await closeServer(server);
    }

    await disconnectPrisma(prisma);
  }
}

async function deployMigrations(databaseUrl: string): Promise<void> {
  await execFileAsync(process.execPath, [prismaCliPath, "migrate", "deploy", "--schema", schemaPath], {
    cwd: backendDirectory,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl
    }
  });
}

function getBaseUrl(server: Server): string {
  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  if (address === null || typeof address === "string") {
    throw new Error("Expected TCP server address");
  }

  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
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

async function disconnectPrisma(prisma: PrismaClient): Promise<void> {
  await prisma.$disconnect();
}
