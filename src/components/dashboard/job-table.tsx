import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, LockKeyhole, LockKeyholeOpen } from "lucide-react";
import type { EnrichedJob } from "@/types/enriched-job";
import { cn } from "@/lib/utils";
import { formatSize, formatPercent } from "@/lib/format-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobDetailSheet } from "./job-detail-sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const columnHelper = createColumnHelper<EnrichedJob>();

function ChangeRateCell({ rate }: { rate: number | null }) {
  if (rate === null) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  const formatted = formatPercent(rate);

  if (rate > 50) {
    return <span className="text-destructive font-mono">{formatted}</span>;
  }
  if (rate > 10) {
    return <span className="text-warning font-mono">{formatted}</span>;
  }
  return <span className="font-mono">{formatted}</span>;
}

function SourceSizeCell({ gb }: { gb: number | null }) {
  const formatted = formatSize(gb);
  if (!formatted) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  return (
    <span className="font-mono">
      <span className="font-bold">{formatted.value}</span>{" "}
      <span className="text-muted-foreground text-xs">{formatted.unit}</span>
    </span>
  );
}

const columns = [
  columnHelper.display({
    id: "status",
    header: () => <span className="sr-only">Status</span>,
    cell: ({ row }) =>
      row.original.Encrypted ? (
        <>
          <LockKeyhole className="text-primary size-5" aria-hidden="true" />
          <span className="sr-only">Encrypted</span>
        </>
      ) : (
        <>
          <LockKeyholeOpen
            className="text-destructive size-5"
            aria-hidden="true"
          />
          <span className="sr-only">Not encrypted</span>
        </>
      ),
    size: 40,
  }),
  columnHelper.accessor("JobName", {
    header: "Job Name",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    enableSorting: true,
  }),
  columnHelper.accessor("JobType", {
    header: "Type",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("RepoName", {
    header: "Repository",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor((row) => row.SourceSizeGB ?? undefined, {
    id: "sourceSize",
    header: "Source Size",
    cell: (info) => <SourceSizeCell gb={info.getValue() ?? null} />,
    enableSorting: true,
    sortingFn: "basic",
    sortUndefined: "last",
    meta: { align: "right" },
  }),
  columnHelper.accessor((row) => row.sessionData?.AvgChangeRate ?? undefined, {
    id: "changeRate",
    header: "Change Rate",
    cell: (info) => <ChangeRateCell rate={info.getValue() ?? null} />,
    enableSorting: true,
    sortingFn: "basic",
    sortUndefined: "last",
    meta: { align: "right" },
  }),
  columnHelper.accessor((row) => row.GfsEnabled ?? undefined, {
    id: "gfsEnabled",
    header: "GFS",
    cell: (info) =>
      info.getValue() === true ? (
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/5 text-primary"
        >
          Yes
        </Badge>
      ) : info.getValue() === false ? (
        <Badge variant="outline" className="text-muted-foreground">
          No
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          N/A
        </Badge>
      ),
    enableSorting: true,
    sortingFn: "basic",
    sortUndefined: "last",
  }),
  columnHelper.accessor("Encrypted", {
    header: "Encrypted",
    cell: (info) =>
      info.getValue() ? (
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/5 text-primary"
        >
          Yes
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="border-destructive/30 bg-destructive/5 text-destructive"
        >
          No
        </Badge>
      ),
  }),
];

interface JobTableProps {
  jobs: EnrichedJob[];
}

export function JobTable({ jobs }: JobTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedJob, setSelectedJob] = useState<EnrichedJob | null>(null);

  const table = useReactTable({
    data: jobs,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      return row.original.JobName.toLowerCase().includes(
        filterValue.toLowerCase(),
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  const handleRowSelect = (job: EnrichedJob) => {
    setSelectedJob(job);
  };

  const handleRowKeyDown = (
    e: React.KeyboardEvent<HTMLTableRowElement>,
    job: EnrichedJob,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedJob(job);
    }
  };

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in space-y-4 duration-300">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search jobs..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        {globalFilter && (
          <span className="text-muted-foreground text-sm tabular-nums">
            {table.getFilteredRowModel().rows.length} of {jobs.length}{" "}
            {jobs.length === 1 ? "job" : "jobs"}
          </span>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const align =
                    (header.column.columnDef.meta as { align?: string })
                      ?.align === "right"
                      ? "text-right"
                      : "";
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "text-muted-foreground text-xs font-semibold tracking-wide uppercase",
                        align,
                      )}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          className={cn(
                            "flex items-center gap-1",
                            align && "ml-auto",
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <ArrowUpDown className="size-3" />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "cursor-pointer transition-colors",
                    row.original.Encrypted
                      ? "hover:bg-muted/30"
                      : "bg-destructive/10 hover:bg-destructive/15",
                  )}
                  onClick={() => handleRowSelect(row.original)}
                  onKeyDown={(e) => handleRowKeyDown(e, row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const cellAlign =
                      (cell.column.columnDef.meta as { align?: string })
                        ?.align === "right"
                        ? "text-right"
                        : "";
                    return (
                      <TableCell key={cell.id} className={cellAlign}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  No jobs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <JobDetailSheet
        job={selectedJob}
        open={selectedJob !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedJob(null);
        }}
      />
    </div>
  );
}
