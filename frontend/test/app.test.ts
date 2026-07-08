import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { APP_TITLE, navigationItems } from "../src/app.js";
import { DashboardContent } from "../src/pages/DashboardPage.js";
import { createApiUrl } from "../src/services/api.js";
import { getDashboardOverview, type DashboardOverview } from "../src/services/dashboard.js";

test("frontend scaffold exposes React app metadata", () => {
  assert.equal(APP_TITLE, "ZNF-Portal");
  assert.deepEqual(
    navigationItems.map(item => item.path),
    ["/"]
  );
  assert.deepEqual(
    navigationItems.map(item => item.label),
    ["Dashboard"]
  );
});

test("frontend service layer builds backend API URLs", () => {
  assert.equal(createApiUrl("/health"), "/health");
  assert.equal(createApiUrl("/health", "https://api.example.test"), "https://api.example.test/health");
});

test("dashboard service fetches overview from backend API", async () => {
  const requests: string[] = [];
  const overview = createDashboardOverview();

  const result = await getDashboardOverview({ apiFetch: async input => {
    requests.push(input.toString());

    return new Response(JSON.stringify(overview), {
      headers: {
        "content-type": "application/json"
      },
      status: 200
    });
  } });

  assert.deepEqual(requests, ["/dashboard"]);
  assert.deepEqual(result, overview);
});

test("dashboard service reports failed overview requests", async () => {
  await assert.rejects(
    getDashboardOverview({ apiFetch: async () => new Response(JSON.stringify({ error: "Unavailable" }), { status: 503 }) }),
    /Dashboard API request failed: 503 - Unavailable/
  );
});

test("dashboard service rejects malformed overview responses", async () => {
  await assert.rejects(
    getDashboardOverview({ apiFetch: async () => new Response(JSON.stringify({ todayZoneBookings: null }), { status: 200 }) }),
    /Dashboard API response field todayZoneBookings is invalid/
  );
});

test("dashboard content renders loading and error states without fake totals", () => {
  const loadingMarkup = renderToStaticMarkup(
    createElement(DashboardContent, {
      state: { status: "loading", data: null, error: null }
    })
  );
  const errorMarkup = renderToStaticMarkup(
    createElement(DashboardContent, {
      state: { status: "error", data: null, error: "Dashboard API request failed: 503" }
    })
  );

  assert.match(loadingMarkup, /Loading dashboard data/);
  assert.match(loadingMarkup, /<strong>-<\/strong>/);
  assert.match(errorMarkup, /Dashboard API request failed: 503/);
  assert.match(errorMarkup, /<strong>-<\/strong>/);
});

test("dashboard content renders overview data", () => {
  const markup = renderToStaticMarkup(
    createElement(DashboardContent, {
      state: {
        status: "ready",
        data: createDashboardOverview({
          todayZoneBookings: [
            {
              id: "zone-booking-1",
              zoneId: "zone-1",
              startTime: "2026-01-01T09:00:00.000Z",
              endTime: "2026-01-01T10:00:00.000Z",
              status: "RESERVED"
            }
          ],
          todayDeviceBookings: [
            {
              id: "device-booking-1",
              deviceId: "device-1",
              zoneId: "zone-1",
              startTime: "2026-01-01T11:00:00.000Z",
              endTime: "2026-01-01T12:00:00.000Z",
              status: "RESERVED"
            }
          ],
          todayVisitBookings: [
            {
              id: "visit-booking-1",
              startTime: "2026-01-01T13:00:00.000Z",
              endTime: "2026-01-01T14:00:00.000Z",
              visitorOrg: "Acme Labs",
              visitorCount: 8,
              needDemo: true,
              status: "RESERVED"
            }
          ],
          faultDevices: [
            {
              id: "device-1",
              name: "Arm Station 1",
              type: "ROBOT_ARM",
              homeZoneId: "zone-1",
              currentZoneId: "zone-1",
              status: "FAULT"
            }
          ],
          pendingWorkOrders: [
            {
              id: "work-order-1",
              type: "FAULT",
              deviceId: "device-1",
              zoneId: null,
              status: "OPEN"
            }
          ]
        }),
        error: null
      }
    })
  );

  assert.match(markup, /今日预约/);
  assert.match(markup, /zone-1/);
  assert.match(markup, /device-1/);
  assert.match(markup, /Acme Labs/);
  assert.match(markup, /Arm Station 1/);
  assert.match(markup, /故障设备/);
  assert.match(markup, /工单状态/);
});

function createDashboardOverview(overrides: Partial<DashboardOverview> = {}): DashboardOverview {
  return {
    todayZoneBookings: [],
    todayDeviceBookings: [],
    todayVisitBookings: [],
    faultDevices: [],
    pendingWorkOrders: [],
    ...overrides
  };
}
