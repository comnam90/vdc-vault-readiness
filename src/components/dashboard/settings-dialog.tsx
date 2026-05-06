import { useState } from "react";
import { Cloud, Server } from "lucide-react";
import {
  DEFAULT_SETTINGS,
  type GlobalSettings,
  type TargetCloud,
} from "@/types/settings";
import { useSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CLOUD_OPTIONS: Array<{
  value: TargetCloud;
  label: string;
  description: string;
  icon: typeof Cloud;
}> = [
  {
    value: "Azure",
    label: "Azure",
    description: "Block generation tuned for Azure (10 days).",
    icon: Cloud,
  },
  {
    value: "AWS",
    label: "AWS",
    description: "Block generation tuned for AWS (30 days).",
    icon: Server,
  },
];

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

interface SettingsFormProps {
  initial: GlobalSettings;
  onSave: (next: GlobalSettings) => void;
  onCancel: () => void;
}

function SettingsForm({ initial, onSave, onCancel }: SettingsFormProps) {
  const [draft, setDraft] = useState<GlobalSettings>(initial);
  const capEnabled = draft.limitCalculationYears !== null;

  return (
    <>
      <div className="space-y-6 py-2">
        {/* Target Cloud */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Target Cloud</h3>
            <p className="text-muted-foreground text-xs">
              Affects block generation defaults sent to the calculator.
            </p>
          </div>
          <RadioGroup
            value={draft.targetCloud}
            onValueChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                targetCloud: value as TargetCloud,
              }))
            }
            className="grid grid-cols-2 gap-2"
          >
            {CLOUD_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const checked = draft.targetCloud === opt.value;
              return (
                <Label
                  key={opt.value}
                  htmlFor={`cloud-${opt.value}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border p-3 duration-150 ease-[var(--ease-out)] motion-safe:transition-colors",
                    checked
                      ? "border-primary bg-primary/5"
                      : "border-input hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem
                    id={`cloud-${opt.value}`}
                    value={opt.value}
                    aria-label={opt.label}
                  />
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      checked ? "text-primary" : "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                </Label>
              );
            })}
          </RadioGroup>
        </section>

        <Separator />

        {/* Data Growth */}
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Data Growth</h3>
            <p className="text-muted-foreground text-xs">
              Set both to 0 to disable projected growth.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="growth-percent">Growth %</Label>
              <div className="relative">
                <Input
                  id="growth-percent"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={draft.growthPercent}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      growthPercent: clamp(
                        parseInt(e.target.value, 10),
                        0,
                        100,
                      ),
                    }))
                  }
                  className="pr-7 font-mono"
                />
                <span
                  className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs"
                  aria-hidden="true"
                >
                  %
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="growth-years">Growth Years</Label>
              <div className="relative">
                <Input
                  id="growth-years"
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={draft.growthYears}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      growthYears: clamp(parseInt(e.target.value, 10), 0, 10),
                    }))
                  }
                  className="pr-7 font-mono"
                />
                <span
                  className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs"
                  aria-hidden="true"
                >
                  y
                </span>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Retention Limit */}
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="cap-retention" className="text-sm font-semibold">
                Cap retention horizon
              </Label>
              <p className="text-muted-foreground text-xs">
                Truncate yearly, monthly, weekly, and daily retention to a fixed
                time horizon for the sizing math.
              </p>
            </div>
            <Switch
              id="cap-retention"
              checked={capEnabled}
              onCheckedChange={(checked) =>
                setDraft((prev) => ({
                  ...prev,
                  limitCalculationYears: checked
                    ? (prev.limitCalculationYears ?? 1)
                    : null,
                }))
              }
            />
          </div>
          {capEnabled && (
            <div className="motion-safe:animate-in motion-safe:slide-in-from-top-2 motion-safe:fade-in fill-mode-backwards space-y-1.5 duration-150 ease-[var(--ease-out)]">
              <Label htmlFor="limit-years">Years</Label>
              <div className="relative max-w-[10rem]">
                <Input
                  id="limit-years"
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={draft.limitCalculationYears ?? 1}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      limitCalculationYears: clamp(
                        parseInt(e.target.value, 10),
                        1,
                        10,
                      ),
                    }))
                  }
                  className="pr-7 font-mono"
                />
                <span
                  className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs"
                  aria-hidden="true"
                >
                  y
                </span>
              </div>
            </div>
          )}
        </section>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDraft(DEFAULT_SETTINGS)}
          className="text-muted-foreground sm:mr-auto"
        >
          Reset to defaults
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onSave(draft)}>
            Save
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings } = useSettings();

  const handleSave = (next: GlobalSettings) => {
    updateSettings(next);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Global settings</DialogTitle>
          <DialogDescription>
            Adjust sizing parameters for your environment. Changes apply when
            you click <span className="font-medium">Re-calculate</span> on the
            Sizing tab.
          </DialogDescription>
        </DialogHeader>
        <SettingsForm
          initial={settings}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
