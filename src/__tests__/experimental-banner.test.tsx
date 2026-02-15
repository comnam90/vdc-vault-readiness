import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ExperimentalBanner } from "@/components/dashboard/experimental-banner";

describe("ExperimentalBanner", () => {
  describe("content", () => {
    it("renders alert with 'Experimental' title", () => {
      render(<ExperimentalBanner />);

      expect(screen.getByText("Experimental")).toBeInTheDocument();
    });

    it("renders description about active development", () => {
      render(<ExperimentalBanner />);

      expect(
        screen.getByText(
          /under active development.*may change or be incomplete/i,
        ),
      ).toBeInTheDocument();
    });

    it("has status role for non-urgent accessibility", () => {
      render(<ExperimentalBanner />);

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("removes rounded corners for full-width banner look", () => {
      render(<ExperimentalBanner />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveClass("rounded-none");
    });

    it("only shows bottom border", () => {
      render(<ExperimentalBanner />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveClass("border-x-0", "border-t-0");
    });

    it("applies fade-in animation with motion-safe prefix", () => {
      render(<ExperimentalBanner />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveClass(
        "motion-safe:animate-in",
        "motion-safe:fade-in",
      );
    });
  });

  describe("icon", () => {
    it("renders icon with aria-hidden", () => {
      const { container } = render(<ExperimentalBanner />);

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });
});
