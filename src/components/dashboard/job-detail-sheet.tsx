import type { EnrichedJob } from "@/types/enriched-job";
import { parseGfsDetails } from "@/lib/calculator-aggregator";
import {
  formatSize,
  formatPercent,
  formatDuration,
  formatCompressionRatio,
} from "@/lib/format-utils";
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
import { PropertyRow, SectionHeading } from "./detail-sheet-helpers";

interface JobDetailSheetProps {
  job: EnrichedJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ChangeRateValue({ rate }: { rate: number | null }) {
  if (rate === null) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  const formatted = formatPercent(rate);

  if (rate > 50) {
    return <span className="text-destructive">{formatted}</span>;
  }
  if (rate > 10) {
    return <span className="text-warning">{formatted}</span>;
  }
  return <span>{formatted}</span>;
}

function SuccessRateValue({ rate }: { rate: number | null }) {
  if (rate === null) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  const formatted = formatPercent(rate);

  if (rate < 80) {
    return <span className="text-destructive">{formatted}</span>;
  }
  if (rate < 95) {
    return <span className="text-warning">{formatted}</span>;
  }
  return <span className="text-primary">{formatted}</span>;
}

function FormatSizeDisplay({ gb }: { gb: number | null }) {
  const formatted = formatSize(gb);
  if (!formatted) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  return (
    <span>
      {formatted.value} {formatted.unit}
    </span>
  );
}

function BooleanValue({ value }: { value: boolean | null }) {
  if (value === null) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  return <span>{value ? "Enabled" : "Disabled"}</span>;
}

function NullableValue({ value }: { value: string | number | null }) {
  if (value === null || value === "N/A") {
    return <span className="text-muted-foreground">N/A</span>;
  }
  return <span>{String(value)}</span>;
}

function StorageSection({ job }: { job: EnrichedJob }) {
  return (
    <div className="space-y-1">
      <SectionHeading>Storage & Sizing</SectionHeading>
      <PropertyRow label="Source Size">
        <FormatSizeDisplay gb={job.SourceSizeGB} />
      </PropertyRow>
      <PropertyRow label="On-Disk Size">
        <FormatSizeDisplay gb={job.OnDiskGB} />
      </PropertyRow>
      <PropertyRow label="Compression Ratio">
        <NullableValue
          value={formatCompressionRatio(job.SourceSizeGB, job.OnDiskGB)}
        />
      </PropertyRow>
      <PropertyRow label="Change Rate">
        <ChangeRateValue rate={job.sessionData?.AvgChangeRate ?? null} />
      </PropertyRow>
    </div>
  );
}

function ProtectionSection({ job }: { job: EnrichedJob }) {
  const gfs = parseGfsDetails(job.GfsDetails);
  const gfsEnabled = job.GfsEnabled;

  return (
    <div className="space-y-1">
      <SectionHeading>Protection Policy</SectionHeading>
      <PropertyRow label="Retention">
        {job.RetainDays !== null ? (
          <span>
            {job.RetainDays} days
            {job.RetentionScheme ? ` (${job.RetentionScheme})` : ""}
          </span>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
      </PropertyRow>
      <PropertyRow label="Backup Chain">
        <NullableValue value={job.BackupChainType} />
      </PropertyRow>
      <PropertyRow label="Active Full">
        <BooleanValue value={job.ActiveFullEnabled} />
      </PropertyRow>
      <PropertyRow label="Synthetic Full">
        <BooleanValue value={job.SyntheticFullEnabled} />
      </PropertyRow>
      <PropertyRow label="GFS Policy">
        {gfsEnabled === true ? (
          <span>
            Weekly: {gfs.weekly ?? "N/A"}, Monthly: {gfs.monthly ?? "N/A"},
            Yearly: {gfs.yearly ?? "N/A"}
          </span>
        ) : gfsEnabled === false ? (
          <span className="text-muted-foreground">None configured</span>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
      </PropertyRow>
    </div>
  );
}

function ConfigurationSection({ job }: { job: EnrichedJob }) {
  return (
    <div className="space-y-1">
      <SectionHeading>Configuration</SectionHeading>
      <PropertyRow label="Repository">
        <NullableValue value={job.RepoName} />
      </PropertyRow>
      <PropertyRow label="Compression">
        <NullableValue value={job.CompressionLevel} />
      </PropertyRow>
      <PropertyRow label="Block Size">
        <NullableValue value={job.BlockSize} />
      </PropertyRow>
      <PropertyRow label="Indexing">
        <BooleanValue value={job.IndexingEnabled} />
      </PropertyRow>
    </div>
  );
}

function SessionSection({ job }: { job: EnrichedJob }) {
  const session = job.sessionData;

  return (
    <div className="space-y-1">
      <SectionHeading>Session Performance</SectionHeading>
      <PropertyRow label="Success Rate">
        <SuccessRateValue rate={session?.SuccessRate ?? null} />
      </PropertyRow>
      <PropertyRow label="Sessions">
        <NullableValue value={session?.SessionCount ?? null} />
      </PropertyRow>
      <PropertyRow label="Failures">
        <NullableValue value={session?.Fails ?? null} />
      </PropertyRow>
      <PropertyRow label="Avg Duration">
        <NullableValue value={formatDuration(session?.AvgJobTime ?? null)} />
      </PropertyRow>
      <PropertyRow label="Max Duration">
        <NullableValue value={formatDuration(session?.MaxJobTime ?? null)} />
      </PropertyRow>
    </div>
  );
}

export function JobDetailSheet({
  job,
  open,
  onOpenChange,
}: JobDetailSheetProps) {
  if (!job) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>No job selected</SheetTitle>
          </SheetHeader>
        </SheetContent>
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
          <SheetTitle>{job.JobName}</SheetTitle>
          <SheetDescription>{job.JobType}</SheetDescription>
          <div className="pt-1">
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
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
          <div className="space-y-5">
            <StorageSection job={job} />
            <Separator />
            <ProtectionSection job={job} />
            <Separator />
            <ConfigurationSection job={job} />
            <Separator />
            <SessionSection job={job} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
