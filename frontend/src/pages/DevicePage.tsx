import { useEffect, useMemo, useState } from "react";

import { getDevices, type Device } from "../services/devices.js";
import { getZones, type Zone } from "../services/zones.js";

type DevicePageState =
  | { status: "loading"; devices: []; zones: []; selectedDeviceId: null; error: null }
  | { status: "ready"; devices: Device[]; zones: Zone[]; selectedDeviceId: string | null; error: null }
  | { status: "error"; devices: []; zones: []; selectedDeviceId: null; error: string };

export function DevicePage() {
  const [state, setState] = useState<DevicePageState>({
    status: "loading",
    devices: [],
    zones: [],
    selectedDeviceId: null,
    error: null
  });

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([getDevices({ signal: controller.signal }), getZones({ signal: controller.signal })])
      .then(([devices, zones]) => {
        if (!controller.signal.aborted) {
          setState({
            status: "ready",
            devices,
            zones,
            selectedDeviceId: devices[0]?.id ?? null,
            error: null
          });
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            devices: [],
            zones: [],
            selectedDeviceId: null,
            error: error instanceof Error ? error.message : "Device API request failed"
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  return <DeviceContent state={state} onSelectDevice={deviceId => setSelectedDevice(setState, deviceId)} />;
}

export function DeviceContent({
  state,
  onSelectDevice
}: {
  state: DevicePageState;
  onSelectDevice: (deviceId: string) => void;
}) {
  const zoneById = useMemo(() => new Map(state.zones.map(zone => [zone.id, zone])), [state.zones]);
  const selectedDevice = state.devices.find(device => device.id === state.selectedDeviceId) ?? null;

  return (
    <section className="page device-page">
      <header className="page-header dashboard-header">
        <div>
          <p className="eyebrow">Resources</p>
          <h1>Devices</h1>
        </div>
        <div className={`data-state data-state-${state.status}`}>{getStateLabel(state.status)}</div>
      </header>

      {state.status === "error" ? (
        <div className="notice error-notice">{state.error}</div>
      ) : null}

      {state.status === "loading" ? (
        <div className="notice">Loading device data...</div>
      ) : null}

      {state.status === "ready" ? (
        <div className="device-layout">
          <section className="panel device-list-panel" aria-labelledby="device-list-title">
            <div className="panel-header">
              <h2 id="device-list-title">Device列表</h2>
              <span className="panel-count">{state.devices.length}</span>
            </div>
            <DeviceList
              devices={state.devices}
              selectedDeviceId={state.selectedDeviceId}
              zoneById={zoneById}
              onSelectDevice={onSelectDevice}
            />
          </section>

          <section className="panel" aria-labelledby="device-detail-title">
            <div className="panel-header">
              <h2 id="device-detail-title">Device详情</h2>
              {selectedDevice ? <StatusBadge status={selectedDevice.status} /> : null}
            </div>
            <DeviceDetail device={selectedDevice} zoneById={zoneById} />
          </section>
        </div>
      ) : null}
    </section>
  );
}

function DeviceList({
  devices,
  selectedDeviceId,
  zoneById,
  onSelectDevice
}: {
  devices: Device[];
  selectedDeviceId: string | null;
  zoneById: Map<string, Zone>;
  onSelectDevice: (deviceId: string) => void;
}) {
  if (devices.length === 0) {
    return <p className="empty-state">No devices</p>;
  }

  return (
    <ul className="zone-list">
      {devices.map(device => (
        <li key={device.id}>
          <button
            className={device.id === selectedDeviceId ? "zone-list-button selected" : "zone-list-button"}
            type="button"
            onClick={() => onSelectDevice(device.id)}
          >
            <span>
              <strong>{device.name}</strong>
              <small>{formatZoneLabel(device.currentZoneId, zoneById)}</small>
            </span>
            <StatusBadge status={device.status} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function DeviceDetail({ device, zoneById }: { device: Device | null; zoneById: Map<string, Zone> }) {
  if (device === null) {
    return <p className="empty-state">No device selected</p>;
  }

  return (
    <dl className="detail-list">
      <div>
        <dt>ID</dt>
        <dd>{device.id}</dd>
      </div>
      <div>
        <dt>Name</dt>
        <dd>{device.name}</dd>
      </div>
      <div>
        <dt>Type</dt>
        <dd>{device.type}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>{device.status.replaceAll("_", " ")}</dd>
      </div>
      <div>
        <dt>Current Zone</dt>
        <dd>{formatZoneLabel(device.currentZoneId, zoneById)}</dd>
      </div>
      <div>
        <dt>Home Zone</dt>
        <dd>{formatZoneLabel(device.homeZoneId, zoneById)}</dd>
      </div>
      <div>
        <dt>Updated</dt>
        <dd>{formatDateTime(device.updatedAt)}</dd>
      </div>
    </dl>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{status.replaceAll("_", " ")}</span>;
}

function setSelectedDevice(
  setState: (update: (state: DevicePageState) => DevicePageState) => void,
  selectedDeviceId: string
): void {
  setState(state => {
    if (state.status !== "ready") {
      return state;
    }

    return {
      ...state,
      selectedDeviceId
    };
  });
}

function formatZoneLabel(zoneId: string, zoneById: Map<string, Zone>): string {
  const zone = zoneById.get(zoneId);

  if (!zone) {
    return zoneId;
  }

  return `${zone.name} (${zone.id})`;
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

function getStateLabel(status: DevicePageState["status"]): string {
  if (status === "loading") {
    return "Loading";
  }

  if (status === "error") {
    return "Error";
  }

  return "Live";
}
