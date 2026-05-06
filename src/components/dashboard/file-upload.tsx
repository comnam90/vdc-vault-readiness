import { useCallback, useRef, useState } from "react";
import { AlertCircle, FileJson, Play, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRecentScans } from "@/hooks/use-recent-scans";
import { formatTB } from "@/lib/format-utils";
import { formatRelativeTime } from "@/lib/relative-time";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  onLoadRecent?: (id: number) => void;
  error?: string | null;
}

export function FileUpload({
  onFileSelected,
  onLoadRecent,
  error,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { recentScans, removeScan } = useRecentScans();

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        onFileSelected(file);
      }
    },
    [onFileSelected],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelected(file);
      }
      // Clear the input so selecting the same file again will still trigger a change event
      e.target.value = "";
    },
    [onFileSelected],
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  return (
    <div className="space-y-6">
      <div
        data-testid="drop-zone"
        role="button"
        tabIndex={0}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "group/upload flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 px-12 py-16 text-center transition-all duration-150",
          error
            ? "border-destructive motion-safe:animate-shake border-dashed"
            : isDragOver
              ? "border-primary motion-safe:animate-drag-pulse border-solid"
              : "border-muted-foreground/25 bg-card/80 hover:border-muted-foreground/50 border-dashed shadow-sm backdrop-blur-sm hover:border-solid hover:shadow-md",
        )}
      >
        {/* Layered icon composition */}
        <div className="relative mb-4">
          <FileJson
            className={cn(
              "size-16 transition-colors duration-150",
              error
                ? "text-destructive/60"
                : isDragOver
                  ? "text-primary"
                  : "text-muted-foreground/60",
            )}
          />
          <div
            data-testid="upload-icon-wrapper"
            className={cn(
              "bg-background absolute -top-2 -right-2 rounded-full p-1 transition-transform duration-150 motion-safe:group-hover/upload:-translate-y-1",
              isDragOver && "motion-safe:-translate-y-1",
            )}
          >
            <UploadCloud
              className={cn(
                "size-5 transition-colors duration-150",
                isDragOver ? "text-primary" : "text-muted-foreground",
              )}
            />
          </div>
        </div>
        <p className="mb-1 text-xl font-semibold">
          Drop Veeam Healthcheck JSON here
        </p>
        <p className="text-muted-foreground text-sm">
          or click to <span className="text-primary font-medium">browse</span>
        </p>
        {error && (
          <div
            role="alert"
            className="text-destructive mt-3 flex items-center gap-1.5 text-sm"
          >
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {recentScans.length > 0 && (
        <section
          role="region"
          aria-label="Recent scans"
          className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-400 ease-[var(--ease-out)]"
        >
          <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
            Recent Scans
          </h2>
          <ul role="list" className="space-y-2">
            {recentScans.map((scan, i) => (
              <li
                key={scan.id}
                style={{ animationDelay: `${i * 60}ms` }}
                className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 fill-mode-backwards duration-400"
              >
                <Card className="hover:border-muted-foreground/40 px-3 py-2.5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {scan.filename}
                      </p>
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        <span>{scan.jobCount} jobs</span>
                        <span className="mx-1.5 opacity-50">·</span>
                        <span>
                          {scan.sourceTb !== null
                            ? formatTB(scan.sourceTb)
                            : "—"}
                        </span>
                        <span className="mx-1.5 opacity-50">·</span>
                        <span>VBR {scan.vbrVersion ?? "—"}</span>
                        <span className="mx-1.5 opacity-50">·</span>
                        <span>{formatRelativeTime(scan.uploadedAt)}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Load scan ${scan.filename}`}
                        disabled={!onLoadRecent}
                        onClick={() => onLoadRecent?.(scan.id)}
                      >
                        <Play className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete scan ${scan.filename}`}
                        onClick={() => {
                          void removeScan(scan.id);
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
