import test from "node:test";
import assert from "node:assert/strict";

import { getServiceStatus } from "../src/index.js";

test("backend scaffold reports ready status", () => {
  assert.deepEqual(getServiceStatus(), {
    service: "znf-portal-backend",
    status: "ready"
  });
});
