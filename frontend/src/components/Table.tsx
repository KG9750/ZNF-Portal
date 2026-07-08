import type { ReactNode } from "react";

export interface TableColumn<TRow> {
  header: string;
  key: string;
  render: (row: TRow) => ReactNode;
}

interface TableProps<TRow> {
  columns: Array<TableColumn<TRow>>;
  emptyLabel: string;
  rows: TRow[];
  rowKey: (row: TRow) => string;
}

export function Table<TRow>({ columns, emptyLabel, rows, rowKey }: TableProps<TRow>) {
  if (rows.length === 0) {
    return <p className="empty-state">{emptyLabel}</p>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map(column => (
            <th key={column.key} scope="col">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={rowKey(row)}>
            {columns.map(column => (
              <td key={column.key}>{column.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
