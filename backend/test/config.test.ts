import test from "node:test";
import assert from "node:assert/strict";

import { loadConfig } from "../src/config/env.js";

test("loadConfig applies defaults", () => {
  assert.deepEqual(loadConfig({}), {
    databaseUrl: "file:./dev.db",
    nodeEnv: "development",
    port: 3000
  });
});

test("loadConfig rejects invalid ports", () => {
  assert.throws(() => loadConfig({ PORT: "invalid" }), /PORT must be a positive integer/);
});
