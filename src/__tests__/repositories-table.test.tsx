import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { RepositoriesTable } from "@/components/dashboard/repositories-table";

type RowData = { name: string };
const helper = createColumnHelper<RowData>();
const columns = [
  helper.accessor("name", { header: "Name", enableSorting: false }),
];

function makeTable(
  data: RowData[],
  onRowClick?: (row: RowData) => void,
  emptyMessage?: string,
) {
  function TestWrapper() {
    const table = useReactTable<RowData>({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      initialState: { pagination: { pageSize: 10 } },
    });
    return (
      <RepositoriesTable
        table={table}
        onRowClick={onRowClick ? (row) => onRowClick(row.original) : undefined}
        emptyMessage={emptyMessage}
      />
    );
  }
  return <TestWrapper />;
}

describe("RepositoriesTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders column headers", () => {
    render(makeTable([{ name: "Alpha" }]));
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("renders row data", () => {
    render(makeTable([{ name: "Alpha" }, { name: "Beta" }]));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("shows empty message when no rows", () => {
    render(makeTable([], undefined, "No items found."));
    expect(screen.getByText("No items found.")).toBeInTheDocument();
  });

  it("fires onRowClick when a row is clicked", () => {
    const handler = vi.fn();
    render(makeTable([{ name: "Alpha" }], handler));
    fireEvent.click(screen.getByText("Alpha"));
    expect(handler).toHaveBeenCalledWith({ name: "Alpha" });
  });
});
