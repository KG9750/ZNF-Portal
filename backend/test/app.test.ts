import test from "node:test";
import assert from "node:assert/strict";

import { createApp } from "../src/app.js";

test("backend app exposes health endpoint", async () => {
  const app = createApp({
    databaseUrl: "file:./test.db",
    nodeEnv: "test",
    port: 0
  });

  const server = app.listen(0);

  try {
    const address = server.address();

    assert.notEqual(address, null);
    assert.notEqual(typeof address, "string");

    if (address === null || typeof address === "string") {
      throw new Error("Expected TCP server address");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      service: "znf-portal-backend",
      status: "ready",
      environment: "test"
    });
  } finally {
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
});
