/**
 * Smoke test to verify Vitest setup is working correctly.
 * Delete this file once real tests are in place.
 */
describe("Vitest Setup", () => {
  it("should have globals working (describe, it, expect)", () => {
    expect(true).toBe(true);
  });

  it("should have jest-dom matchers available", () => {
    const div = document.createElement("div");
    div.textContent = "Hello";
    document.body.appendChild(div);

    expect(div).toBeInTheDocument();
    expect(div).toHaveTextContent("Hello");

    document.body.removeChild(div);
  });
});
