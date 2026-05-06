const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function startOfDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function calendarDayDelta(now: Date, then: Date): number {
  return Math.round((startOfDay(now) - startOfDay(then)) / DAY_MS);
}

export function formatRelativeTime(
  iso: string,
  now: Date = new Date(),
): string {
  const then = new Date(iso);
  const elapsed = now.getTime() - then.getTime();

  // Future timestamps (clock skew, bad data) shouldn't render as
  // "-1 days ago". Treat anything in the future as "just now".
  if (elapsed < 0) {
    return "just now";
  }

  const dayDelta = calendarDayDelta(now, then);

  if (dayDelta === 0) {
    if (elapsed < MINUTE_MS) {
      return "just now";
    }
    if (elapsed < HOUR_MS) {
      const mins = Math.floor(elapsed / MINUTE_MS);
      return `${mins} min ago`;
    }
    const hours = Math.floor(elapsed / HOUR_MS);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  if (dayDelta === 1) {
    return "yesterday";
  }

  if (dayDelta < 7) {
    return `${dayDelta} days ago`;
  }

  if (dayDelta < 35) {
    const weeks = Math.floor(dayDelta / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }

  return then.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
