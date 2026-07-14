export function StatusBadge({ status }: { status: string }) {
  const className = status.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "unknown";

  return <span className={`status-badge status-${className}`}>{getStatusLabel(status)}</span>;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "启用",
    AVAILABLE: "可用",
    CANCELLED: "已取消",
    CLOSED: "已关闭",
    FAULT: "故障",
    IN_PROGRESS: "处理中",
    IN_USE: "使用中",
    INACTIVE: "停用",
    MAINTENANCE: "维护中",
    OPEN: "待处理",
    RESERVED: "已预约"
  };

  return labels[status] ?? status.replaceAll("_", " ");
}
