import test from "node:test";
import assert from "node:assert/strict";

import { getHealthStatus } from "../src/modules/health/health.service.js";

test("health status reports backend readiness", () => {
  assert.deepEqual(
    getHealthStatus({
      databaseUrl: "file:./test.db",
      nodeEnv: "test",
      port: 3000
    }),
    {
      service: "znf-portal-backend",
      status: "ready",
      environment: "test"
    }
  );
});
