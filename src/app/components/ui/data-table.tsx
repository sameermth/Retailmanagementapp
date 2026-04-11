import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  sortable?: boolean;
  filterable?: boolean;
  value?: (row: T) => string | number | boolean | null | undefined;
  sortValue?: (row: T) => string | number | boolean | null | undefined;
  filterValue?: (row: T) => string | number | boolean | null | undefined;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: ReactNode;
  className?: string;
  enableColumnSorting?: boolean;
  enableColumnFilters?: boolean;
}

type SortDirection = "asc" | "desc";

function normalizeText(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().toLowerCase();
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No records found.",
  className,
  enableColumnSorting = true,
  enableColumnFilters = true,
}: DataTableProps<T>) {
  const [sortColumnKey, setSortColumnKey] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const displayRows = useMemo(() => {
    const filteredRows = rows.filter((row) =>
      columns.every((column) => {
        const filterText = filters[column.key]?.trim().toLowerCase() ?? "";
        const canFilter = enableColumnFilters && (column.filterable ?? Boolean(column.filterValue || column.value));

        if (!canFilter || filterText.length === 0) {
          return true;
        }

        const resolver = column.filterValue ?? column.value;
        const rowValue = resolver ? resolver(row) : "";
        return normalizeText(rowValue).includes(filterText);
      }),
    );

    if (!enableColumnSorting || !sortColumnKey) {
      return filteredRows;
    }

    const sortColumn = columns.find((column) => column.key === sortColumnKey);
    const canSort = sortColumn && (sortColumn.sortable ?? Boolean(sortColumn.sortValue || sortColumn.value));
    const resolver = sortColumn ? sortColumn.sortValue ?? sortColumn.value : undefined;

    if (!sortColumn || !canSort || !resolver) {
      return filteredRows;
    }

    const direction = sortDirection === "asc" ? 1 : -1;

    return [...filteredRows].sort((left, right) => {
      const leftValue = resolver(left);
      const rightValue = resolver(right);

      const leftText = normalizeText(leftValue);
      const rightText = normalizeText(rightValue);

      const leftNumber = Number(leftText);
      const rightNumber = Number(rightText);
      const bothNumbers = Number.isFinite(leftNumber) && Number.isFinite(rightNumber);

      if (bothNumbers) {
        return (leftNumber - rightNumber) * direction;
      }

      return leftText.localeCompare(rightText, undefined, { numeric: true, sensitivity: "base" }) * direction;
    });
  }, [columns, enableColumnFilters, enableColumnSorting, filters, rows, sortColumnKey, sortDirection]);

  function toggleSort(column: DataTableColumn<T>) {
    const canSort = enableColumnSorting && (column.sortable ?? Boolean(column.sortValue || column.value));
    if (!canSort) {
      return;
    }

    setSortColumnKey((currentKey) => {
      if (currentKey !== column.key) {
        setSortDirection("asc");
        return column.key;
      }

      setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
      return currentKey;
    });
  }

  function sortIcon(column: DataTableColumn<T>) {
    const canSort = enableColumnSorting && (column.sortable ?? Boolean(column.sortValue || column.value));
    if (!canSort) {
      return null;
    }

    if (sortColumnKey !== column.key) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUpAZ className="h-3.5 w-3.5 text-slate-600" />
    ) : (
      <ArrowDownAZ className="h-3.5 w-3.5 text-slate-600" />
    );
  }

  return (
    <div className={className}>
      <Table className="min-w-full text-left text-sm">
        <TableHeader className="bg-slate-50 text-slate-500">
          <TableRow className="border-b-0">
            {columns.map((column) => (
              <TableHead key={column.key} className={`px-3 py-2 font-medium ${column.headerClassName ?? ""}`}>
                <button
                  type="button"
                  onClick={() => toggleSort(column)}
                  className="inline-flex items-center gap-1.5 text-left"
                >
                  <span>{column.header}</span>
                  {sortIcon(column)}
                </button>
              </TableHead>
            ))}
          </TableRow>
          {enableColumnFilters ? (
            <TableRow className="border-b-0 bg-slate-50">
              {columns.map((column) => {
                const canFilter = column.filterable ?? Boolean(column.filterValue || column.value);
                return (
                  <TableHead key={`${column.key}-filter`} className={`px-3 py-2 ${column.headerClassName ?? ""}`}>
                    {canFilter ? (
                      <input
                        value={filters[column.key] ?? ""}
                        onChange={(event) =>
                          setFilters((current) => ({ ...current, [column.key]: event.target.value }))
                        }
                        placeholder="Filter..."
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
                      />
                    ) : null}
                  </TableHead>
                );
              })}
            </TableRow>
          ) : null}
        </TableHeader>
        <TableBody>
          {displayRows.length > 0 ? (
            displayRows.map((row) => (
              <TableRow key={rowKey(row)} className="border-t border-slate-100">
                {columns.map((column) => (
                  <TableCell key={`${String(rowKey(row))}-${column.key}`} className={`px-3 py-2 ${column.cellClassName ?? ""}`}>
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="px-3 py-6 text-sm text-slate-500" colSpan={columns.length}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
