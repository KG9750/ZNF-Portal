import test from "node:test";
import assert from "node:assert/strict";

import { getAppShellTitle } from "../src/app.js";

test("frontend scaffold exposes app shell title", () => {
  assert.equal(getAppShellTitle(), "ZNF-Portal");
});
