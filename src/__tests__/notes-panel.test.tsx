import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ValidationResult } from "@/types/validation";
import { NotesPanel } from "@/components/dashboard/notes-panel";

const INFO_RESULT: ValidationResult = {
  ruleId: "license-edition",
  title: "License/Edition Notes",
  status: "info",
  message: "Community Edition detected.",
  affectedItems: ["Community"],
};

const SKIPPED_RESULT: ValidationResult = {
  ruleId: "config-backup-encryption",
  title: "Configuration Backup Encryption",
  status: "skipped",
  message: "Check skipped — security summary missing.",
  affectedItems: [],
};

const PASS_RESULT: ValidationResult = {
  ruleId: "vbr-version",
  title: "VBR Version Compatibility",
  status: "pass",
  message: "All servers meet minimum version.",
  affectedItems: [],
};

describe("NotesPanel", () => {
  it("renders nothing when there are no info or skipped validations", () => {
    const { container } = render(<NotesPanel validations={[PASS_RESULT]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders info validations with title and message", () => {
    render(<NotesPanel validations={[INFO_RESULT, PASS_RESULT]} />);
    expect(screen.getByText("License/Edition Notes")).toBeInTheDocument();
    expect(screen.getByText("Community Edition detected.")).toBeInTheDocument();
  });

  it("renders skipped validations with title and message", () => {
    render(<NotesPanel validations={[SKIPPED_RESULT]} />);
    expect(
      screen.getByText("Configuration Backup Encryption"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Check skipped — security summary missing."),
    ).toBeInTheDocument();
  });

  it("displays affected items as a bulleted list", () => {
    render(<NotesPanel validations={[INFO_RESULT]} />);
    expect(screen.getByText("Community")).toBeInTheDocument();
  });

  it("truncates affected items beyond 5 with overflow text", () => {
    const longList: ValidationResult = {
      ruleId: "license-edition",
      title: "License/Edition Notes",
      status: "info",
      message: "Multiple editions.",
      affectedItems: ["A", "B", "C", "D", "E", "F", "G"],
    };
    render(<NotesPanel validations={[longList]} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.queryByText("F")).not.toBeInTheDocument();
    expect(screen.getByText(/and 2 more/i)).toBeInTheDocument();
  });

  it("renders both info and skipped together with a panel testid", () => {
    render(<NotesPanel validations={[INFO_RESULT, SKIPPED_RESULT]} />);
    expect(screen.getByTestId("notes-panel")).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });
});
