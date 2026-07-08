import { useEffect, useMemo, useState, type ReactElement } from "react";

import {
  getDashboardOverview,
  type DashboardOverview,
  type Device,
  type DeviceBooking,
  type VisitBooking,
  type WorkOrder,
  type ZoneBooking
} from "../services/dashboard.js";

type DashboardState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: DashboardOverview; error: null }
  | { status: "error"; data: null; error: string };

export function DashboardPage() {
  const [state, setState] = useState<DashboardState>({
    status: "loading",
    data: null,
    error: null
  });

  useEffect(() => {
    const controller = new AbortController();

    getDashboardOverview({ signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted) {
          setState({ status: "ready", data, error: null });
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            data: null,
            error: error instanceof Error ? error.message : "Dashboard API request failed"
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  return <DashboardContent state={state} />;
}

export function DashboardContent({ state }: { state: DashboardState }) {
  const hasData = state.data !== null;

  const metrics = useMemo(() => {
    const data = state.data;

    return [
      { label: "Zone bookings", value: data?.todayZoneBookings.length ?? "-" },
      { label: "Device bookings", value: data?.todayDeviceBookings.length ?? "-" },
      { label: "Visit bookings", value: data?.todayVisitBookings.length ?? "-" },
      { label: "Fault devices", value: data?.faultDevices.length ?? "-" },
      { label: "Pending work orders", value: data?.pendingWorkOrders.length ?? "-" }
    ];
  }, [state.data]);

  return (
    <section className="page dashboard-page">
      <header className="page-header dashboard-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Dashboard</h1>
        </div>
        <div className={`data-state data-state-${state.status}`}>{getStateLabel(state.status)}</div>
      </header>

      <div className="metric-grid" aria-label={hasData ? "Dashboard totals" : "Dashboard totals unavailable"}>
        {metrics.map(metric => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>

      {state.status === "error" ? (
        <div className="notice error-notice">{state.error}</div>
      ) : null}

      {state.status === "loading" ? (
        <div className="notice">Loading dashboard data...</div>
      ) : null}

      {state.data ? (
        <div className="dashboard-grid">
          <section className="panel wide-panel" aria-labelledby="today-bookings-title">
            <div className="panel-header">
              <h2 id="today-bookings-title">今日预约</h2>
            </div>
            <div className="booking-columns">
              <BookingList
                title="Zone"
                items={state.data.todayZoneBookings}
                emptyLabel="No zone bookings today"
                renderItem={booking => (
                  <>
                    <strong>{booking.zoneId}</strong>
                    <span>{formatTimeRange(booking.startTime, booking.endTime)}</span>
                  </>
                )}
              />
              <BookingList
                title="Device"
                items={state.data.todayDeviceBookings}
                emptyLabel="No device bookings today"
                renderItem={booking => (
                  <>
                    <strong>{booking.deviceId}</strong>
                    <span>
                      {booking.zoneId} · {formatTimeRange(booking.startTime, booking.endTime)}
                    </span>
                  </>
                )}
              />
              <BookingList
                title="Visit"
                items={state.data.todayVisitBookings}
                emptyLabel="No visit bookings today"
                renderItem={booking => (
                  <>
                    <strong>{booking.visitorOrg}</strong>
                    <span>
                      {booking.visitorCount} visitors · {formatTimeRange(booking.startTime, booking.endTime)}
                    </span>
                  </>
                )}
              />
            </div>
          </section>

          <section className="panel" aria-labelledby="device-status-title">
            <div className="panel-header">
              <h2 id="device-status-title">故障设备</h2>
              <StatusBadge status="FAULT" />
            </div>
            <DeviceStatusList devices={state.data.faultDevices} />
          </section>

          <section className="panel" aria-labelledby="work-order-status-title">
            <div className="panel-header">
              <h2 id="work-order-status-title">工单状态</h2>
            </div>
            <WorkOrderStatusList workOrders={state.data.pendingWorkOrders} />
          </section>
        </div>
      ) : null}
    </section>
  );
}

interface BookingListProps<TBooking extends ZoneBooking | DeviceBooking | VisitBooking> {
  title: string;
  items: TBooking[];
  emptyLabel: string;
  renderItem: (booking: TBooking) => ReactElement;
}

function BookingList<TBooking extends ZoneBooking | DeviceBooking | VisitBooking>({
  title,
  items,
  emptyLabel,
  renderItem
}: BookingListProps<TBooking>) {
  return (
    <section className="booking-list">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="empty-state">{emptyLabel}</p>
      ) : (
        <ul className="data-list">
          {items.map(item => (
            <li key={item.id}>{renderItem(item)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DeviceStatusList({ devices }: { devices: Device[] }) {
  if (devices.length === 0) {
    return <p className="empty-state">No fault devices</p>;
  }

  return (
    <ul className="data-list">
      {devices.map(device => (
        <li key={device.id}>
          <strong>{device.name}</strong>
          <span>
            {device.type} · current zone {device.currentZoneId}
          </span>
        </li>
      ))}
    </ul>
  );
}

function WorkOrderStatusList({ workOrders }: { workOrders: WorkOrder[] }) {
  if (workOrders.length === 0) {
    return <p className="empty-state">No pending work orders</p>;
  }

  return (
    <ul className="data-list">
      {workOrders.map(workOrder => (
        <li key={workOrder.id}>
          <div className="row-with-badge">
            <strong>{workOrder.type}</strong>
            <StatusBadge status={workOrder.status} />
          </div>
          <span>{formatWorkOrderTarget(workOrder)}</span>
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{formatStatus(status)}</span>;
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

function formatTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatStatus(status: string): string {
  return status.replaceAll("_", " ");
}

function formatWorkOrderTarget(workOrder: WorkOrder): string {
  if (workOrder.deviceId) {
    return `Device ${workOrder.deviceId}`;
  }

  if (workOrder.zoneId) {
    return `Zone ${workOrder.zoneId}`;
  }

  return "Unassigned";
}

function getStateLabel(status: DashboardState["status"]): string {
  if (status === "loading") {
    return "Loading";
  }

  if (status === "error") {
    return "Error";
  }

  return "Live";
}
