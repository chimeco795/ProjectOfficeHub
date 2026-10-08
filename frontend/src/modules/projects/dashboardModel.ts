export type WidgetLayout = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
};
export const widgetIds = [
  "active",
  "closed",
  "overdue",
  "blocked",
  "attention",
  "executive",
  "objective",
  "operation",
];
export const defaultLayout = (): WidgetLayout[] =>
  widgetIds.map((id, i) => ({
    id,
    x: i < 4 ? i * 3 : i % 2 ? 8 : 0,
    y: i < 4 ? 0 : i < 6 ? 2 : 7,
    w: i < 4 ? 3 : i % 2 ? 4 : 8,
    h: i < 4 ? 2 : i === 6 ? 6 : 5,
    visible: true,
  }));
export const overlaps = (a: WidgetLayout, b: WidgetLayout) =>
  a.visible &&
  b.visible &&
  a.x < b.x + b.w &&
  b.x < a.x + a.w &&
  a.y < b.y + b.h &&
  b.y < a.y + a.h;
export function widgetBounds(id: string) {
  if (widgetIds.indexOf(id) < 4) return { minW: 2, maxW: 6, minH: 2, maxH: 4 };
  if (id === 'attention') return { minW: 4, maxW: 12, minH: 5, maxH: 10 };
  if (id === 'objective') return { minW: 4, maxW: 12, minH: 6, maxH: 10 };
  return { minW: 4, maxW: 12, minH: 5, maxH: 8 };
}
export function arrange(
  layout: WidgetLayout[],
  change: WidgetLayout,
): WidgetLayout[] {
  const bounds = widgetBounds(change.id);
  const fixed = {
    ...change,
    w: Math.min(bounds.maxW, Math.max(bounds.minW, Math.round(change.w))),
    h: Math.min(bounds.maxH, Math.max(bounds.minH, Math.round(change.h))),
    y: Math.min(500, Math.max(0, Math.round(change.y))),
  };
  fixed.x = Math.max(0, Math.min(12 - fixed.w, Math.round(change.x)));
  const placed = [fixed];
  for (const original of layout.filter((i) => i.id !== fixed.id)) {
    const next = { ...original };
    while (next.visible && placed.some((i) => overlaps(next, i))) next.y++;
    placed.push(next);
  }
  return layout.map((i) => placed.find((p) => p.id === i.id)!);
}
export function restoreLayout(raw: unknown): WidgetLayout[] {
  const defaults = defaultLayout();
  if (!Array.isArray(raw)) return defaults;
  let result = defaults.map((d) => {
    const value = raw.find((v) => v?.id === d.id);
    return value &&
      [value.x, value.y, value.w, value.h].every(Number.isFinite) &&
      value.x >= 0 &&
      value.x < 12 &&
      value.y >= 0 &&
      value.y <= 500 &&
      value.w > 0 &&
      value.w <= 12 &&
      value.h > 0 &&
      value.h <= 50 &&
      typeof value.visible === "boolean"
      ? { ...d, ...value }
      : d;
  });
  for (const item of result) result = arrange(result, item);
  return result;
}
