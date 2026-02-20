import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import type {
  SafeJob,
  SafeSobr,
  SafeExtent,
  SafeCapExtent,
  SafeArchExtent,
  SafeRepo,
} from "@/types/domain";
import { formatTB } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SobrDetailSheet } from "./sobr-detail-sheet";

interface RepositoriesTabProps {
  repos: SafeRepo[];
  jobs: SafeJob[];
  sobr: SafeSobr[];
  extents: SafeExtent[];
  capExtents: SafeCapExtent[];
  archExtents: SafeArchExtent[];
}

// ── Column helpers ─────────────────────────────────────────────────────────────

const repoColumnHelper = createColumnHelper<SafeRepo>();
const sobrColumnHelper = createColumnHelper<SafeSobr>();

function buildRepoColumns(
  statsMap: Map<string, { sourceTB: number; onDiskTB: number }>,
) {
  return [
    repoColumnHelper.accessor("Name", {
      header: "Name",
      enableSorting: true,
    }),
    repoColumnHelper.accessor((row) => row.JobCount, {
      id: "jobs",
      header: "Jobs",
      cell: (info) => info.getValue() ?? "N/A",
      enableSorting: true,
      sortUndefined: "last",
    }),
    repoColumnHelper.accessor(
      (row) => statsMap.get(row.Name)?.sourceTB ?? null,
      {
        id: "sourceData",
        header: "Source Data",
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className="font-mono">
              {val && val > 0 ? formatTB(val) : "N/A"}
            </span>
          );
        },
        enableSorting: true,
        sortUndefined: "last",
        meta: { align: "right" },
      },
    ),
    repoColumnHelper.accessor(
      (row) => statsMap.get(row.Name)?.onDiskTB ?? null,
      {
        id: "backupData",
        header: "Backup Data",
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className="font-mono">
              {val && val > 0 ? formatTB(val) : "N/A"}
            </span>
          );
        },
        enableSorting: true,
        sortUndefined: "last",
        meta: { align: "right" },
      },
    ),
    repoColumnHelper.accessor("TotalSpaceTB", {
      id: "totalCapacity",
      header: "Total Capacity",
      cell: (info) => {
        const val = info.getValue();
        return (
          <span className="font-mono">
            {val !== null ? formatTB(val) : "N/A"}
          </span>
        );
      },
      enableSorting: true,
      sortUndefined: "last",
      meta: { align: "right" },
    }),
    repoColumnHelper.accessor("FreeSpaceTB", {
      id: "freeCapacity",
      header: "Free Capacity",
      cell: (info) => {
        const val = info.getValue();
        return (
          <span className="font-mono">
            {val !== null ? formatTB(val) : "N/A"}
          </span>
        );
      },
      enableSorting: true,
      sortUndefined: "last",
      meta: { align: "right" },
    }),
    repoColumnHelper.accessor("ImmutabilitySupported", {
      id: "immutability",
      header: "Immutability",
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
      enableSorting: true,
    }),
  ];
}

function buildSobrColumns(
  statsMap: Map<string, { sourceTB: number; onDiskTB: number }>,
  capExtents: SafeCapExtent[],
  archExtents: SafeArchExtent[],
) {
  return [
    sobrColumnHelper.accessor("Name", {
      header: "Name",
      enableSorting: true,
    }),
    sobrColumnHelper.accessor((row) => row.JobCount, {
      id: "jobs",
      header: "Jobs",
      cell: (info) => info.getValue() ?? "N/A",
      enableSorting: true,
      sortUndefined: "last",
    }),
    sobrColumnHelper.accessor(
      (row) => statsMap.get(row.Name)?.sourceTB ?? null,
      {
        id: "sourceData",
        header: "Source Data",
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className="font-mono">
              {val && val > 0 ? formatTB(val) : "N/A"}
            </span>
          );
        },
        enableSorting: true,
        sortUndefined: "last",
        meta: { align: "right" },
      },
    ),
    sobrColumnHelper.accessor(
      (row) => statsMap.get(row.Name)?.onDiskTB ?? null,
      {
        id: "backupData",
        header: "Backup Data",
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className="font-mono">
              {val && val > 0 ? formatTB(val) : "N/A"}
            </span>
          );
        },
        enableSorting: true,
        sortUndefined: "last",
        meta: { align: "right" },
      },
    ),
    sobrColumnHelper.accessor("EnableCapacityTier", {
      id: "capTier",
      header: "Capacity Tier",
      cell: (info) => {
        const s = info.row.original;
        const capExtent = capExtents.find((e) => e.SobrName === s.Name);
        return s.EnableCapacityTier ? (
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary"
          >
            {s.CapacityTierMove && capExtent?.MovePeriodDays != null
              ? `${capExtent.MovePeriodDays}d`
              : "Yes"}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            No
          </Badge>
        );
      },
      enableSorting: true,
    }),
    sobrColumnHelper.accessor("ArchiveTierEnabled", {
      id: "archTier",
      header: "Archive Tier",
      cell: (info) => {
        const s = info.row.original;
        const archExtent = archExtents.find((e) => e.SobrName === s.Name);
        return s.ArchiveTierEnabled ? (
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary"
          >
            {archExtent?.OffloadPeriod != null
              ? `${archExtent.OffloadPeriod}d`
              : "Yes"}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            No
          </Badge>
        );
      },
      enableSorting: true,
    }),
    sobrColumnHelper.accessor("ImmutableEnabled", {
      id: "immutability",
      header: "Immutability",
      cell: (info) => {
        const s = info.row.original;
        return s.ImmutableEnabled ? (
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary"
          >
            {s.ImmutablePeriod != null ? `${s.ImmutablePeriod}d` : "Yes"}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-destructive/30 bg-destructive/5 text-destructive"
          >
            No
          </Badge>
        );
      },
      enableSorting: true,
    }),
  ];
}

// ── Component ──────────────────────────────────────────────────────────────────

export function RepositoriesTab({
  repos,
  jobs,
  sobr,
  extents,
  capExtents,
  archExtents,
}: RepositoriesTabProps) {
  const [selectedSobr, setSelectedSobr] = useState<SafeSobr | null>(null);
  const [repoSorting, setRepoSorting] = useState<SortingState>([
    { id: "Name", desc: false },
  ]);
  const [sobrSorting, setSobrSorting] = useState<SortingState>([
    { id: "Name", desc: false },
  ]);

  const repoStatsMap = useMemo(() => {
    const map = new Map<string, { sourceTB: number; onDiskTB: number }>();
    for (const job of jobs) {
      const cur = map.get(job.RepoName) ?? { sourceTB: 0, onDiskTB: 0 };
      map.set(job.RepoName, {
        sourceTB:
          cur.sourceTB +
          (job.SourceSizeGB !== null ? job.SourceSizeGB / 1024 : 0),
        onDiskTB:
          cur.onDiskTB + (job.OnDiskGB !== null ? job.OnDiskGB / 1024 : 0),
      });
    }
    return map;
  }, [jobs]);

  const sobrNames = useMemo(() => new Set(sobr.map((s) => s.Name)), [sobr]);

  const sobrStatsMap = useMemo(() => {
    const map = new Map<string, { sourceTB: number; onDiskTB: number }>();
    for (const job of jobs) {
      if (sobrNames.has(job.RepoName)) {
        const cur = map.get(job.RepoName) ?? { sourceTB: 0, onDiskTB: 0 };
        map.set(job.RepoName, {
          sourceTB:
            cur.sourceTB +
            (job.SourceSizeGB !== null ? job.SourceSizeGB / 1024 : 0),
          onDiskTB:
            cur.onDiskTB + (job.OnDiskGB !== null ? job.OnDiskGB / 1024 : 0),
        });
      }
    }
    return map;
  }, [jobs, sobrNames]);

  const repoColumns = useMemo(
    () => buildRepoColumns(repoStatsMap),
    [repoStatsMap],
  );

  const repoTable = useReactTable({
    data: repos,
    columns: repoColumns,
    state: { sorting: repoSorting },
    onSortingChange: setRepoSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  const sobrColumns = useMemo(
    () => buildSobrColumns(sobrStatsMap, capExtents, archExtents),
    [sobrStatsMap, capExtents, archExtents],
  );

  const sobrTable = useReactTable({
    data: sobr,
    columns: sobrColumns,
    state: { sorting: sobrSorting },
    onSortingChange: setSobrSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in space-y-8 duration-300">
      {/* Standard Repositories */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Standard Repositories
        </h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              {repoTable.getHeaderGroups().map((headerGroup) => (
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
              {repoTable.getRowModel().rows.length > 0 ? (
                repoTable.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
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
                    colSpan={repoColumns.length}
                    className="text-muted-foreground h-24 text-center"
                  >
                    No repositories found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {repoTable.getPageCount() > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-muted-foreground text-sm">
                Page {repoTable.getState().pagination.pageIndex + 1} of{" "}
                {repoTable.getPageCount()}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => repoTable.previousPage()}
                  disabled={!repoTable.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => repoTable.nextPage()}
                  disabled={!repoTable.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SOBR Repositories */}
      {sobr.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Scale-Out Repositories
          </h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                {sobrTable.getHeaderGroups().map((headerGroup) => (
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
                {sobrTable.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedSobr(row.original)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedSobr(row.original);
                      }
                    }}
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
                ))}
              </TableBody>
            </Table>
            {sobrTable.getPageCount() > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-muted-foreground text-sm">
                  Page {sobrTable.getState().pagination.pageIndex + 1} of{" "}
                  {sobrTable.getPageCount()}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sobrTable.previousPage()}
                    disabled={!sobrTable.getCanPreviousPage()}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sobrTable.nextPage()}
                    disabled={!sobrTable.getCanNextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <SobrDetailSheet
        sobr={selectedSobr}
        perfExtents={extents.filter(
          (e) => selectedSobr && e.SobrName === selectedSobr.Name,
        )}
        capExtents={capExtents.filter(
          (e) => selectedSobr && e.SobrName === selectedSobr.Name,
        )}
        archExtents={archExtents.filter(
          (e) => selectedSobr && e.SobrName === selectedSobr.Name,
        )}
        open={selectedSobr !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSobr(null);
        }}
      />
    </div>
  );
}
