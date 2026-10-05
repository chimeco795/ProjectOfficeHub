import type { Detail, Project } from "../../types";
import type { Point } from "../../ProgressChart";

export const percentage = (value: unknown): number | null =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 100
    ? value
    : null;

export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const stamp = Date.parse(value + "T12:00:00Z");
  return (
    Number.isFinite(stamp) &&
    new Date(stamp).toISOString().slice(0, 10) === value
  );
}

export function chartPoints(points: Point[]): Point[] {
  return points
    .filter((p) => validDate(p.date))
    .map((p) => ({
      ...p,
      planned: percentage(p.planned),
      actual: percentage(p.actual),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function reportModel(
  detail: Detail,
  project: Project,
  history: Point[],
  preview = false,
) {
  const locked = detail.cut.status === "publicado";
  const rows = detail.records.filter(
    (r) =>
      r.review === "aceptado" ||
      (!locked && preview && ["pendiente", "dudoso"].includes(r.review)),
  );
  const planned = percentage(detail.cut.metadata.planned);
  const actual = percentage(detail.cut.metadata.actual);
  return {
    // Published fields must never fall back to the current project.
    shown: locked ? detail.cut.project_snapshot : project,
    rows,
    planned,
    actual,
    variance:
      planned === null || actual === null
        ? null
        : Math.round((actual - planned) * 100) / 100,
    official: chartPoints(
      history.filter(
        (p) =>
          p.date <= detail.cut.report_date &&
          (p.status === "publicado" ||
            (!locked && p.date === detail.cut.report_date)),
      ),
    ),
  };
}
