import { useCallback, useRef, useState } from "react";
import { AlertCircle, FileJson, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  error?: string | null;
}

export function FileUpload({ onFileSelected, error }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        "group/upload flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-12 text-center transition-all duration-150",
        error
          ? "border-destructive motion-safe:animate-shake border-dashed"
          : isDragOver
            ? "border-primary motion-safe:animate-drag-pulse border-solid"
            : "border-muted-foreground/40 hover:border-muted-foreground/60 hover:bg-muted/50 border-dashed hover:border-solid",
      )}
    >
      {/* Layered icon composition */}
      <div className="relative mb-4">
        <FileJson
          className={cn(
            "size-14 transition-colors duration-150",
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
      <p className="mb-1 text-lg font-medium">
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
          <AlertCircle className="size-4 shrink-0" />
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
  );
}
