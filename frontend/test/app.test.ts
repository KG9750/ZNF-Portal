import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { APP_TITLE, navigationItems } from "../src/app.js";
import { StatusBadge } from "../src/components/StatusBadge.js";
import { Table } from "../src/components/Table.js";
import { Timeline } from "../src/components/Timeline.js";
import { BookingContent } from "../src/pages/BookingPage.js";
import { DashboardContent } from "../src/pages/DashboardPage.js";
import { DeviceContent } from "../src/pages/DevicePage.js";
import { ZoneContent } from "../src/pages/ZonePage.js";
import { createApiUrl, requestJson } from "../src/services/api.js";
import {
  cancelVisitBooking,
  cancelZoneBooking,
  createDeviceBooking,
  createVisitBooking,
  createZoneBooking,
  getDeviceBookings,
  getZoneBookings as getBookingZoneBookings,
  getVisitBookings
} from "../src/services/bookings.js";
import { getDevices } from "../src/services/devices.js";
import { getDashboardOverview, type DashboardOverview } from "../src/services/dashboard.js";
import { getZoneBookings, getZones } from "../src/services/zones.js";

test("frontend scaffold exposes React app metadata", () => {
  assert.equal(APP_TITLE, "ZNF-Portal");
  assert.deepEqual(
    navigationItems.map(item => item.path),
    ["/", "/zones", "/devices", "/bookings"]
  );
  assert.deepEqual(
    navigationItems.map(item => item.label),
    ["Dashboard", "Zones", "Devices", "Bookings"]
  );
});

test("frontend service layer builds backend API URLs", () => {
  assert.equal(createApiUrl("/health"), "/health");
  assert.equal(createApiUrl("/health", "https://api.example.test"), "https://api.example.test/health");
});

test("shared UI components render badges, timelines, and tables", () => {
  interface TimelineRow {
    id: string;
    label: string;
  }

  interface TableRow {
    label: string;
    value: string;
  }

  const badgeMarkup = renderToStaticMarkup(createElement(StatusBadge, { status: "IN_PROGRESS" }));
  const timelineMarkup = renderToStaticMarkup(
    createElement(Timeline<TimelineRow>, {
      emptyLabel: "No events",
      items: [{ id: "event-1", label: "Booked" }],
      renderItem: item => createElement("strong", null, item.label)
    })
  );
  const emptyTimelineMarkup = renderToStaticMarkup(
    createElement(Timeline<TimelineRow>, {
      emptyLabel: "No events",
      items: [],
      renderItem: () => null
    })
  );
  const customTimelineMarkup = renderToStaticMarkup(
    createElement(Timeline<TimelineRow>, {
      className: "data-list",
      emptyLabel: "No events",
      items: [{ id: "event-2", label: "Checked in" }],
      renderItem: item => createElement("span", null, item.label)
    })
  );
  const tableMarkup = renderToStaticMarkup(
    createElement(Table<TableRow>, {
      columns: [
        { header: "Field", key: "field", render: row => row.label },
        { header: "Value", key: "value", render: row => row.value }
      ],
      emptyLabel: "No rows",
      rows: [{ label: "Status", value: "ACTIVE" }],
      rowKey: row => row.label
    })
  );

  assert.match(badgeMarkup, /IN PROGRESS/);
  assert.match(badgeMarkup, /status-in_progress/);
  assert.match(timelineMarkup, /Booked/);
  assert.match(emptyTimelineMarkup, /No events/);
  assert.match(customTimelineMarkup, /class="data-list"/);
  assert.match(tableMarkup, /Status/);
  assert.match(tableMarkup, /ACTIVE/);
});

test("API client sends JSON bodies and normalizes error responses", async () => {
  const requests: Array<{ body?: string; contentType: string | null; method: string; path: string }> = [];
  const getResult = await requestJson("/example", "Example API request failed", {
    apiFetch: async (input, init) => {
      requests.push({
        body: typeof init?.body === "string" ? init.body : undefined,
        contentType: readContentType(init?.headers),
        method: init?.method ?? "GET",
        path: input.toString()
      });

      return jsonResponse({ items: [] });
    }
  });
  const result = await requestJson("/example", "Example API request failed", {
    apiFetch: async (input, init) => {
      requests.push({
        body: typeof init?.body === "string" ? init.body : undefined,
        contentType: readContentType(init?.headers),
        method: init?.method ?? "GET",
        path: input.toString()
      });

      return jsonResponse({ ok: true });
    },
    body: { name: "Training Bay" },
    method: "POST"
  });

  await assert.rejects(
    requestJson("/example", "Example API request failed", {
      apiFetch: async () => jsonResponse({ message: "Nope" }, 418)
    }),
    /Example API request failed: 418 - Nope/
  );

  await assert.rejects(
    requestJson("/example", "Example API request failed", {
      apiFetch: async () => jsonResponse({ error: "No access" }, 403)
    }),
    /Example API request failed: 403 - No access/
  );

  await assert.rejects(
    requestJson("/example", "Example API request failed", {
      apiFetch: async () => new Response("Nope", { status: 502 })
    }),
    /Example API request failed: 502/
  );

  assert.deepEqual(getResult, { items: [] });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(requests, [
    {
      body: undefined,
      contentType: null,
      method: "GET",
      path: "/example"
    },
    {
      body: "{\"name\":\"Training Bay\"}",
      contentType: "application/json",
      method: "POST",
      path: "/example"
    }
  ]);
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

test("booking services fetch, create, and cancel bookings", async () => {
  const requests: Array<{ body?: string; method: string; path: string }> = [];
  const apiFetch: typeof fetch = async (input, init) => {
    const path = input.toString();
    const method = init?.method ?? "GET";
    requests.push({
      body: typeof init?.body === "string" ? init.body : undefined,
      method,
      path
    });

    if (path === "/zone-bookings" && method === "GET") {
      return jsonResponse([
        {
          id: "zone-booking-1",
          zoneId: "zone-1",
          startTime: "2026-01-01T00:00:00.000Z",
          endTime: "2026-01-01T01:00:00.000Z",
          status: "RESERVED"
        }
      ]);
    }

    if (path === "/device-bookings" && method === "GET") {
      return jsonResponse([
        {
          id: "device-booking-1",
          deviceId: "device-1",
          zoneId: "zone-1",
          startTime: "2026-01-01T00:00:00.000Z",
          endTime: "2026-01-01T01:00:00.000Z",
          status: "RESERVED"
        }
      ]);
    }

    if (path === "/visit-bookings" && method === "GET") {
      return jsonResponse([
        {
          id: "visit-booking-1",
          startTime: "2026-01-01T00:00:00.000Z",
          endTime: "2026-01-01T01:00:00.000Z",
          visitorOrg: "Acme Labs",
          visitorCount: 3,
          needDemo: true,
          status: "RESERVED"
        }
      ]);
    }

    if (path === "/zone-bookings/zone-booking-1/cancel") {
      return jsonResponse({
        id: "zone-booking-1",
        zoneId: "zone-1",
        startTime: "2026-01-01T00:00:00.000Z",
        endTime: "2026-01-01T01:00:00.000Z",
        status: "CANCELLED"
      });
    }

    if (path === "/visit-bookings/visit-booking-1/cancel") {
      return jsonResponse({
        id: "visit-booking-1",
        startTime: "2026-01-01T00:00:00.000Z",
        endTime: "2026-01-01T01:00:00.000Z",
        visitorOrg: "Acme Labs",
        visitorCount: 3,
        needDemo: true,
        status: "CANCELLED"
      });
    }

    if (path === "/device-bookings" && method === "POST") {
      return jsonResponse({
        id: "device-booking-2",
        deviceId: "device-1",
        zoneId: "zone-1",
        startTime: "2026-01-01T02:00:00.000Z",
        endTime: "2026-01-01T03:00:00.000Z",
        status: "RESERVED"
      }, 201);
    }

    if (path === "/visit-bookings" && method === "POST") {
      return jsonResponse({
        id: "visit-booking-2",
        startTime: "2026-01-01T02:00:00.000Z",
        endTime: "2026-01-01T03:00:00.000Z",
        visitorOrg: "Acme Labs",
        visitorCount: 3,
        needDemo: false,
        status: "RESERVED"
      }, 201);
    }

    return jsonResponse({
      id: "zone-booking-2",
      zoneId: "zone-1",
      startTime: "2026-01-01T02:00:00.000Z",
      endTime: "2026-01-01T03:00:00.000Z",
      status: "RESERVED"
    }, 201);
  };

  const zoneBookings = await getBookingZoneBookings({ apiFetch });
  const deviceBookings = await getDeviceBookings({ apiFetch });
  const visitBookings = await getVisitBookings({ apiFetch });
  await createZoneBooking({ zoneId: "zone-1", startTime: "2026-01-01T02:00", endTime: "2026-01-01T03:00" }, { apiFetch });
  await createDeviceBooking(
    { deviceId: "device-1", zoneId: "zone-1", startTime: "2026-01-01T02:00", endTime: "2026-01-01T03:00" },
    { apiFetch }
  );
  await createVisitBooking(
    { startTime: "2026-01-01T02:00", endTime: "2026-01-01T03:00", visitorOrg: "Acme Labs", visitorCount: 3, needDemo: false },
    { apiFetch }
  );
  await cancelZoneBooking("zone-booking-1", { apiFetch });
  await cancelVisitBooking("visit-booking-1", { apiFetch });

  assert.equal(zoneBookings[0]?.zoneId, "zone-1");
  assert.equal(deviceBookings[0]?.deviceId, "device-1");
  assert.equal(visitBookings[0]?.visitorOrg, "Acme Labs");
  assert.deepEqual(
    requests.map(request => `${request.method} ${request.path}`),
    [
      "GET /zone-bookings",
      "GET /device-bookings",
      "GET /visit-bookings",
      "POST /zone-bookings",
      "POST /device-bookings",
      "POST /visit-bookings",
      "PATCH /zone-bookings/zone-booking-1/cancel",
      "PATCH /visit-bookings/visit-booking-1/cancel"
    ]
  );
  assert.deepEqual(JSON.parse(requests[3]?.body ?? "{}"), {
    zoneId: "zone-1",
    startTime: "2025-12-31T18:00:00.000Z",
    endTime: "2025-12-31T19:00:00.000Z"
  });
  assert.deepEqual(JSON.parse(requests[4]?.body ?? "{}"), {
    deviceId: "device-1",
    zoneId: "zone-1",
    startTime: "2025-12-31T18:00:00.000Z",
    endTime: "2025-12-31T19:00:00.000Z"
  });
  assert.deepEqual(JSON.parse(requests[5]?.body ?? "{}"), {
    startTime: "2025-12-31T18:00:00.000Z",
    endTime: "2025-12-31T19:00:00.000Z",
    visitorOrg: "Acme Labs",
    visitorCount: 3,
    needDemo: false
  });
});

test("booking create services preserve explicit timezone inputs", async () => {
  let requestBody: string | undefined;
  const apiFetch: typeof fetch = async (_url, init) => {
    requestBody = String(init?.body);

    return jsonResponse({
      id: "zone-booking-1",
      zoneId: "zone-1",
      startTime: "2026-01-01T07:30:00.000Z",
      endTime: "2026-01-01T08:30:00.000Z",
      status: "RESERVED"
    }, 201);
  };

  await createZoneBooking(
    { zoneId: "zone-1", startTime: "2026-01-01T13:00:00+05:30", endTime: "2026-01-01T08:30:00.000Z" },
    { apiFetch }
  );

  assert.deepEqual(JSON.parse(requestBody ?? "{}"), {
    zoneId: "zone-1",
    startTime: "2026-01-01T07:30:00.000Z",
    endTime: "2026-01-01T08:30:00.000Z"
  });
});

test("booking create services reject malformed time inputs before request", async () => {
  let requestCount = 0;
  const apiFetch: typeof fetch = async () => {
    requestCount += 1;
    return jsonResponse({}, 201);
  };

  await assert.rejects(
    () => createZoneBooking({ zoneId: "zone-1", startTime: "not-a-date", endTime: "2026-01-01T03:00" }, { apiFetch }),
    /booking time must be datetime-local or include a timezone offset/
  );
  await assert.rejects(
    () => createZoneBooking({ zoneId: "zone-1", startTime: "2026-02-31T10:00", endTime: "2026-02-31T11:00" }, { apiFetch }),
    /booking time must be a valid ISO date-time/
  );
  assert.equal(requestCount, 0);
});

test("booking services report failed requests", async () => {
  await assert.rejects(
    createZoneBooking(
      { zoneId: "zone-1", startTime: "2026-01-01T02:00", endTime: "2026-01-01T03:00" },
      { apiFetch: async () => jsonResponse({ error: "booking conflict" }, 409) }
    ),
    /ZoneBooking API request failed: 409 - booking conflict/
  );

  await assert.rejects(
    getVisitBookings({ apiFetch: async () => new Response("Unavailable", { status: 503 }) }),
    /VisitBooking API request failed: 503/
  );
});

test("booking services reject malformed responses", async () => {
  await assert.rejects(
    getBookingZoneBookings({ apiFetch: async () => jsonResponse([{ id: 123 }]) }),
    /zoneBookings\[0\]\.id API response is invalid/
  );

  await assert.rejects(
    createZoneBooking(
      { zoneId: "zone-1", startTime: "2026-01-01T02:00", endTime: "2026-01-01T03:00" },
      {
        apiFetch: async () =>
          jsonResponse({
            id: "zone-booking-1",
            zoneId: "zone-1",
            startTime: "2026-01-01T02:00:00.000Z",
            endTime: "2026-01-01T03:00:00.000Z",
            status: "ACTIVE"
          }, 201)
      }
    ),
    /zoneBooking\.status API response is invalid/
  );

  await assert.rejects(
    getDeviceBookings({
      apiFetch: async () =>
        jsonResponse([
          {
            id: "device-booking-1",
            deviceId: "device-1",
            zoneId: "zone-1",
            startTime: "2026-01-01T02:00:00.000Z",
            endTime: "2026-01-01T03:00:00.000Z",
            status: "ACTIVE"
          }
        ])
    }),
    /deviceBookings\[0\]\.status API response is invalid/
  );

  await assert.rejects(
    createDeviceBooking(
      { deviceId: "device-1", zoneId: "zone-1", startTime: "2026-01-01T02:00", endTime: "2026-01-01T03:00" },
      {
        apiFetch: async () =>
          jsonResponse({
            id: "device-booking-1",
            deviceId: 123,
            zoneId: "zone-1",
            startTime: "2026-01-01T02:00:00.000Z",
            endTime: "2026-01-01T03:00:00.000Z",
            status: "RESERVED"
          }, 201)
      }
    ),
    /deviceBooking\.deviceId API response is invalid/
  );

  await assert.rejects(
    getVisitBookings({
      apiFetch: async () =>
        jsonResponse([
          {
            id: "visit-booking-1",
            startTime: "2026-01-01T02:00:00.000Z",
            endTime: "2026-01-01T03:00:00.000Z",
            visitorOrg: "Acme Labs",
            visitorCount: "3",
            needDemo: true,
            status: "RESERVED"
          }
        ])
    }),
    /visitBookings\[0\]\.visitorCount API response is invalid/
  );

  await assert.rejects(
    createVisitBooking(
      { startTime: "2026-01-01T02:00", endTime: "2026-01-01T03:00", visitorOrg: "Acme Labs", visitorCount: 3, needDemo: false },
      {
        apiFetch: async () =>
          jsonResponse({
            id: "visit-booking-1",
            startTime: "2026-01-01T02:00:00.000Z",
            endTime: "2026-01-01T03:00:00.000Z",
            visitorOrg: "Acme Labs",
            visitorCount: 3,
            needDemo: "false",
            status: "RESERVED"
          }, 201)
      }
    ),
    /visitBooking\.needDemo API response is invalid/
  );

  await assert.rejects(
    cancelZoneBooking("zone-booking-1", { apiFetch: async () => jsonResponse({ id: "zone-booking-1" }) }),
    /zoneBooking\.zoneId API response is invalid/
  );

  await assert.rejects(
    cancelVisitBooking("visit-booking-1", { apiFetch: async () => jsonResponse({ id: "visit-booking-1" }) }),
    /visitBooking\.startTime API response is invalid/
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

test("booking content renders create forms and timeline data", () => {
  const markup = renderToStaticMarkup(
    createElement(BookingContent, {
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
        devices: [
          {
            id: "device-1",
            name: "Arm Station",
            type: "ROBOT_ARM",
            homeZoneId: "zone-1",
            currentZoneId: "zone-1",
            status: "AVAILABLE",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
          }
        ],
        zoneBookings: [
          {
            id: "zone-booking-1",
            zoneId: "zone-1",
            startTime: "2026-01-01T02:00:00.000Z",
            endTime: "2026-01-01T03:00:00.000Z",
            status: "RESERVED"
          }
        ],
        deviceBookings: [
          {
            id: "device-booking-1",
            deviceId: "device-1",
            zoneId: "zone-1",
            startTime: "2026-01-01T03:00:00.000Z",
            endTime: "2026-01-01T04:00:00.000Z",
            status: "RESERVED"
          }
        ],
        visitBookings: [
          {
            id: "visit-booking-1",
            startTime: "2026-01-01T04:00:00.000Z",
            endTime: "2026-01-01T05:00:00.000Z",
            visitorOrg: "Acme Labs",
            visitorCount: 5,
            needDemo: true,
            status: "CANCELLED"
          }
        ],
        error: null,
        message: "Zone booking created"
      },
      onCancelVisit: () => undefined,
      onCancelZone: () => undefined,
      onCreateDevice: event => event.preventDefault(),
      onCreateVisit: event => event.preventDefault(),
      onCreateZone: event => event.preventDefault()
    })
  );

  assert.match(markup, /ZoneBooking/);
  assert.match(markup, /DeviceBooking/);
  assert.match(markup, /VisitBooking/);
  assert.match(markup, /Training Bay \(zone-1\)/);
  assert.match(markup, /Arm Station \(device-1\)/);
  assert.match(markup, /Acme Labs/);
  assert.match(markup, /Cancel API unavailable/);
  assert.match(markup, /Zone booking created/);
});

test("booking content renders loading and error states", () => {
  const loadingMarkup = renderToStaticMarkup(
    createElement(BookingContent, {
      state: {
        status: "loading",
        zones: [],
        devices: [],
        zoneBookings: [],
        deviceBookings: [],
        visitBookings: [],
        error: null,
        message: null
      },
      onCancelVisit: () => undefined,
      onCancelZone: () => undefined,
      onCreateDevice: event => event.preventDefault(),
      onCreateVisit: event => event.preventDefault(),
      onCreateZone: event => event.preventDefault()
    })
  );
  const errorMarkup = renderToStaticMarkup(
    createElement(BookingContent, {
      state: {
        status: "error",
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
        devices: [],
        zoneBookings: [
          {
            id: "zone-booking-1",
            zoneId: "zone-1",
            startTime: "2026-01-01T02:00:00.000Z",
            endTime: "2026-01-01T03:00:00.000Z",
            status: "RESERVED"
          }
        ],
        deviceBookings: [],
        visitBookings: [],
        error: "Booking API request failed",
        message: null
      },
      onCancelVisit: () => undefined,
      onCancelZone: () => undefined,
      onCreateDevice: event => event.preventDefault(),
      onCreateVisit: event => event.preventDefault(),
      onCreateZone: event => event.preventDefault()
    })
  );

  assert.match(loadingMarkup, /Loading booking data/);
  assert.match(errorMarkup, /Booking API request failed/);
  assert.match(errorMarkup, /Training Bay \(zone-1\)/);
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json"
    },
    status
  });
}

function readContentType(headers: HeadersInit | undefined): string | null {
  if (headers instanceof Headers) {
    return headers.get("content-type");
  }

  if (Array.isArray(headers)) {
    return new Headers(headers).get("content-type");
  }

  return headers?.["Content-Type"] ?? headers?.["content-type"] ?? null;
}
