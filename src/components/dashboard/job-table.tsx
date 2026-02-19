import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  Filter,
  LockKeyhole,
  LockKeyholeOpen,
} from "lucide-react";
import type { EnrichedJob } from "@/types/enriched-job";
import { cn } from "@/lib/utils";
import { formatSize, formatPercent } from "@/lib/format-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

// ── Filter helpers ────────────────────────────────────────────────────────────

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}

function MultiSelectFilter({
  label,
  options,
  value,
  onChange,
}: MultiSelectFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`filter by ${label.toLowerCase()}`}
          className={cn(
            "h-8 gap-1 text-xs",
            value.length > 0 && "border-primary text-primary",
          )}
        >
          <Filter className="size-3" aria-hidden="true" />
          {label}
          {value.length > 0 && (
            <Badge variant="secondary" className="ml-1 rounded-sm px-1 text-xs">
              {value.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1">
          {options.map((opt) => (
            <label
              key={opt}
              className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm"
            >
              <Checkbox
                checked={value.includes(opt)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...value, opt]
                    : value.filter((v) => v !== opt);
                  onChange(next);
                }}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
        {value.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full text-xs"
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

type ToggleState = "all" | "yes" | "no";

interface ThreeStateToggleProps {
  label: string;
  ariaLabel: string;
  value: ToggleState;
  onChange: (v: ToggleState) => void;
}

function ThreeStateToggle({
  label,
  ariaLabel,
  value,
  onChange,
}: ThreeStateToggleProps) {
  const cycle: ToggleState[] = ["all", "yes", "no"];
  const next = cycle[(cycle.indexOf(value) + 1) % cycle.length];
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={ariaLabel}
      className={cn(
        "h-8 text-xs",
        value === "yes" && "border-primary text-primary",
        value === "no" && "border-destructive text-destructive",
      )}
      onClick={() => onChange(next)}
    >
      {label}
      {value !== "all" && (
        <Badge variant="secondary" className="ml-1 rounded-sm px-1 text-xs">
          {value === "yes" ? "Yes" : "No"}
        </Badge>
      )}
    </Button>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────

function buildColumns(
  excludedJobNames: Set<string>,
  onExcludedChange: (names: Set<string>) => void,
) {
  return [
    columnHelper.display({
      id: "exclude",
      header: () => <span className="sr-only">Exclude from sizing</span>,
      cell: ({ row }) => {
        const jobName = row.original.JobName;
        const isExcluded = excludedJobNames.has(jobName);
        return (
          <Checkbox
            checked={isExcluded}
            aria-label={`Exclude ${jobName} from sizing`}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={(checked) => {
              const next = new Set(excludedJobNames);
              if (checked) {
                next.add(jobName);
              } else {
                next.delete(jobName);
              }
              onExcludedChange(next);
            }}
          />
        );
      },
      size: 40,
    }),
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
      cell: (info) => {
        const value = info.getValue();
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[180px] truncate font-medium">
                {value}
              </span>
            </TooltipTrigger>
            <TooltipContent>{value}</TooltipContent>
          </Tooltip>
        );
      },
      enableSorting: true,
    }),
    columnHelper.accessor("JobType", {
      header: "Type",
      filterFn: (row, _id, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row.original.JobType);
      },
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("RepoName", {
      header: "Repository",
      cell: (info) => {
        const value = info.getValue();
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[140px] truncate">{value}</span>
            </TooltipTrigger>
            <TooltipContent>{value}</TooltipContent>
          </Tooltip>
        );
      },
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
    columnHelper.accessor(
      (row) => row.sessionData?.AvgChangeRate ?? undefined,
      {
        id: "changeRate",
        header: "Change Rate",
        cell: (info) => <ChangeRateCell rate={info.getValue() ?? null} />,
        enableSorting: true,
        sortingFn: "basic",
        sortUndefined: "last",
        meta: { align: "right" },
      },
    ),
    columnHelper.accessor((row) => row.GfsEnabled ?? undefined, {
      id: "gfsEnabled",
      header: "GFS",
      filterFn: (row, _id, filterValue: "all" | "yes" | "no") => {
        if (!filterValue || filterValue === "all") return true;
        const gfs = row.original.GfsEnabled;
        return filterValue === "yes" ? gfs === true : gfs === false;
      },
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
      filterFn: (row, _id, filterValue: "all" | "yes" | "no") => {
        if (!filterValue || filterValue === "all") return true;
        return filterValue === "yes"
          ? row.original.Encrypted
          : !row.original.Encrypted;
      },
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
}

interface JobTableProps {
  jobs: EnrichedJob[];
  excludedJobNames?: Set<string>;
  onExcludedChange?: (names: Set<string>) => void;
}

export function JobTable({
  jobs,
  excludedJobNames = new Set(),
  onExcludedChange,
}: JobTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedJob, setSelectedJob] = useState<EnrichedJob | null>(null);

  const columns = useMemo(
    () => buildColumns(excludedJobNames, onExcludedChange ?? (() => {})),
    [excludedJobNames, onExcludedChange],
  );

  const table = useReactTable({
    data: jobs,
    columns,
    state: { globalFilter, sorting, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
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
    <TooltipProvider>
      <div className="motion-safe:animate-in motion-safe:fade-in space-y-4 duration-300">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search jobs..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-[200px]"
          />
          <MultiSelectFilter
            label="Type"
            options={[...new Set(jobs.map((j) => j.JobType))].sort()}
            value={
              (table.getColumn("JobType")?.getFilterValue() as string[]) ?? []
            }
            onChange={(v) =>
              table
                .getColumn("JobType")
                ?.setFilterValue(v.length ? v : undefined)
            }
          />
          <ThreeStateToggle
            label="Encrypted"
            ariaLabel="show encrypted only"
            value={
              (table.getColumn("Encrypted")?.getFilterValue() as ToggleState) ??
              "all"
            }
            onChange={(v) =>
              table
                .getColumn("Encrypted")
                ?.setFilterValue(v === "all" ? undefined : v)
            }
          />
          <ThreeStateToggle
            label="GFS"
            ariaLabel="show gfs only"
            value={
              (table
                .getColumn("gfsEnabled")
                ?.getFilterValue() as ToggleState) ?? "all"
            }
            onChange={(v) =>
              table
                .getColumn("gfsEnabled")
                ?.setFilterValue(v === "all" ? undefined : v)
            }
          />
          {table.getFilteredRowModel().rows.length !== jobs.length && (
            <span className="text-muted-foreground text-sm tabular-nums">
              {table.getFilteredRowModel().rows.length} of {jobs.length}{" "}
              {jobs.length === 1 ? "job" : "jobs"}
            </span>
          )}
        </div>
        {excludedJobNames.size > 0 && (
          <p className="text-muted-foreground text-sm">
            {excludedJobNames.size}{" "}
            {excludedJobNames.size === 1 ? "job excluded" : "jobs excluded"}{" "}
            from sizing
          </p>
        )}
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
    </TooltipProvider>
  );
}
