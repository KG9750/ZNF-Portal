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

test("loadConfig allows port zero for temporary test servers", () => {
  assert.equal(loadConfig({ PORT: "0" }).port, 0);
});

test("loadConfig rejects invalid ports", () => {
  assert.throws(() => loadConfig({ PORT: "invalid" }), /PORT must be zero or a positive integer/);
});

test("loadConfig rejects empty database URLs", () => {
  assert.throws(() => loadConfig({ DATABASE_URL: "" }), /DATABASE_URL must not be empty/);
});
