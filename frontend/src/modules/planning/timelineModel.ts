export type Zoom = "day" | "week" | "month" | "quarter";
export const pixelsPerDay: Record<Zoom, number> = {
  day: 36,
  week: 12,
  month: 4,
  quarter: 1.5,
};
export function timelineTicks(
  start: number,
  end: number,
  zoom: Zoom,
): string[] {
  const date = new Date(start),
    ticks: string[] = [];
  if (zoom === "week")
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  if (zoom === "month" || zoom === "quarter") {
    date.setUTCDate(1);
    if (zoom === "quarter")
      date.setUTCMonth(Math.floor(date.getUTCMonth() / 3) * 3);
  }
  while (date.getTime() <= end && ticks.length < 1000) {
    if (date.getTime() >= start) ticks.push(date.toISOString().slice(0, 10));
    if (zoom === "month" || zoom === "quarter")
      date.setUTCMonth(date.getUTCMonth() + (zoom === "month" ? 1 : 3));
    else date.setUTCDate(date.getUTCDate() + (zoom === "week" ? 7 : 1));
  }
  return ticks;
}
