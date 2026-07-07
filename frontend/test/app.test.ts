import test from "node:test";
import assert from "node:assert/strict";

import { APP_TITLE, navigationItems } from "../src/app.js";
import { createApiUrl } from "../src/services/api.js";

test("frontend scaffold exposes React app metadata", () => {
  assert.equal(APP_TITLE, "ZNF-Portal");
  assert.deepEqual(
    navigationItems.map(item => item.path),
    ["/"]
  );
});

test("frontend service layer builds backend API URLs", () => {
  assert.equal(createApiUrl("/health"), "/health");
  assert.equal(createApiUrl("/health", "https://api.example.test"), "https://api.example.test/health");
});
