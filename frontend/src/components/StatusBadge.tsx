export function StatusBadge({ status }: { status: string }) {
  const className = status.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-") || "unknown";

  return <span className={`status-badge status-${className}`}>{status.replaceAll("_", " ")}</span>;
}
