import type { SafeSobr, SafeCapExtent, SafeArchExtent } from "@/types/domain";
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

interface SobrDetailSheetProps {
  sobr: SafeSobr | null;
  capExtents: SafeCapExtent[];
  archExtents: SafeArchExtent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
      {children}
    </h3>
  );
}

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-baseline gap-2 py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-mono text-sm">{children}</span>
    </div>
  );
}

function BoolBadge({
  value,
  trueLabel = "Enabled",
  falseLabel = "Disabled",
}: {
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return value ? (
    <Badge
      variant="outline"
      className="border-primary/30 bg-primary/5 text-primary"
    >
      {trueLabel}
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      {falseLabel}
    </Badge>
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

  // Performance tier = non-cloud cap extents; Capacity tier = cloud/object extents
  const perfExtents = capExtents.filter(
    (e) =>
      e.Type &&
      !e.Type.toLowerCase().includes("cloud") &&
      !e.Type.toLowerCase().includes("object") &&
      !e.Type.toLowerCase().includes("amazon") &&
      !e.Type.toLowerCase().includes("azure"),
  );
  const capTierExtents = capExtents.filter((e) => !perfExtents.includes(e));

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
                    <CapExtentRow key={e.Name} extent={e} />
                  ))}
                </div>
              </>
            )}

            {capTierExtents.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <SectionHeading>Capacity Tier</SectionHeading>
                  {capTierExtents.map((e) => (
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
