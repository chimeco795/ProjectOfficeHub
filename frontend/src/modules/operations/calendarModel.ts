export const dateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function calendarDays(
  anchor: string,
  mode: "month" | "week" | "day",
): string[] {
  const date = new Date(anchor + "T12:00:00");
  if (mode === "day") return [dateKey(date)];
  if (mode === "month") date.setDate(1);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return Array.from({ length: mode === "month" ? 42 : 7 }, (_, index) => {
    const day = new Date(date);
    day.setDate(date.getDate() + index);
    return dateKey(day);
  });
}
export function shiftCalendar(
  anchor: string,
  mode: "month" | "week" | "day",
  direction: number,
): string {
  const date = new Date(anchor + "T12:00:00");
  if (mode === "month") {
    date.setDate(1);
    date.setMonth(date.getMonth() + direction);
  } else date.setDate(date.getDate() + direction * (mode === "week" ? 7 : 1));
  return dateKey(date);
}
