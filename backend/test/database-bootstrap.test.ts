import assert from "node:assert/strict";
import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
const committedMigrationPath = join(backendDirectory, "prisma", "migrations", "0001_initial", "migration.sql");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const packagePath = join(backendDirectory, "package.json");
const schemaPath = join(backendDirectory, "prisma", "schema.prisma");

test("database migration remains an explicit deployment step", async () => {
  const packageJson = JSON.parse(await readFile(packagePath, "utf8")) as {
    scripts: Record<string, string>;
  };

  assert.equal(packageJson.scripts["db:migrate"], "prisma migrate deploy");
  assert.doesNotMatch(packageJson.scripts.start ?? "", /migrat/i);
  assert.doesNotMatch(packageJson.scripts.dev ?? "", /migrat/i);
});

test("backend startup leaves an unmigrated database untouched", async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "znf-portal-startup-"));
  const databasePath = join(temporaryDirectory, "unmigrated.db");
  const child = spawn(npmCommand, ["run", "dev"], {
    cwd: backendDirectory,
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      DATABASE_URL: `file:${databasePath}`,
      NODE_ENV: "test",
      PORT: "0"
    }
  });

  try {
    await waitForBackendStartup(child);
    await stopBackend(child);
    await assert.rejects(access(databasePath), (error: NodeJS.ErrnoException) => error.code === "ENOENT");
  } finally {
    await stopBackend(child);
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
});

test("committed migration matches the current Prisma schema", async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "znf-portal-migration-diff-"));
  const generatedMigrationPath = join(temporaryDirectory, "migration.sql");

  try {
    await execFileAsync(npmCommand, [
      "exec",
      "--",
      "prisma",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      schemaPath,
      "--script",
      "--output",
      generatedMigrationPath
    ], {
      cwd: backendDirectory,
      env: {
        ...process.env,
        DATABASE_URL: `file:${join(temporaryDirectory, "diff.db")}`
      }
    });

    assert.equal(
      await readFile(generatedMigrationPath, "utf8"),
      await readFile(committedMigrationPath, "utf8")
    );
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
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
    try {
      if (server !== undefined) {
        await closeServer(server);
      }
    } finally {
      await disconnectPrisma(prisma);
    }
  }
}

async function deployMigrations(databaseUrl: string): Promise<void> {
  await execFileAsync(npmCommand, ["run", "db:migrate"], {
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

async function waitForBackendStartup(child: ChildProcessWithoutNullStreams): Promise<void> {
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  let stderr = "";
  const onStderr = (chunk: string) => {
    stderr += chunk;
  };
  child.stderr.on("data", onStderr);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Backend startup timed out: ${stderr}`));
    }, 5_000);

    const onData = (chunk: string) => {
      if (chunk.includes("ZNF-Portal backend listening on port 0")) {
        cleanup();
        resolve();
      }
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      reject(new Error(`Backend exited before startup (code=${code}, signal=${signal}): ${stderr}`));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      child.stdout.off("data", onData);
      child.stderr.off("data", onStderr);
      child.off("exit", onExit);
    };

    child.stdout.on("data", onData);
    child.once("exit", onExit);
  });
}

async function stopBackend(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const exited = once(child, "exit");

  if (process.platform === "win32" || child.pid === undefined) {
    child.kill("SIGTERM");
  } else {
    process.kill(-child.pid, "SIGTERM");
  }

  await exited;
}
