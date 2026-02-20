import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import type {
  SafeJob,
  SafeSobr,
  SafeExtent,
  SafeCapExtent,
  SafeArchExtent,
  SafeRepo,
} from "@/types/domain";
import { formatTB } from "@/lib/format-utils";
import { aggregateRepoStatsMap, type RepoStats } from "@/lib/repo-aggregator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SobrDetailSheet } from "./sobr-detail-sheet";
import { RepositoriesTable } from "./repositories-table";

interface RepositoriesTabProps {
  repos: SafeRepo[];
  jobs: SafeJob[];
  sobr: SafeSobr[];
  extents: SafeExtent[];
  capExtents: SafeCapExtent[];
  archExtents: SafeArchExtent[];
}

// ── Shared cell render helpers ──────────────────────────────────────────────────

function renderNameCell(value: string) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block max-w-[180px] truncate font-medium" tabIndex={0}>
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

function renderDataCell(val: number | null) {
  return (
    <span className="font-mono">{val && val > 0 ? formatTB(val) : "N/A"}</span>
  );
}

// ── Column helpers ─────────────────────────────────────────────────────────────

const repoColumnHelper = createColumnHelper<SafeRepo>();
const sobrColumnHelper = createColumnHelper<SafeSobr>();

function buildRepoColumns(statsMap: Map<string, RepoStats>) {
  return [
    repoColumnHelper.accessor("Name", {
      header: "Name",
      enableSorting: true,
      cell: (info) => renderNameCell(info.getValue()),
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
        cell: (info) => renderDataCell(info.getValue()),
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
        cell: (info) => renderDataCell(info.getValue()),
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
  statsMap: Map<string, RepoStats>,
  capExtents: SafeCapExtent[],
  archExtents: SafeArchExtent[],
) {
  return [
    sobrColumnHelper.accessor("Name", {
      header: "Name",
      enableSorting: true,
      cell: (info) => renderNameCell(info.getValue()),
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
        cell: (info) => renderDataCell(info.getValue()),
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
        cell: (info) => renderDataCell(info.getValue()),
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

  const sobrNames = useMemo(() => new Set(sobr.map((s) => s.Name)), [sobr]);

  const repoStatsMap = useMemo(() => aggregateRepoStatsMap(jobs), [jobs]);
  const sobrStatsMap = useMemo(
    () => aggregateRepoStatsMap(jobs, sobrNames),
    [jobs, sobrNames],
  );

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
    <TooltipProvider>
      <div className="motion-safe:animate-in motion-safe:fade-in space-y-8 duration-300">
        {/* Standard Repositories */}
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Standard Repositories
          </h2>
          <RepositoriesTable
            table={repoTable}
            emptyMessage="No repositories found."
          />
        </section>

        {/* SOBR Repositories */}
        {sobr.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Scale-Out Repositories
            </h2>
            <RepositoriesTable
              table={sobrTable}
              onRowClick={(row) => setSelectedSobr(row.original)}
            />
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
    </TooltipProvider>
  );
}
