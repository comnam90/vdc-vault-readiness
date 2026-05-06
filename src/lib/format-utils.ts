/**
 * Shared formatting utilities for numeric display across table columns
 * and detail views. Extracted to DRY up formatting logic.
 */

export function formatSize(
  gb: number | null,
): { value: string; unit: string } | null {
  if (gb === null) return null;
  if (gb >= 1024) {
    return { value: (gb / 1024).toFixed(2), unit: "TB" };
  }
  return { value: gb.toFixed(2).replace(/\.?0+$/, ""), unit: "GB" };
}

export function formatPercent(
  val: number | null,
  decimals: number = 1,
): string {
  if (val === null) return "N/A";
  return `${val.toFixed(decimals)}%`;
}

export function formatDuration(str: string | null): string {
  if (str === null) return "N/A";

  // Veeam format: DD.HH:MM:SS
  const match = str.match(/^(\d+)\.(\d+):(\d+):(\d+)$/);
  if (!match) return "N/A";

  const days = parseInt(match[1], 10);
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3], 10);
  const seconds = parseInt(match[4], 10);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function formatTB(val: number | null): string {
  if (val === null) return "N/A";
  return `${val.toFixed(2)} TB`;
}

export function formatTooltipTB(v: number | undefined): [string, string] | [] {
  return v != null ? [`${v.toFixed(2)} TB`, "Source"] : [];
}

export function formatDays(val: number | null): string {
  if (val === null) return "N/A";
  return `${val} days`;
}

export function formatGFS(
  weekly: number | null,
  monthly: number | null,
  yearly: number | null,
): string {
  const parts = [];
  if (weekly !== null) parts.push(`Weekly: ${weekly}`);
  if (monthly !== null) parts.push(`Monthly: ${monthly}`);
  if (yearly !== null) parts.push(`Yearly: ${yearly}`);
  return parts.length > 0 ? parts.join(", ") : "None configured";
}

export function formatCompressionRatio(
  sourceGB: number | null,
  diskGB: number | null,
): string {
  if (sourceGB === null || diskGB === null) return "N/A";
  if (sourceGB === 0 || diskGB === 0) return "N/A";
  return `${(sourceGB / diskGB).toFixed(1)}x`;
}
