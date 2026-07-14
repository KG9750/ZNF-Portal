import { type Dispatch, type FormEvent, useEffect, useMemo, useState, type ReactNode, type SetStateAction } from "react";

import { StatusBadge } from "../components/StatusBadge.js";
import { Timeline } from "../components/Timeline.js";
import {
  cancelVisitBooking,
  cancelZoneBooking,
  createDeviceBooking,
  createVisitBooking,
  createZoneBooking,
  getDeviceBookings,
  getVisitBookings,
  getZoneBookings,
  type DeviceBooking,
  type VisitBooking,
  type ZoneBooking
} from "../services/bookings.js";
import { getDevices, type Device } from "../services/devices.js";
import { getZones, type Zone } from "../services/zones.js";

type BookingPageState =
  | {
      status: "loading";
      zones: [];
      devices: [];
      zoneBookings: [];
      deviceBookings: [];
      visitBookings: [];
      error: null;
      message: null;
    }
  | {
      status: "ready";
      zones: Zone[];
      devices: Device[];
      zoneBookings: ZoneBooking[];
      deviceBookings: DeviceBooking[];
      visitBookings: VisitBooking[];
      error: null;
      message: string | null;
    }
  | {
      status: "error";
      zones: Zone[];
      devices: Device[];
      zoneBookings: ZoneBooking[];
      deviceBookings: DeviceBooking[];
      visitBookings: VisitBooking[];
      error: string;
      message: null;
    };

interface BookingSnapshot {
  zones: Zone[];
  devices: Device[];
  zoneBookings: ZoneBooking[];
  deviceBookings: DeviceBooking[];
  visitBookings: VisitBooking[];
}

export function BookingPage() {
  const [state, setState] = useState<BookingPageState>(createLoadingState());

  useEffect(() => {
    const controller = new AbortController();

    loadBookingSnapshot(controller.signal)
      .then(snapshot => {
        if (!controller.signal.aborted) {
          setState({
            status: "ready",
            ...snapshot,
            error: null,
            message: null
          });
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setState(createErrorState(error instanceof Error ? error.message : "预约调度请求失败"));
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <BookingContent
      state={state}
      onCancelVisit={id => handleMutation(setState, () => cancelVisitBooking(id), "参观预约已取消")}
      onCancelZone={id => handleMutation(setState, () => cancelZoneBooking(id), "空间预约已取消")}
      onCreateDevice={event => handleCreateDeviceBooking(event, setState)}
      onCreateVisit={event => handleCreateVisitBooking(event, setState)}
      onCreateZone={event => handleCreateZoneBooking(event, setState)}
    />
  );
}

export function BookingContent({
  state,
  onCancelVisit,
  onCancelZone,
  onCreateDevice,
  onCreateVisit,
  onCreateZone
}: {
  state: BookingPageState;
  onCancelVisit: (id: string) => void;
  onCancelZone: (id: string) => void;
  onCreateDevice: (event: FormEvent<HTMLFormElement>) => void;
  onCreateVisit: (event: FormEvent<HTMLFormElement>) => void;
  onCreateZone: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const zoneById = useMemo(() => new Map(state.zones.map(zone => [zone.id, zone])), [state.zones]);
  const deviceById = useMemo(() => new Map(state.devices.map(device => [device.id, device])), [state.devices]);

  return (
    <section className="page booking-page">
      <header className="page-header dashboard-header">
        <div>
          <p className="eyebrow">调度控制台</p>
          <h1>预约调度</h1>
          <p className="page-summary">创建空间、设备与参观预约，所有时间按场馆 UTC+08 提交。</p>
        </div>
        <div className={`data-state data-state-${state.status}`}>{getStateLabel(state.status)}</div>
      </header>

      {state.status === "error" ? <div className="notice error-notice">{state.error}</div> : null}
      {state.status === "loading" ? <div className="notice">正在加载预约数据...</div> : null}

      {canRenderBookingData(state) ? (
        <>
          {state.status === "ready" && state.message ? <div className="notice success-notice">{state.message}</div> : null}
          <div className="booking-management-grid">
            <BookingPanel count={state.zoneBookings.length} title="空间预约">
              <ZoneBookingForm onSubmit={onCreateZone} zones={state.zones} />
              <Timeline
                emptyLabel="暂无空间预约"
                items={sortByStartTime(state.zoneBookings)}
                renderItem={booking => (
                  <>
                    <div className="row-with-badge">
                      <strong>{formatZoneLabel(booking.zoneId, zoneById)}</strong>
                      <StatusBadge status={booking.status} />
                    </div>
                    <span>{formatTimeRange(booking.startTime, booking.endTime)}</span>
                    <BookingActions
                      canCancel={booking.status === "RESERVED"}
                      disabledLabel="已取消"
                      onCancel={() => onCancelZone(booking.id)}
                    />
                  </>
                )}
              />
            </BookingPanel>

            <BookingPanel count={state.deviceBookings.length} title="设备预约">
              <DeviceBookingForm devices={state.devices} onSubmit={onCreateDevice} zones={state.zones} />
              <Timeline
                emptyLabel="暂无设备预约"
                items={sortByStartTime(state.deviceBookings)}
                renderItem={booking => (
                  <>
                    <div className="row-with-badge">
                      <strong>{formatDeviceLabel(booking.deviceId, deviceById)}</strong>
                      <StatusBadge status={booking.status} />
                    </div>
                    <span>
                      {formatZoneLabel(booking.zoneId, zoneById)} · {formatTimeRange(booking.startTime, booking.endTime)}
                    </span>
                    <button className="text-button" disabled type="button">
                      暂无取消接口
                    </button>
                  </>
                )}
              />
            </BookingPanel>

            <BookingPanel count={state.visitBookings.length} title="参观预约">
              <VisitBookingForm onSubmit={onCreateVisit} />
              <Timeline
                emptyLabel="暂无参观预约"
                items={sortByStartTime(state.visitBookings)}
                renderItem={booking => (
                  <>
                    <div className="row-with-badge">
                      <strong>{booking.visitorOrg}</strong>
                      <StatusBadge status={booking.status} />
                    </div>
                    <span>
                      {booking.visitorCount} 位访客 · {booking.needDemo ? "需要演示" : "无需演示"} ·{" "}
                      {formatTimeRange(booking.startTime, booking.endTime)}
                    </span>
                    <BookingActions
                      canCancel={booking.status === "RESERVED"}
                      disabledLabel="已取消"
                      onCancel={() => onCancelVisit(booking.id)}
                    />
                  </>
                )}
              />
            </BookingPanel>
          </div>
        </>
      ) : null}
    </section>
  );
}

function BookingPanel({ children, count, title }: { children: ReactNode; count: number; title: string }) {
  return (
    <section className="panel booking-panel" aria-labelledby={`${title}-title`}>
      <div className="panel-header">
        <h2 id={`${title}-title`}>{title}</h2>
        <span className="panel-count">{count}</span>
      </div>
      {children}
    </section>
  );
}

function ZoneBookingForm({ onSubmit, zones }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; zones: Zone[] }) {
  return (
    <form className="booking-form" onSubmit={onSubmit}>
      <label>
        空间
        <select name="zoneId" required>
          {zones.map(zone => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </label>
      <TimeFields />
      <button className="primary-button" type="submit">
        创建预约
      </button>
    </form>
  );
}

function DeviceBookingForm({
  devices,
  onSubmit,
  zones
}: {
  devices: Device[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  zones: Zone[];
}) {
  return (
    <form className="booking-form" onSubmit={onSubmit}>
      <label>
        设备
        <select name="deviceId" required>
          {devices.map(device => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        空间
        <select name="zoneId" required>
          {zones.map(zone => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </label>
      <TimeFields />
      <button className="primary-button" type="submit">
        创建预约
      </button>
    </form>
  );
}

function VisitBookingForm({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="booking-form" onSubmit={onSubmit}>
      <label>
        访客组织
        <input name="visitorOrg" required />
      </label>
      <label>
        访客人数
        <input min="1" name="visitorCount" required type="number" />
      </label>
      <label className="checkbox-field">
        <input name="needDemo" type="checkbox" />
        需要演示
      </label>
      <TimeFields />
      <button className="primary-button" type="submit">
        创建预约
      </button>
    </form>
  );
}

function TimeFields() {
  return (
    <>
      <label>
        开始时间
        <input name="startTime" required type="datetime-local" />
      </label>
      <label>
        结束时间
        <input name="endTime" required type="datetime-local" />
      </label>
    </>
  );
}

function BookingActions({
  canCancel,
  disabledLabel,
  onCancel
}: {
  canCancel: boolean;
  disabledLabel: string;
  onCancel: () => void;
}) {
  return (
    <button className="text-button" disabled={!canCancel} onClick={onCancel} type="button">
      {canCancel ? "取消预约" : disabledLabel}
    </button>
  );
}

async function loadBookingSnapshot(signal?: AbortSignal): Promise<BookingSnapshot> {
  const [zones, devices, zoneBookings, deviceBookings, visitBookings] = await Promise.all([
    getZones({ signal }),
    getDevices({ signal }),
    getZoneBookings({ signal }),
    getDeviceBookings({ signal }),
    getVisitBookings({ signal })
  ]);

  return {
    devices,
    deviceBookings,
    visitBookings,
    zoneBookings,
    zones
  };
}

async function handleMutation(
  setState: Dispatch<SetStateAction<BookingPageState>>,
  mutate: () => Promise<unknown>,
  message: string
): Promise<boolean> {
  try {
    await mutate();
    const snapshot = await loadBookingSnapshot();

    setState({
      status: "ready",
      ...snapshot,
      error: null,
      message
    });
    return true;
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "预约调度请求失败";

    setState(previous => createErrorState(messageText, previous));
    return false;
  }
}

function handleCreateZoneBooking(event: FormEvent<HTMLFormElement>, setState: Dispatch<SetStateAction<BookingPageState>>): void {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);

  void handleMutation(
    setState,
    () =>
      createZoneBooking({
        endTime: readFormString(data, "endTime"),
        startTime: readFormString(data, "startTime"),
        zoneId: readFormString(data, "zoneId")
      }),
    "空间预约已创建"
  ).then(success => {
    if (success) {
      form.reset();
    }
  });
}

function handleCreateDeviceBooking(event: FormEvent<HTMLFormElement>, setState: Dispatch<SetStateAction<BookingPageState>>): void {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);

  void handleMutation(
    setState,
    () =>
      createDeviceBooking({
        deviceId: readFormString(data, "deviceId"),
        endTime: readFormString(data, "endTime"),
        startTime: readFormString(data, "startTime"),
        zoneId: readFormString(data, "zoneId")
      }),
    "设备预约已创建"
  ).then(success => {
    if (success) {
      form.reset();
    }
  });
}

function handleCreateVisitBooking(event: FormEvent<HTMLFormElement>, setState: Dispatch<SetStateAction<BookingPageState>>): void {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);

  void handleMutation(
    setState,
    () =>
      createVisitBooking({
        endTime: readFormString(data, "endTime"),
        needDemo: data.get("needDemo") === "on",
        startTime: readFormString(data, "startTime"),
        visitorCount: Number(readFormString(data, "visitorCount")),
        visitorOrg: readFormString(data, "visitorOrg")
      }),
    "参观预约已创建"
  ).then(success => {
    if (success) {
      form.reset();
    }
  });
}

function readFormString(data: FormData, key: string): string {
  const value = data.get(key);

  return typeof value === "string" ? value : "";
}

function sortByStartTime<TItem extends { startTime: string }>(items: TItem[]): TItem[] {
  return [...items].sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime());
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

function formatZoneLabel(zoneId: string, zoneById: Map<string, Zone>): string {
  const zone = zoneById.get(zoneId);

  return zone ? `${zone.name} (${zone.id})` : zoneId;
}

function formatDeviceLabel(deviceId: string, deviceById: Map<string, Device>): string {
  const device = deviceById.get(deviceId);

  return device ? `${device.name} (${device.id})` : deviceId;
}

function createLoadingState(): BookingPageState {
  return {
    status: "loading",
    devices: [],
    deviceBookings: [],
    error: null,
    message: null,
    visitBookings: [],
    zoneBookings: [],
    zones: []
  };
}

function createErrorState(error: string, previous?: BookingPageState): BookingPageState {
  return {
    status: "error",
    devices: previous?.devices ?? [],
    deviceBookings: previous?.deviceBookings ?? [],
    error,
    message: null,
    visitBookings: previous?.visitBookings ?? [],
    zoneBookings: previous?.zoneBookings ?? [],
    zones: previous?.zones ?? []
  };
}

function canRenderBookingData(state: BookingPageState): boolean {
  return (
    state.status === "ready" ||
    state.zones.length > 0 ||
    state.devices.length > 0 ||
    state.zoneBookings.length > 0 ||
    state.deviceBookings.length > 0 ||
    state.visitBookings.length > 0
  );
}

function getStateLabel(status: BookingPageState["status"]): string {
  if (status === "loading") {
    return "加载中";
  }

  if (status === "error") {
    return "异常";
  }

  return "在线";
}
