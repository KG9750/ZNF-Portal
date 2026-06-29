import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { asyncHandler } from "../src/middleware/async-handler.js";
import { errorHandler } from "../src/middleware/error-handler.js";

test("errorHandler returns a JSON 500 response for async route failures", async () => {
  const app = express();
  const originalConsoleError = console.error;

  console.error = () => {};

  app.get(
    "/failure",
    asyncHandler(async () => {
      throw new Error("test failure");
    })
  );
  app.use(errorHandler);

  const server = app.listen(0);

  try {
    const address = server.address();

    assert.notEqual(address, null);
    assert.notEqual(typeof address, "string");

    if (address === null || typeof address === "string") {
      throw new Error("Expected TCP server address");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/failure`);
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.deepEqual(body, {
      error: "Internal Server Error"
    });
  } finally {
    console.error = originalConsoleError;

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
