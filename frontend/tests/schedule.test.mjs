import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const js = ts.transpileModule(
  readFileSync(
    new URL("../src/modules/planning/scheduleModel.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  },
).outputText;
const { analyzeSchedule } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const work = (id, values = {}) => ({
  id,
  code: id,
  name: id,
  start_date: "2026-10-01",
  target_date: "2026-10-05",
  dependencies: [],
  archived: false,
  status: "Active",
  ...values,
});
test("dependency conflicts use all predecessors and preserve input dates", () => {
  const rows = [
    work("A"),
    work("B", { target_date: "2026-10-09" }),
    work("C", {
      dependencies: ["A", "B"],
      start_date: "2026-10-06",
      target_date: "2026-10-12",
    }),
  ];
  const before = JSON.stringify(rows);
  const result = analyzeSchedule(rows, "2026-10-05");
  assert.equal(result[2].earliest, "2026-10-10");
  assert.deepEqual(result[2].warnings, ["Inicio anterior al fin de B"]);
  assert.equal(JSON.stringify(rows), before);
});
test("same-day dependency is flagged, following day is compatible across year", () => {
  const a = work("A", { start_date: "2026-12-31", target_date: "2026-12-31" });
  assert.ok(
    analyzeSchedule(
      [
        a,
        work("B", {
          dependencies: ["A"],
          start_date: "2026-12-31",
          target_date: "2027-01-02",
        }),
      ],
      "2026-12-30",
    )[1].warnings.length,
  );
  const b = work("B", {
    dependencies: ["A"],
    start_date: "2027-01-01",
    target_date: "2027-01-02",
  });
  assert.deepEqual(analyzeSchedule([a, b], "2026-12-30")[1].warnings, []);
});
test("missing and archived predecessors are explicit, archived work excluded", () => {
  const rows = [
    work("A", { archived: true }),
    work("B", { target_date: null }),
    work("C", { dependencies: ["A", "B", "missing"] }),
  ];
  const result = analyzeSchedule(rows, "2026-10-01");
  assert.equal(result.length, 2);
  assert.ok(result[1].warnings.includes("Predecesor archivado: A"));
  assert.ok(result[1].warnings.includes("Predecesor sin compromiso: B"));
  assert.ok(result[1].warnings.includes("Predecesor no disponible"));
});
test("completed work is not overdue; due today remains on time", () => {
  assert.equal(
    analyzeSchedule([work("A")], "2026-10-05")[0].warnings.length,
    0,
  );
  assert.ok(
    analyzeSchedule([work("A")], "2026-10-06")[0].warnings.includes(
      "Compromiso vencido",
    ),
  );
  for (const status of ["Closed", "Resolved", "Removed", "Cerrado"])
    assert.equal(
      analyzeSchedule([work("A", { status })], "2026-10-06")[0].warnings.length,
      0,
    );
});
