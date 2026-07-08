import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { APP_TITLE, navigationItems } from "../src/app.js";
import { DashboardContent } from "../src/pages/DashboardPage.js";
import { DeviceContent } from "../src/pages/DevicePage.js";
import { ZoneContent } from "../src/pages/ZonePage.js";
import { createApiUrl } from "../src/services/api.js";
import { getDevices } from "../src/services/devices.js";
import { getDashboardOverview, type DashboardOverview } from "../src/services/dashboard.js";
import { getZoneBookings, getZones } from "../src/services/zones.js";

test("frontend scaffold exposes React app metadata", () => {
  assert.equal(APP_TITLE, "ZNF-Portal");
  assert.deepEqual(
    navigationItems.map(item => item.path),
    ["/", "/zones", "/devices"]
  );
  assert.deepEqual(
    navigationItems.map(item => item.label),
    ["Dashboard", "Zones", "Devices"]
  );
});

test("frontend service layer builds backend API URLs", () => {
  assert.equal(createApiUrl("/health"), "/health");
  assert.equal(createApiUrl("/health", "https://api.example.test"), "https://api.example.test/health");
});

test("zone services fetch zones and zone bookings", async () => {
  const requests: string[] = [];
  const apiFetch: typeof fetch = async input => {
    requests.push(input.toString());

    if (input.toString() === "/zones") {
      return new Response(
        JSON.stringify([
          {
            id: "zone-1",
            name: "Training Bay",
            type: "LAB",
            status: "ACTIVE",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
          }
        ]),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify([
        {
          id: "zone-booking-1",
          zoneId: "zone-1",
          startTime: "2026-01-01T00:00:00.000Z",
          endTime: "2026-01-01T01:00:00.000Z",
          status: "RESERVED"
        }
      ]),
      { status: 200 }
    );
  };

  const zones = await getZones({ apiFetch });
  const zoneBookings = await getZoneBookings({ apiFetch });

  assert.deepEqual(requests, ["/zones", "/zone-bookings"]);
  assert.equal(zones[0]?.name, "Training Bay");
  assert.equal(zoneBookings[0]?.zoneId, "zone-1");
});

test("device service fetches devices", async () => {
  const requests: string[] = [];
  const devices = await getDevices({
    apiFetch: async input => {
      requests.push(input.toString());

      return new Response(
        JSON.stringify([
          {
            id: "device-1",
            name: "Arm Station",
            type: "ROBOT_ARM",
            homeZoneId: "zone-1",
            currentZoneId: "zone-2",
            status: "IN_USE",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
          }
        ]),
        { status: 200 }
      );
    }
  });

  assert.deepEqual(requests, ["/devices"]);
  assert.equal(devices[0]?.name, "Arm Station");
  assert.equal(devices[0]?.currentZoneId, "zone-2");
});

test("device service rejects malformed responses", async () => {
  await assert.rejects(
    getDevices({ apiFetch: async () => new Response(JSON.stringify([{ id: "device-1", status: "ACTIVE" }]), { status: 200 }) }),
    /devices\[0\]\.name API response is invalid/
  );
});

test("device service reports failed requests", async () => {
  await assert.rejects(
    getDevices({ apiFetch: async () => new Response(JSON.stringify({ error: "Device store unavailable" }), { status: 503 }) }),
    /Device API request failed: 503 - Device store unavailable/
  );
  await assert.rejects(
    getDevices({ apiFetch: async () => new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }) }),
    /Device API request failed: 403 - Forbidden/
  );
  await assert.rejects(
    getDevices({ apiFetch: async () => new Response("Unavailable", { status: 500 }) }),
    /Device API request failed: 500/
  );
});

test("zone service rejects malformed responses", async () => {
  await assert.rejects(
    getZones({ apiFetch: async () => new Response(JSON.stringify([{ id: 123 }]), { status: 200 }) }),
    /zones\[0\]\.id API response is invalid/
  );

  await assert.rejects(
    getZoneBookings({
      apiFetch: async () =>
        new Response(
          JSON.stringify([
            {
              id: "zone-booking-1",
              zoneId: "zone-1",
              startTime: "2026-01-01T00:00:00.000Z",
              endTime: "2026-01-01T01:00:00.000Z",
              status: "ACTIVE"
            }
          ]),
          { status: 200 }
        )
    }),
    /zoneBookings\[0\]\.status API response is invalid/
  );
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

test("zone content renders list, detail, and current bookings", () => {
  const markup = renderToStaticMarkup(
    createElement(ZoneContent, {
      state: {
        status: "ready",
        zones: [
          {
            id: "zone-1",
            name: "Training Bay",
            type: "LAB",
            status: "ACTIVE",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
          }
        ],
        zoneBookings: [
          {
            id: "zone-booking-1",
            zoneId: "zone-1",
            startTime: "2026-01-01T00:00:00.000Z",
            endTime: "2999-01-01T00:00:00.000Z",
            status: "RESERVED"
          },
          {
            id: "zone-booking-2",
            zoneId: "zone-1",
            startTime: "2026-01-01T00:00:00.000Z",
            endTime: "2999-01-01T00:00:00.000Z",
            status: "CANCELLED"
          }
        ],
        selectedZoneId: "zone-1",
        error: null
      },
      onSelectZone: () => undefined
    })
  );

  assert.match(markup, /Zone列表/);
  assert.match(markup, /Zone详情/);
  assert.match(markup, /当前预约/);
  assert.match(markup, /Training Bay/);
  assert.match(markup, /zone-booking-1/);
  assert.doesNotMatch(markup, /zone-booking-2/);
});

test("zone content renders loading and error states", () => {
  const loadingMarkup = renderToStaticMarkup(
    createElement(ZoneContent, {
      state: {
        status: "loading",
        zones: [],
        zoneBookings: [],
        selectedZoneId: null,
        error: null
      },
      onSelectZone: () => undefined
    })
  );
  const errorMarkup = renderToStaticMarkup(
    createElement(ZoneContent, {
      state: {
        status: "error",
        zones: [],
        zoneBookings: [],
        selectedZoneId: null,
        error: "Zone API request failed: 500"
      },
      onSelectZone: () => undefined
    })
  );

  assert.match(loadingMarkup, /Loading zone data/);
  assert.match(errorMarkup, /Zone API request failed: 500/);
});

test("device content renders list, status, and zone details", () => {
  const markup = renderToStaticMarkup(
    createElement(DeviceContent, {
      state: {
        status: "ready",
        devices: [
          {
            id: "device-1",
            name: "Arm Station",
            type: "ROBOT_ARM",
            homeZoneId: "zone-1",
            currentZoneId: "zone-2",
            status: "IN_USE",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
          }
        ],
        zones: [
          {
            id: "zone-1",
            name: "Home Bay",
            type: "LAB",
            status: "ACTIVE",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
          },
          {
            id: "zone-2",
            name: "Training Bay",
            type: "LAB",
            status: "ACTIVE",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
          }
        ],
        selectedDeviceId: "device-1",
        error: null
      },
      onSelectDevice: () => undefined
    })
  );

  assert.match(markup, /Device列表/);
  assert.match(markup, /Device详情/);
  assert.match(markup, /Arm Station/);
  assert.match(markup, /IN USE/);
  assert.match(markup, /Training Bay \(zone-2\)/);
  assert.match(markup, /Home Bay \(zone-1\)/);
});

test("device content renders loading and error states", () => {
  const loadingMarkup = renderToStaticMarkup(
    createElement(DeviceContent, {
      state: {
        status: "loading",
        devices: [],
        zones: [],
        selectedDeviceId: null,
        error: null
      },
      onSelectDevice: () => undefined
    })
  );
  const errorMarkup = renderToStaticMarkup(
    createElement(DeviceContent, {
      state: {
        status: "error",
        devices: [],
        zones: [],
        selectedDeviceId: null,
        error: "Device API request failed: 500"
      },
      onSelectDevice: () => undefined
    })
  );

  assert.match(loadingMarkup, /Loading device data/);
  assert.match(errorMarkup, /Device API request failed: 500/);
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
