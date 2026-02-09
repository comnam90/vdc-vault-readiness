import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SuccessCelebration } from "@/components/dashboard/success-celebration";

describe("SuccessCelebration", () => {
  describe("content", () => {
    it("renders heading 'All Systems Ready'", () => {
      render(<SuccessCelebration checksCount={6} onViewDetails={vi.fn()} />);

      expect(
        screen.getByRole("heading", { name: /all systems ready/i }),
      ).toBeInTheDocument();
    });

    it("renders compatibility message", () => {
      render(<SuccessCelebration checksCount={6} onViewDetails={vi.fn()} />);

      expect(
        screen.getByText(/fully compatible with VDC Vault/i),
      ).toBeInTheDocument();
    });

    it("renders checks passed count from prop", () => {
      render(<SuccessCelebration checksCount={6} onViewDetails={vi.fn()} />);

      expect(screen.getByText(/6.*checks passed/i)).toBeInTheDocument();
    });

    it("renders View Job Details button", () => {
      render(<SuccessCelebration checksCount={6} onViewDetails={vi.fn()} />);

      expect(
        screen.getByRole("button", { name: /view job details/i }),
      ).toBeInTheDocument();
    });

    it("calls onViewDetails when button is clicked", () => {
      const onViewDetails = vi.fn();
      render(
        <SuccessCelebration checksCount={6} onViewDetails={onViewDetails} />,
      );

      screen.getByRole("button", { name: /view job details/i }).click();
      expect(onViewDetails).toHaveBeenCalledOnce();
    });
  });

  describe("visual structure", () => {
    it("renders checkmark icon in circular container", () => {
      const { container } = render(
        <SuccessCelebration checksCount={6} onViewDetails={vi.fn()} />,
      );

      const iconContainer = container.querySelector(
        "[data-testid='success-icon-container']",
      );
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass("rounded-full");
    });

    it("renders success checkmark icon with accessible label", () => {
      render(<SuccessCelebration checksCount={6} onViewDetails={vi.fn()} />);

      expect(screen.getByText(/validation successful/i)).toBeInTheDocument();
    });
  });

  describe("animation classes", () => {
    it("applies fade-in animation to the card container with 200ms per §5.5", () => {
      const { container } = render(
        <SuccessCelebration checksCount={6} onViewDetails={vi.fn()} />,
      );

      const card = container.querySelector("[data-slot='card']");
      expect(card).toHaveClass("motion-safe:animate-in", "motion-safe:fade-in");
      expect(card).toHaveClass("duration-200");
    });

    it("applies success ring animation class to icon container", () => {
      const { container } = render(
        <SuccessCelebration checksCount={6} onViewDetails={vi.fn()} />,
      );

      const iconContainer = container.querySelector(
        "[data-testid='success-icon-container']",
      );
      expect(iconContainer).toHaveClass("motion-safe:animate-success-ring");
    });

    it("applies staggered fade-in to heading with delay after icon", () => {
      render(<SuccessCelebration checksCount={6} onViewDetails={vi.fn()} />);

      const heading = screen.getByRole("heading", {
        name: /all systems ready/i,
      });
      expect(heading).toHaveClass(
        "motion-safe:animate-in",
        "motion-safe:fade-in",
      );
      expect(heading.className).toMatch(/delay-/);
    });

    it("applies staggered fade-in to description text", () => {
      render(<SuccessCelebration checksCount={6} onViewDetails={vi.fn()} />);

      const description = screen.getByText(/fully compatible with VDC Vault/i);
      expect(description).toHaveClass(
        "motion-safe:animate-in",
        "motion-safe:fade-in",
      );
    });

    it("applies slide-up animation to button", () => {
      render(<SuccessCelebration checksCount={6} onViewDetails={vi.fn()} />);

      const button = screen.getByRole("button", { name: /view job details/i });
      expect(button).toHaveClass(
        "motion-safe:animate-in",
        "motion-safe:slide-in-from-bottom-2",
      );
    });

    it("uses fill-mode-backwards to prevent stagger flash", () => {
      const { container } = render(
        <SuccessCelebration checksCount={6} onViewDetails={vi.fn()} />,
      );

      const card = container.querySelector("[data-slot='card']");
      expect(card).toHaveClass("fill-mode-backwards");
    });
  });

  describe("accessibility", () => {
    it("card has status role for screen reader announcement", () => {
      const { container } = render(
        <SuccessCelebration checksCount={6} onViewDetails={vi.fn()} />,
      );

      const card = container.querySelector("[data-slot='card']");
      expect(card).toHaveAttribute("role", "status");
    });

    it("icon has sr-only label for screen readers", () => {
      render(<SuccessCelebration checksCount={6} onViewDetails={vi.fn()} />);

      expect(screen.getByText(/validation successful/i)).toHaveClass("sr-only");
    });
  });
});
