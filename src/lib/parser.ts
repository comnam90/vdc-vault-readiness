/**
 * Section structure from Veeam Healthcheck JSON.
 * Contains Headers array and Rows array that need to be zipped together.
 */
export interface Section {
  Headers: string[];
  Rows: (string | null)[][];
}

/**
 * Transforms a Veeam Healthcheck section from Headers/Rows format
 * to an array of objects where each header becomes a key.
 *
 * @example
 * Input:  { Headers: ["Name", "Encrypted"], Rows: [["Job A", "False"]] }
 * Output: [{ Name: "Job A", Encrypted: "False" }]
 *
 * @param section - The section containing Headers and Rows arrays
 * @returns Array of objects with headers as keys and row values as values
 */
export function zipSection(
  section: Section | null | undefined,
): Record<string, string | null | undefined>[] {
  if (!section) {
    return [];
  }

  const { Headers, Rows } = section;

  if (!Rows || Rows.length === 0) {
    return [];
  }

  return Rows.map((row) => {
    const obj: Record<string, string | null | undefined> = {};

    Headers.forEach((header, index) => {
      obj[header] = row[index];
    });

    return obj;
  });
}
