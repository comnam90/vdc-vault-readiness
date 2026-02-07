import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FileUpload } from "@/components/dashboard/file-upload";

describe("FileUpload", () => {
  it("renders the drop zone with instructional text", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    expect(
      screen.getByText(/drop veeam healthcheck json here/i),
    ).toBeInTheDocument();
  });

  it("renders a file input that accepts .json files", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.accept).toBe(".json");
  });

  it("calls onFileSelected when a file is chosen via input", () => {
    const onFileSelected = vi.fn();
    render(<FileUpload onFileSelected={onFileSelected} />);

    const file = new File(['{"test": true}'], "healthcheck.json", {
      type: "application/json",
    });

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("calls onFileSelected when a file is dropped", () => {
    const onFileSelected = vi.fn();
    render(<FileUpload onFileSelected={onFileSelected} />);

    const dropZone = screen.getByTestId("drop-zone");
    const file = new File(['{"test": true}'], "healthcheck.json", {
      type: "application/json",
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("applies drag-over styling on drag enter and removes on drag leave", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    const dropZone = screen.getByTestId("drop-zone");

    fireEvent.dragOver(dropZone, {
      dataTransfer: { types: ["Files"] },
    });

    expect(dropZone.className).toMatch(/border-primary/);

    fireEvent.dragLeave(dropZone);

    expect(dropZone.className).not.toMatch(/border-primary/);
  });

  it("renders browse button text", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    expect(screen.getByText(/browse/i)).toBeInTheDocument();
  });

  it("is keyboard-focusable with role=button", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    const dropZone = screen.getByTestId("drop-zone");
    expect(dropZone).toHaveAttribute("role", "button");
    expect(dropZone).toHaveAttribute("tabindex", "0");
  });

  it("opens file dialog on Enter key", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    const dropZone = screen.getByTestId("drop-zone");
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.keyDown(dropZone, { key: "Enter" });
    expect(clickSpy).toHaveBeenCalled();
  });

  it("opens file dialog on Space key", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    const dropZone = screen.getByTestId("drop-zone");
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    fireEvent.keyDown(dropZone, { key: " " });
    expect(clickSpy).toHaveBeenCalled();
  });

  it("has hover classes for background tint and border solidification", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    const dropZone = screen.getByTestId("drop-zone");
    // When not dragging, hover classes should be present in the class list
    expect(dropZone.className).toMatch(/hover:bg-muted\/50/);
    expect(dropZone.className).toMatch(/hover:border-solid/);
  });

  it("has hover class for icon rise animation", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);

    const uploadIcon = screen
      .getByTestId("drop-zone")
      .querySelector("[data-testid='upload-icon-wrapper']");
    expect(uploadIcon).not.toBeNull();
    expect(uploadIcon!.className).toMatch(/motion-safe:group-hover\//);
  });
});
