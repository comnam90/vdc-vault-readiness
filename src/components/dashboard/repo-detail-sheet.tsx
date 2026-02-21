import type { SafeJob, SafeRepo } from "@/types/domain";
import type { RepoStats } from "@/lib/repo-aggregator";
import { formatTB } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  PropertyRow,
  SectionHeading,
  BoolBadge,
  FreeSpaceValue,
} from "./detail-sheet-helpers";

const MAX_VISIBLE_JOBS = 10;

interface RepoDetailSheetProps {
  repo: SafeRepo | null;
  repoStats: RepoStats | null;
  jobs: SafeJob[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function JobsList({ jobs }: { jobs: SafeJob[] }) {
  const encryptedCount = jobs.filter((j) => j.Encrypted).length;
  const total = jobs.length;
  const allEncrypted = encryptedCount === total;

  const visible = jobs.slice(0, MAX_VISIBLE_JOBS);
  const overflow = jobs.length - visible.length;

  return (
    <div className="space-y-2">
      <p
        className={cn(
          "text-sm font-medium",
          allEncrypted ? "text-primary" : "text-destructive",
        )}
      >
        {encryptedCount} / {total} job{total !== 1 ? "s" : ""} encrypted
      </p>
      <ul className="space-y-1">
        {visible.map((job) => (
          <li key={job.JobName} className="flex items-center gap-2 text-sm">
            <span className="flex-1 truncate">{job.JobName}</span>
            {job.Encrypted ? (
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/5 text-primary"
              >
                Encrypted
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-destructive/30 bg-destructive/5 text-destructive"
              >
                Not Encrypted
              </Badge>
            )}
          </li>
        ))}
      </ul>
      {overflow > 0 && (
        <p className="text-muted-foreground text-xs">+ {overflow} more</p>
      )}
    </div>
  );
}

export function RepoDetailSheet({
  repo,
  repoStats,
  jobs,
  open,
  onOpenChange,
}: RepoDetailSheetProps) {
  if (!repo) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent side="right" />
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn("motion-safe:data-[state=open]:animate-in sm:max-w-md")}
      >
        <SheetHeader className="pr-8">
          <SheetTitle>{repo.Name}</SheetTitle>
          <SheetDescription>{repo.Type ?? "Repository"}</SheetDescription>
          <div className="pt-1">
            {repo.ImmutabilitySupported ? (
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/5 text-primary"
              >
                Immutable
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Not Immutable
              </Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-5">
            {/* Section 1 — Identity */}
            <div className="space-y-1">
              <SectionHeading>Identity</SectionHeading>
              <PropertyRow label="Type">{repo.Type ?? "N/A"}</PropertyRow>
              <PropertyRow label="Host">{repo.Host ?? "N/A"}</PropertyRow>
              <PropertyRow label="Path">{repo.Path ?? "N/A"}</PropertyRow>
            </div>

            <Separator />

            {/* Section 2 — Capacity */}
            <div className="space-y-1">
              <SectionHeading>Capacity</SectionHeading>
              <PropertyRow label="Total Space">
                {repo.TotalSpaceTB !== null
                  ? formatTB(repo.TotalSpaceTB)
                  : "N/A"}
              </PropertyRow>
              <PropertyRow label="Free Space">
                <FreeSpaceValue
                  tb={repo.FreeSpaceTB}
                  percent={repo.FreeSpacePercent}
                />
              </PropertyRow>
              <PropertyRow label="Source Data">
                {repoStats !== null ? formatTB(repoStats.sourceTB) : "N/A"}
              </PropertyRow>
              <PropertyRow label="Backup Data">
                {repoStats !== null ? formatTB(repoStats.onDiskTB) : "N/A"}
              </PropertyRow>
            </div>

            <Separator />

            {/* Section 3 — Configuration */}
            <div className="space-y-1">
              <SectionHeading>Configuration</SectionHeading>
              <PropertyRow label="Max Tasks">
                {repo.MaxTasks !== null ? String(repo.MaxTasks) : "N/A"}
              </PropertyRow>
              <PropertyRow label="Per-VM Files">
                <BoolBadge value={repo.IsPerVmBackupFiles} />
              </PropertyRow>
              <PropertyRow label="Decompress">
                <BoolBadge value={repo.IsDecompress} />
              </PropertyRow>
              <PropertyRow label="Align Blocks">
                <BoolBadge value={repo.AlignBlocks} />
              </PropertyRow>
              <PropertyRow label="Rotated Drives">
                <BoolBadge value={repo.IsRotatedDrives} />
              </PropertyRow>
              <PropertyRow label="Immutability">
                <BoolBadge
                  value={repo.ImmutabilitySupported}
                  trueLabel="Supported"
                  falseLabel="Not Supported"
                />
              </PropertyRow>
            </div>

            {jobs.length > 0 && (
              <>
                <Separator />

                {/* Section 4 — Jobs */}
                <div className="space-y-2">
                  <SectionHeading>Jobs</SectionHeading>
                  <JobsList jobs={jobs} />
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
