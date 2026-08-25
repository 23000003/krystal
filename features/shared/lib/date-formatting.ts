/** "Today" / "Yesterday" / "12 Aug 2026" — the heading each group sits under. */
export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const days = Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / 86_400_000,
  );

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ex. "12:34 PM"
export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
