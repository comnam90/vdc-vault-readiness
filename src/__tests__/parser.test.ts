import { describe, it, expect } from "vitest";
import { zipSection } from "@/lib/parser";

/**
 * Tests for zipSection utility.
 * Transforms Headers/Rows format to array of objects.
 */
describe("zipSection", () => {
  describe("happy path", () => {
    it("should zip headers and single row into object", () => {
      const section = {
        Headers: ["Name", "Encrypted"],
        Rows: [["Job A", "False"]],
      };

      const result = zipSection(section);

      expect(result).toEqual([{ Name: "Job A", Encrypted: "False" }]);
    });

    it("should zip headers and multiple rows into array of objects", () => {
      const section = {
        Headers: ["Name", "Version", "Status"],
        Rows: [
          ["Server_1", "13.0.1.1071", "Active"],
          ["Server_2", "12.1.2.0", "Inactive"],
        ],
      };

      const result = zipSection(section);

      expect(result).toEqual([
        { Name: "Server_1", Version: "13.0.1.1071", Status: "Active" },
        { Name: "Server_2", Version: "12.1.2.0", Status: "Inactive" },
      ]);
    });

    it("should handle null values in rows", () => {
      const section = {
        Headers: ["Name", "DbType", "DbHost"],
        Rows: [["Server_1", null, "Server_3"]],
      };

      const result = zipSection(section);

      expect(result).toEqual([
        { Name: "Server_1", DbType: null, DbHost: "Server_3" },
      ]);
    });
  });

  describe("empty data", () => {
    it("should return empty array when rows are empty", () => {
      const section = {
        Headers: ["Name", "Encrypted"],
        Rows: [],
      };

      const result = zipSection(section);

      expect(result).toEqual([]);
    });

    it("should return empty array when headers are empty", () => {
      const section = {
        Headers: [],
        Rows: [["value1", "value2"]],
      };

      const result = zipSection(section);

      expect(result).toEqual([{}]);
    });

    it("should return empty array when section is null", () => {
      const result = zipSection(null);

      expect(result).toEqual([]);
    });

    it("should return empty array when section is undefined", () => {
      const result = zipSection(undefined);

      expect(result).toEqual([]);
    });
  });

  describe("mismatched lengths", () => {
    it("should ignore extra columns when row has more values than headers", () => {
      const section = {
        Headers: ["Name", "Status"],
        Rows: [["Job A", "Active", "ExtraValue", "AnotherExtra"]],
      };

      const result = zipSection(section);

      expect(result).toEqual([{ Name: "Job A", Status: "Active" }]);
    });

    it("should use undefined for missing values when row has fewer values than headers", () => {
      const section = {
        Headers: ["Name", "Status", "Version"],
        Rows: [["Job A"]],
      };

      const result = zipSection(section);

      expect(result).toEqual([
        { Name: "Job A", Status: undefined, Version: undefined },
      ]);
    });
  });

  describe("type safety", () => {
    it("should preserve string types in values", () => {
      const section = {
        Headers: ["Count"],
        Rows: [["42"]],
      };

      const result = zipSection(section);

      expect(result[0].Count).toBe("42");
      expect(typeof result[0].Count).toBe("string");
    });

    it("should preserve boolean-like strings as strings", () => {
      const section = {
        Headers: ["Enabled"],
        Rows: [["True"]],
      };

      const result = zipSection(section);

      expect(result[0].Enabled).toBe("True");
      expect(typeof result[0].Enabled).toBe("string");
    });
  });
});
