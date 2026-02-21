import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  PropertyRow,
  SectionHeading,
  BoolBadge,
} from "@/components/dashboard/detail-sheet-helpers";

describe("PropertyRow", () => {
  it("renders label text", () => {
    render(<PropertyRow label="Host">backup-server</PropertyRow>);
    expect(screen.getByText("Host")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(<PropertyRow label="Host">backup-server</PropertyRow>);
    expect(screen.getByText("backup-server")).toBeInTheDocument();
  });

  it("applies muted-foreground class to label", () => {
    render(<PropertyRow label="Host">value</PropertyRow>);
    const label = screen.getByText("Host");
    expect(label).toHaveClass("text-muted-foreground");
  });

  it("renders ReactNode children", () => {
    render(
      <PropertyRow label="Status">
        <span data-testid="child-node">active</span>
      </PropertyRow>,
    );
    expect(screen.getByTestId("child-node")).toBeInTheDocument();
  });
});

describe("SectionHeading", () => {
  it("renders heading text", () => {
    render(<SectionHeading>Identity</SectionHeading>);
    expect(screen.getByText("Identity")).toBeInTheDocument();
  });

  it("renders as h3 element", () => {
    render(<SectionHeading>Configuration</SectionHeading>);
    const heading = screen.getByText("Configuration");
    expect(heading.tagName).toBe("H3");
  });

  it("applies uppercase class", () => {
    render(<SectionHeading>Capacity</SectionHeading>);
    const heading = screen.getByText("Capacity");
    expect(heading).toHaveClass("uppercase");
  });
});

describe("BoolBadge", () => {
  it("shows default true label when value is true", () => {
    render(<BoolBadge value={true} />);
    expect(screen.getByText("Enabled")).toBeInTheDocument();
  });

  it("shows default false label when value is false", () => {
    render(<BoolBadge value={false} />);
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("shows custom trueLabel when value is true", () => {
    render(<BoolBadge value={true} trueLabel="Supported" />);
    expect(screen.getByText("Supported")).toBeInTheDocument();
  });

  it("shows custom falseLabel when value is false", () => {
    render(<BoolBadge value={false} falseLabel="Not Supported" />);
    expect(screen.getByText("Not Supported")).toBeInTheDocument();
  });

  it("shows N/A when value is null", () => {
    render(<BoolBadge value={null} />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("applies primary styling for true value", () => {
    render(<BoolBadge value={true} />);
    const badge = screen.getByText("Enabled");
    expect(badge).toHaveClass("text-primary");
  });

  it("applies muted styling for false value", () => {
    render(<BoolBadge value={false} />);
    const badge = screen.getByText("Disabled");
    expect(badge).toHaveClass("text-muted-foreground");
  });

  it("applies muted styling for null value", () => {
    render(<BoolBadge value={null} />);
    const span = screen.getByText("N/A");
    expect(span).toHaveClass("text-muted-foreground");
  });
});
