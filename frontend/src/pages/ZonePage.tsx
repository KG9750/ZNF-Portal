import { useEffect, useMemo, useState } from "react";

import { getZoneBookings, getZones, type Zone, type ZoneBooking } from "../services/zones.js";

type ZonePageState =
  | { status: "loading"; zones: []; zoneBookings: []; selectedZoneId: null; error: null }
  | { status: "ready"; zones: Zone[]; zoneBookings: ZoneBooking[]; selectedZoneId: string | null; error: null }
  | { status: "error"; zones: []; zoneBookings: []; selectedZoneId: null; error: string };

export function ZonePage() {
  const [state, setState] = useState<ZonePageState>({
    status: "loading",
    zones: [],
    zoneBookings: [],
    selectedZoneId: null,
    error: null
  });

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([getZones({ signal: controller.signal }), getZoneBookings({ signal: controller.signal })])
      .then(([zones, zoneBookings]) => {
        if (!controller.signal.aborted) {
          setState({
            status: "ready",
            zones,
            zoneBookings,
            selectedZoneId: zones[0]?.id ?? null,
            error: null
          });
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            zones: [],
            zoneBookings: [],
            selectedZoneId: null,
            error: error instanceof Error ? error.message : "Zone API request failed"
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  return <ZoneContent state={state} onSelectZone={zoneId => setSelectedZone(state, setState, zoneId)} />;
}

export function ZoneContent({
  state,
  onSelectZone
}: {
  state: ZonePageState;
  onSelectZone: (zoneId: string) => void;
}) {
  const selectedZone = state.zones.find(zone => zone.id === state.selectedZoneId) ?? null;
  const currentBookings = useMemo(
    () => getCurrentZoneBookings(state.zoneBookings, state.selectedZoneId, new Date()),
    [state.selectedZoneId, state.zoneBookings]
  );

  return (
    <section className="page zone-page">
      <header className="page-header dashboard-header">
        <div>
          <p className="eyebrow">Resources</p>
          <h1>Zones</h1>
        </div>
        <div className={`data-state data-state-${state.status}`}>{getStateLabel(state.status)}</div>
      </header>

      {state.status === "error" ? (
        <div className="notice error-notice">{state.error}</div>
      ) : null}

      {state.status === "loading" ? (
        <div className="notice">Loading zone data...</div>
      ) : null}

      {state.status === "ready" ? (
        <div className="zone-layout">
          <section className="panel zone-list-panel" aria-labelledby="zone-list-title">
            <div className="panel-header">
              <h2 id="zone-list-title">Zone列表</h2>
              <span className="panel-count">{state.zones.length}</span>
            </div>
            <ZoneList zones={state.zones} selectedZoneId={state.selectedZoneId} onSelectZone={onSelectZone} />
          </section>

          <section className="panel" aria-labelledby="zone-detail-title">
            <div className="panel-header">
              <h2 id="zone-detail-title">Zone详情</h2>
              {selectedZone ? <StatusBadge status={selectedZone.status} /> : null}
            </div>
            <ZoneDetail zone={selectedZone} />
          </section>

          <section className="panel" aria-labelledby="zone-bookings-title">
            <div className="panel-header">
              <h2 id="zone-bookings-title">当前预约</h2>
              <span className="panel-count">{currentBookings.length}</span>
            </div>
            <CurrentBookingList bookings={currentBookings} />
          </section>
        </div>
      ) : null}
    </section>
  );
}

function ZoneList({
  zones,
  selectedZoneId,
  onSelectZone
}: {
  zones: Zone[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
}) {
  if (zones.length === 0) {
    return <p className="empty-state">No zones</p>;
  }

  return (
    <ul className="zone-list">
      {zones.map(zone => (
        <li key={zone.id}>
          <button
            className={zone.id === selectedZoneId ? "zone-list-button selected" : "zone-list-button"}
            type="button"
            onClick={() => onSelectZone(zone.id)}
          >
            <span>
              <strong>{zone.name}</strong>
              <small>{zone.type}</small>
            </span>
            <StatusBadge status={zone.status} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function ZoneDetail({ zone }: { zone: Zone | null }) {
  if (zone === null) {
    return <p className="empty-state">No zone selected</p>;
  }

  return (
    <dl className="detail-list">
      <div>
        <dt>ID</dt>
        <dd>{zone.id}</dd>
      </div>
      <div>
        <dt>Name</dt>
        <dd>{zone.name}</dd>
      </div>
      <div>
        <dt>Type</dt>
        <dd>{zone.type}</dd>
      </div>
      <div>
        <dt>Updated</dt>
        <dd>{formatDateTime(zone.updatedAt)}</dd>
      </div>
    </dl>
  );
}

function CurrentBookingList({ bookings }: { bookings: ZoneBooking[] }) {
  if (bookings.length === 0) {
    return <p className="empty-state">No current bookings</p>;
  }

  return (
    <ul className="data-list">
      {bookings.map(booking => (
        <li key={booking.id}>
          <div className="row-with-badge">
            <strong>{booking.id}</strong>
            <StatusBadge status={booking.status} />
          </div>
          <span>{formatTimeRange(booking.startTime, booking.endTime)}</span>
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{status.replaceAll("_", " ")}</span>;
}

function getCurrentZoneBookings(bookings: ZoneBooking[], selectedZoneId: string | null, now: Date): ZoneBooking[] {
  if (selectedZoneId === null) {
    return [];
  }

  return bookings.filter(booking => {
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);

    return (
      booking.zoneId === selectedZoneId &&
      booking.status === "RESERVED" &&
      startTime.getTime() <= now.getTime() &&
      endTime.getTime() > now.getTime()
    );
  });
}

function setSelectedZone(
  state: ZonePageState,
  setState: (state: ZonePageState) => void,
  selectedZoneId: string
): void {
  if (state.status !== "ready") {
    return;
  }

  setState({
    ...state,
    selectedZoneId
  });
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatDateTime(startTime)} - ${formatDateTime(endTime)}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getStateLabel(status: ZonePageState["status"]): string {
  if (status === "loading") {
    return "Loading";
  }

  if (status === "error") {
    return "Error";
  }

  return "Live";
}