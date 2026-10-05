import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/modules/executive/reportModel.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const { reportModel, chartPoints, percentage, validDate } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const project = {
  id: "p",
  name: "Nombre actual",
  go_live: "2027-01-01",
  description: "Descripción actual",
};
const detail = (status = "borrador") => ({
  cut: {
    id: "c",
    status,
    report_date: "2026-10-02",
    metadata: { planned: 0, actual: 10 },
    project_snapshot: { name: "Nombre histórico" },
  },
  records: [
    {
      id: "a",
      review: "aceptado",
      section: "riesgos",
      current: { status: "Rojo" },
    },
    {
      id: "b",
      review: "pendiente",
      section: "avance",
      current: { planned: 99, actual: 98 },
    },
    { id: "c", review: "dudoso", section: "hitos", current: {} },
    { id: "d", review: "eliminado", section: "actividades", current: {} },
  ],
});

test("published model uses only the snapshot, never current missing fields", () => {
  const result = reportModel(detail("publicado"), project, [], true);
  assert.equal(result.shown.name, "Nombre histórico");
  assert.equal(result.shown.go_live, undefined);
  assert.deepEqual(
    result.rows.map((r) => r.id),
    ["a"],
  );
  assert.deepEqual(
    reportModel(detail("publicado"), { ...project, name: "Otro" }, [], true),
    result,
  );
});
test("draft review is opt in and never admits deleted rows", () => {
  assert.deepEqual(
    reportModel(detail(), project, []).rows.map((r) => r.id),
    ["a"],
  );
  assert.deepEqual(
    reportModel(detail(), project, [], true).rows.map((r) => r.id),
    ["a", "b", "c"],
  );
});
test("zero is a valid official figure; imported rows do not override indicators", () => {
  const result = reportModel(detail(), project, [], true);
  assert.equal(result.planned, 0);
  assert.equal(result.actual, 10);
  assert.equal(result.variance, 10);
  const missing = detail();
  missing.cut.metadata = { actual: 0 };
  assert.equal(reportModel(missing, project, []).variance, null);
});
test("official series excludes other drafts and future dates, keeps current draft", () => {
  const history = [
    { date: "2026-09-18", planned: 20, actual: 10, status: "publicado" },
    { date: "2026-09-25", planned: 40, actual: 30, status: "borrador" },
    { date: "2026-10-02", planned: null, actual: 0, status: "borrador" },
    { date: "2026-10-09", planned: 100, actual: 100, status: "publicado" },
  ];
  assert.deepEqual(
    reportModel(detail(), project, history).official.map((p) => p.date),
    ["2026-09-18", "2026-10-02"],
  );
  assert.deepEqual(
    reportModel(detail("publicado"), project, history).official.map(
      (p) => p.date,
    ),
    ["2026-09-18"],
  );
});
test("chart filters impossible dates, sorts points and retains null gaps", () => {
  const rows = chartPoints([
    { date: "2026-10-02", planned: NaN, actual: 0 },
    { date: "2026-02-30", planned: 50, actual: 60 },
    { date: "2026-09-01", planned: 101, actual: null },
  ]);
  assert.deepEqual(rows, [
    { date: "2026-09-01", planned: null, actual: null },
    { date: "2026-10-02", planned: null, actual: 0 },
  ]);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2025-02-29"), false);
});
test("missing or out of range indicators remain missing", () => {
  for (const value of [undefined, null, "", false, "0", -1, 101, Infinity, NaN])
    assert.equal(percentage(value), null);
  assert.equal(percentage(100), 100);
});
