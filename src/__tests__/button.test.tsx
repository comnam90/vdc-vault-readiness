import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders correctly", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it("has scale feedback on press (active state)", () => {
    render(<Button>Press me</Button>);
    const button = screen.getByRole("button", { name: /press me/i });
    expect(button).toHaveClass("motion-safe:active:scale-[0.98]");
  });
});
