import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  formatDays,
  formatGFS,
  formatPercent,
  formatTB,
} from "@/lib/format-utils";
import type { CalculatorSummary } from "@/types/calculator";

interface CalculatorConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  /** Called after the dialog closes. The dialog manages its own close state via onOpenChange. */
  onDecline: () => void;
  summary: CalculatorSummary;
  activeJobCount: number;
  vbrVersion: string;
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-mono">{value}</span>
    </div>
  );
}

export function CalculatorConsentDialog({
  open,
  onOpenChange,
  onAccept,
  onDecline,
  summary,
  activeJobCount,
  vbrVersion,
}: CalculatorConsentDialogProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const gfsLabel = formatGFS(
    summary.gfsWeekly,
    summary.gfsMonthly,
    summary.gfsYearly,
  );

  const handleAccept = () => {
    onOpenChange(false);
    onAccept();
  };

  const handleDecline = () => {
    onOpenChange(false);
    onDecline();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95",
        )}
      >
        <DialogHeader>
          <DialogTitle>Sizing calculation uses external service</DialogTitle>
          <DialogDescription>
            To generate your storage estimate, some summarised data from your
            backup environment is sent to Veeam&apos;s official sizing
            calculator. No raw job names, server hostnames, or sensitive
            configuration are included.
          </DialogDescription>
        </DialogHeader>

        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-1 px-0 text-sm"
            >
              {detailsOpen ? (
                <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
              )}
              View data being sent
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent
            className={cn(
              "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-200",
            )}
          >
            <div className="bg-muted/30 mt-2 space-y-3 rounded-md p-3">
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  From your environment
                </p>
                <DataRow
                  label="Source Data Size"
                  value={formatTB(summary.totalSourceDataTB)}
                />
                <DataRow
                  label="Daily Change Rate"
                  value={formatPercent(summary.weightedAvgChangeRate, 2)}
                />
                <DataRow
                  label="Retention Period"
                  value={formatDays(summary.maxRetentionDays)}
                />
                <DataRow label="Extended Retention (GFS)" value={gfsLabel} />
                <DataRow label="Job Count" value={String(activeJobCount)} />
                <DataRow label="VBR Version" value={vbrVersion} />
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Fixed calculator assumptions
                </p>
                <DataRow label="Backup Window" value="8 hours" />
                <DataRow label="Data Reduction" value="50%" />
                <DataRow label="Annual Growth Rate" value="5%" />
                <DataRow
                  label="Immutability (performance tier)"
                  value="30 days"
                />
                <DataRow label="Immutability (capacity tier)" value="30 days" />
                <DataRow label="Block Cloning" value="Enabled" />
                <DataRow label="Object Storage" value="Enabled" />
                <DataRow label="Archive Tier" value="Disabled" />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <DialogFooter>
          <Button variant="outline" onClick={handleDecline}>
            Decline
          </Button>
          <Button onClick={handleAccept}>Accept &amp; Calculate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
