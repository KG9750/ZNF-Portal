import type { ReactNode } from "react";

interface TimelineProps<TItem extends { id: string }> {
  className?: string;
  emptyLabel: string;
  items: TItem[];
  renderItem: (item: TItem) => ReactNode;
}

export function Timeline<TItem extends { id: string }>({
  className = "timeline-list",
  emptyLabel,
  items,
  renderItem
}: TimelineProps<TItem>) {
  if (items.length === 0) {
    return <p className="empty-state">{emptyLabel}</p>;
  }

  return (
    <ul className={className}>
      {items.map(item => (
        <li key={item.id}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}
