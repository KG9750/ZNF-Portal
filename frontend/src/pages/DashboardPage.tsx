import { useEffect, useMemo, useState, type ReactElement } from "react";

import { StatusBadge } from "../components/StatusBadge.js";
import { Table, type TableColumn } from "../components/Table.js";
import { Timeline } from "../components/Timeline.js";
import {
  getDashboardOverview,
  type DashboardOverview,
  type Device,
  type DeviceBooking,
  type VisitBooking,
  type WorkOrder,
  type ZoneBooking
} from "../services/dashboard.js";
import { formatDeviceType, formatWorkOrderType } from "../utils/displayLabels.js";

type DashboardState =
  | { status: "loading"; data: null; error: null }
  | { status: "ready"; data: DashboardOverview; error: null }
  | { status: "error"; data: null; error: string };

const faultDeviceColumns: Array<TableColumn<Device>> = [
  { header: "设备", key: "name", render: device => device.name },
  { header: "类型", key: "type", render: device => formatDeviceType(device.type) },
  { header: "所在空间", key: "currentZone", render: device => device.currentZoneId }
];

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
            error: error instanceof Error ? error.message : "运行总览请求失败"
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
      { label: "空间预约", value: data?.todayZoneBookings.length ?? "-" },
      { label: "设备预约", value: data?.todayDeviceBookings.length ?? "-" },
      { label: "参观预约", value: data?.todayVisitBookings.length ?? "-" },
      { label: "故障设备", value: data?.faultDevices.length ?? "-" },
      { label: "待处理工单", value: data?.pendingWorkOrders.length ?? "-" }
    ];
  }, [state.data]);

  return (
    <section className="page dashboard-page">
      <header className="page-header dashboard-header">
        <div>
          <p className="eyebrow">运行中枢</p>
          <h1>运行总览</h1>
          <p className="page-summary">实时汇总今日预约、设备异常与待处理工单，保持训练场排程可见。</p>
        </div>
        <div className={`data-state data-state-${state.status}`}>{getStateLabel(state.status)}</div>
      </header>

      <div className="metric-grid" aria-label={hasData ? "运行指标" : "运行指标暂不可用"}>
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
        <div className="notice">正在加载运行数据...</div>
      ) : null}

      {state.data ? (
        <div className="dashboard-grid">
          <section className="panel wide-panel" aria-labelledby="today-bookings-title">
            <div className="panel-header">
              <h2 id="today-bookings-title">今日预约</h2>
            </div>
            <div className="booking-columns">
              <BookingList
                title="空间"
                items={state.data.todayZoneBookings}
                emptyLabel="今日暂无空间预约"
                renderItem={booking => (
                  <>
                    <strong>{booking.zoneId}</strong>
                    <span>{formatTimeRange(booking.startTime, booking.endTime)}</span>
                  </>
                )}
              />
              <BookingList
                title="设备"
                items={state.data.todayDeviceBookings}
                emptyLabel="今日暂无设备预约"
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
                title="参观"
                items={state.data.todayVisitBookings}
                emptyLabel="今日暂无参观预约"
                renderItem={booking => (
                  <>
                    <strong>{booking.visitorOrg}</strong>
                    <span>
                      {booking.visitorCount} 位访客 · {formatTimeRange(booking.startTime, booking.endTime)}
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
      <Timeline className="data-list" emptyLabel={emptyLabel} items={items} renderItem={renderItem} />
    </section>
  );
}

function DeviceStatusList({ devices }: { devices: Device[] }) {
  return (
    <Table
      columns={faultDeviceColumns}
      emptyLabel="暂无故障设备"
      rowKey={device => device.id}
      rows={devices}
    />
  );
}

function WorkOrderStatusList({ workOrders }: { workOrders: WorkOrder[] }) {
  if (workOrders.length === 0) {
    return <p className="empty-state">暂无待处理工单</p>;
  }

  return (
    <ul className="data-list">
      {workOrders.map(workOrder => (
        <li key={workOrder.id}>
          <div className="row-with-badge">
            <strong>{formatWorkOrderType(workOrder.type)}</strong>
            <StatusBadge status={workOrder.status} />
          </div>
          <span>{formatWorkOrderTarget(workOrder)}</span>
        </li>
      ))}
    </ul>
  );
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

function formatWorkOrderTarget(workOrder: WorkOrder): string {
  if (workOrder.deviceId) {
    return `设备 ${workOrder.deviceId}`;
  }

  if (workOrder.zoneId) {
    return `空间 ${workOrder.zoneId}`;
  }

  return "未分配";
}

function getStateLabel(status: DashboardState["status"]): string {
  if (status === "loading") {
    return "加载中";
  }

  if (status === "error") {
    return "异常";
  }

  return "在线";
}
