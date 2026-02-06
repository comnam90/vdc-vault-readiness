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

    expect(
      screen.getByText(/browse/i),
    ).toBeInTheDocument();
  });
});
