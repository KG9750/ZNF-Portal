import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { closeServer } from "../src/server/shutdown.js";

test("closeServer waits for server close", async () => {
  const app = express();
  const server = app.listen(0);

  await closeServer(server);

  assert.equal(server.listening, false);
});
