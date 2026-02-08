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

  it("uses 150ms duration with ease-out easing per §4 spec", () => {
    render(<Button>Timed</Button>);
    const button = screen.getByRole("button", { name: /timed/i });
    expect(button.className).toMatch(/duration-150/);
    expect(button.className).toMatch(/ease-\[--ease-out\]/);
  });
});
