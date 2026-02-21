import type {
  SafeSobr,
  SafeExtent,
  SafeCapExtent,
  SafeArchExtent,
} from "@/types/domain";
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
import { cn } from "@/lib/utils";
import { PropertyRow, SectionHeading, BoolBadge } from "./detail-sheet-helpers";

interface SobrDetailSheetProps {
  sobr: SafeSobr | null;
  perfExtents: SafeExtent[];
  capExtents: SafeCapExtent[];
  archExtents: SafeArchExtent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ExtentRow({ extent }: { extent: SafeExtent }) {
  return (
    <div className="space-y-1.5 rounded-md border p-3">
      <p className="text-sm font-medium">{extent.Name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">Type</span>
        <span>{extent.Type ?? "N/A"}</span>
        <span className="text-muted-foreground">Host</span>
        <span>{extent.Host ?? "N/A"}</span>
        <span className="text-muted-foreground">Immutability</span>
        <BoolBadge value={extent.ImmutabilitySupported ?? false} />
        {extent.TotalSpaceTB !== null && (
          <>
            <span className="text-muted-foreground">Capacity</span>
            <span className="font-mono">
              {extent.TotalSpaceTB.toFixed(2)} TB
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function CapExtentRow({ extent }: { extent: SafeCapExtent }) {
  return (
    <div className="space-y-1.5 rounded-md border p-3">
      <p className="text-sm font-medium">{extent.Name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">Type</span>
        <span>{extent.Type ?? "N/A"}</span>
        <span className="text-muted-foreground">Status</span>
        <span>{extent.Status ?? "N/A"}</span>
        <span className="text-muted-foreground">Encryption</span>
        <BoolBadge value={extent.EncryptionEnabled} />
        <span className="text-muted-foreground">Immutability</span>
        <span>
          {extent.ImmutableEnabled
            ? `${extent.ImmutablePeriod ?? "?"} days`
            : "Disabled"}
        </span>
        {extent.MoveModeEnabled && (
          <>
            <span className="text-muted-foreground">Move after</span>
            <span>{extent.MovePeriodDays ?? "?"} days</span>
          </>
        )}
      </div>
    </div>
  );
}

function ArchExtentRow({ extent }: { extent: SafeArchExtent }) {
  return (
    <div className="space-y-1.5 rounded-md border p-3">
      <p className="text-sm font-medium">{extent.Name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">Encryption</span>
        <BoolBadge value={extent.EncryptionEnabled} />
        <span className="text-muted-foreground">Offload Period</span>
        <span>
          {extent.OffloadPeriod != null
            ? `${extent.OffloadPeriod} days`
            : "N/A"}
        </span>
        <span className="text-muted-foreground">Cost Optimized</span>
        <BoolBadge value={extent.CostOptimizedEnabled ?? false} />
      </div>
    </div>
  );
}

export function SobrDetailSheet({
  sobr,
  perfExtents,
  capExtents,
  archExtents,
  open,
  onOpenChange,
}: SobrDetailSheetProps) {
  if (!sobr) {
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
          <SheetTitle>{sobr.Name}</SheetTitle>
          <SheetDescription>Scale-Out Backup Repository</SheetDescription>
          <div className="flex flex-wrap gap-1 pt-1">
            {sobr.ImmutableEnabled && (
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/5 text-primary"
              >
                Immutable
              </Badge>
            )}
            {sobr.EnableCapacityTier && (
              <Badge variant="outline">Capacity Tier</Badge>
            )}
            {sobr.ArchiveTierEnabled && (
              <Badge variant="outline">Archive Tier</Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-5">
            <div className="space-y-1">
              <SectionHeading>Configuration</SectionHeading>
              <PropertyRow label="Jobs">{sobr.JobCount ?? "N/A"}</PropertyRow>
              <PropertyRow label="Extents">
                {sobr.ExtentCount ?? "N/A"}
              </PropertyRow>
              <PropertyRow label="Policy Type">
                {sobr.PolicyType ?? "N/A"}
              </PropertyRow>
              <PropertyRow label="Per-VM Files">
                <BoolBadge value={sobr.UsePerVMFiles ?? false} />
              </PropertyRow>
            </div>

            {perfExtents.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <SectionHeading>Performance Tier</SectionHeading>
                  {perfExtents.map((e) => (
                    <ExtentRow key={e.Name} extent={e} />
                  ))}
                </div>
              </>
            )}

            {capExtents.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <SectionHeading>Capacity Tier</SectionHeading>
                  {capExtents.map((e) => (
                    <CapExtentRow key={e.Name} extent={e} />
                  ))}
                </div>
              </>
            )}

            {archExtents.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <SectionHeading>Archive Tier</SectionHeading>
                  {archExtents.map((e) => (
                    <ArchExtentRow key={e.Name} extent={e} />
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
