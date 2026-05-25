import { CircleSlash, Info } from "lucide-react";
import type { ValidationResult, ValidationStatus } from "@/types/validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getNoteValidations } from "@/lib/validation-selectors";
import { cn } from "@/lib/utils";

interface NotesPanelProps {
  validations: ValidationResult[];
}

const MAX_VISIBLE_ITEMS = 5;
const STAGGER_DELAY_MS = 100;

const NOTE_STYLE: Record<
  Extract<ValidationStatus, "info" | "skipped">,
  {
    Icon: typeof Info;
    badgeLabel: string;
  }
> = {
  info: {
    Icon: Info,
    badgeLabel: "Note",
  },
  skipped: {
    Icon: CircleSlash,
    badgeLabel: "Skipped",
  },
};

export function NotesPanel({ validations }: NotesPanelProps) {
  const notes = getNoteValidations(validations);

  if (notes.length === 0) {
    return null;
  }

  return (
    <div data-testid="notes-panel" className="space-y-3">
      {notes.map((note, index) => {
        const style = NOTE_STYLE[note.status];
        const visibleItems = note.affectedItems.slice(0, MAX_VISIBLE_ITEMS);
        const remaining = note.affectedItems.length - MAX_VISIBLE_ITEMS;

        return (
          <Alert
            key={note.ruleId}
            role="status"
            className={cn(
              "motion-safe:animate-in motion-safe:fade-in fill-mode-backwards duration-300",
              "border-l-muted-foreground/30 bg-muted/40 border-l-4",
            )}
            style={{ animationDelay: `${index * STAGGER_DELAY_MS}ms` }}
          >
            <style.Icon
              className="text-muted-foreground !size-5"
              aria-hidden="true"
            />
            <AlertTitle>
              <span className="text-sm font-bold tracking-wide uppercase">
                {note.title}
              </span>
              <Badge
                variant="outline"
                className="border-muted-foreground text-muted-foreground ml-2 align-middle text-[10px] tracking-wider uppercase"
              >
                {style.badgeLabel}
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <p>{note.message}</p>
              {visibleItems.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-0.5">
                  {visibleItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {remaining > 0 && (
                    <li className="text-muted-foreground">
                      and {remaining} more
                    </li>
                  )}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
