import { useState } from "react";
import { Settings, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "./settings-dialog";

interface SiteHeaderProps {
  onReset: () => void;
}

export function SiteHeader({ onReset }: SiteHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            VDC Vault Readiness
          </h1>
          <Badge variant="secondary">Scan Complete</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            <Settings className="size-4" aria-hidden="true" />
            <span className="sr-only">Open settings</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            <Upload className="size-4" />
            Upload New
          </Button>
        </div>
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
