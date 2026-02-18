import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SiteFooter } from "@/components/dashboard/site-footer";

describe("SiteFooter", () => {
  describe("content", () => {
    it("renders version and commit hash", () => {
      render(<SiteFooter />);

      expect(
        screen.getByText(`v${__APP_VERSION__} (${__APP_COMMIT__})`),
      ).toBeInTheDocument();
    });

    it("renders GitHub link with correct href", () => {
      render(<SiteFooter />);

      const link = screen.getByRole("link", { name: /view on github/i });
      expect(link).toHaveAttribute(
        "href",
        "https://github.com/comnam90/vdc-vault-readiness",
      );
    });
  });

  describe("security", () => {
    it("opens GitHub link in new tab with security attributes", () => {
      render(<SiteFooter />);

      const link = screen.getByRole("link", { name: /view on github/i });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("includes sr-only new tab warning on GitHub link", () => {
      render(<SiteFooter />);

      expect(screen.getByText("(opens in new tab)")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("renders as footer landmark", () => {
      render(<SiteFooter />);

      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    });

    it("renders icon with aria-hidden", () => {
      const { container } = render(<SiteFooter />);

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("styling", () => {
    it("has top border for visual separation", () => {
      render(<SiteFooter />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass("border-t");
    });

    it("applies fade-in animation with motion-safe prefix", () => {
      render(<SiteFooter />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toHaveClass(
        "motion-safe:animate-in",
        "motion-safe:fade-in",
      );
    });

    it("renders version in mono font", () => {
      render(<SiteFooter />);

      const version = screen.getByText(
        `v${__APP_VERSION__} (${__APP_COMMIT__})`,
      );
      expect(version).toHaveClass("font-mono");
    });
  });
});
