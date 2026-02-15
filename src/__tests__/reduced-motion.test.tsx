import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { BlockersList } from "@/components/dashboard/blockers-list";
import { FileUpload } from "@/components/dashboard/file-upload";
import { SuccessCelebration } from "@/components/dashboard/success-celebration";
import { ChecklistLoader } from "@/components/dashboard/checklist-loader";
import { SiteFooter } from "@/components/dashboard/site-footer";
import { MOCK_DATA, ALL_PASS_VALIDATIONS, FAIL_RESULT } from "./fixtures";

describe("prefers-reduced-motion accessibility", () => {
  describe("DashboardView", () => {
    it("uses motion-safe prefix for entrance animations", () => {
      const { container } = render(
        <DashboardView
          data={MOCK_DATA}
          validations={ALL_PASS_VALIDATIONS}
          onReset={() => {}}
        />,
      );

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer.className).toMatch(/motion-safe:animate-in/);
      expect(mainContainer.className).toMatch(/motion-safe:fade-in/);
      expect(mainContainer.className).toMatch(
        /motion-safe:slide-in-from-bottom/,
      );
    });

    it("uses motion-safe prefix for card animations", () => {
      const { container } = render(
        <DashboardView
          data={MOCK_DATA}
          validations={ALL_PASS_VALIDATIONS}
          onReset={() => {}}
        />,
      );

      const cards = container.querySelectorAll("[data-slot='card']");
      expect(cards.length).toBeGreaterThan(0);
      expect(cards[0].className).toMatch(/motion-safe:animate-in/);
      expect(cards[0].className).toMatch(/motion-safe:fade-in/);
    });
  });

  describe("BlockersList", () => {
    it("uses motion-safe prefix for alert animations", () => {
      render(<BlockersList blockers={[FAIL_RESULT]} />);

      const alert = screen.getByRole("alert");
      expect(alert.className).toMatch(/motion-safe:animate-in/);
      expect(alert.className).toMatch(/motion-safe:fade-in/);
    });

    it("uses motion-safe prefix for attention-pulse animation", () => {
      render(<BlockersList blockers={[FAIL_RESULT]} />);

      const alert = screen.getByRole("alert");
      expect(alert.className).toMatch(/motion-safe:animate-attention-pulse/);
    });
  });

  describe("SuccessCelebration", () => {
    it("uses motion-safe prefix for card entrance animation", () => {
      const { container } = render(
        <SuccessCelebration checksCount={6} onViewDetails={() => {}} />,
      );

      const card = container.querySelector("[data-slot='card']");
      expect(card?.className).toMatch(/motion-safe:animate-in/);
      expect(card?.className).toMatch(/motion-safe:fade-in/);
    });

    it("uses motion-safe prefix for success-ring animation", () => {
      render(<SuccessCelebration checksCount={6} onViewDetails={() => {}} />);

      const iconContainer = screen.getByTestId("success-icon-container");
      expect(iconContainer.className).toMatch(
        /motion-safe:animate-success-ring/,
      );
    });

    it("uses motion-safe prefix for staggered text animations", () => {
      render(<SuccessCelebration checksCount={6} onViewDetails={() => {}} />);

      const heading = screen.getByRole("heading", {
        name: /all systems ready/i,
      });
      expect(heading.className).toMatch(/motion-safe:animate-in/);
      expect(heading.className).toMatch(/motion-safe:fade-in/);
    });
  });

  describe("ChecklistLoader", () => {
    it("uses motion-safe prefix for container animation", () => {
      render(<ChecklistLoader completedSteps={[]} currentStep="parse" />);

      const loader = screen.getByTestId("checklist-loader");
      expect(loader.className).toMatch(/motion-safe:animate-in/);
      expect(loader.className).toMatch(/motion-safe:fade-in/);
    });

    it("uses motion-safe prefix for spinner animation", () => {
      const { container } = render(
        <ChecklistLoader completedSteps={[]} currentStep="parse" />,
      );

      const spinner = container.querySelector(
        "[class*='motion-safe:animate-spin']",
      );
      expect(spinner).not.toBeNull();
    });
  });

  describe("FileUpload", () => {
    it("uses motion-safe prefix for hover transform animations", () => {
      render(<FileUpload onFileSelected={() => {}} />);

      const uploadIcon = screen
        .getByTestId("drop-zone")
        .querySelector("[data-testid='upload-icon-wrapper']");
      expect(uploadIcon).not.toBeNull();
      expect(uploadIcon?.className).toMatch(/motion-safe:.*-translate-y/);
    });
  });

  describe("SiteFooter", () => {
    it("uses motion-safe prefix for fade-in animation", () => {
      render(<SiteFooter />);

      const footer = screen.getByRole("contentinfo");
      expect(footer.className).toMatch(/motion-safe:animate-in/);
      expect(footer.className).toMatch(/motion-safe:fade-in/);
    });
  });
});
