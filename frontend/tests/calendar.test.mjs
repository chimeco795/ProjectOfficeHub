import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(
  new URL("../src/modules/operations/calendarModel.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const { calendarDays, shiftCalendar, dateKey } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
test("month includes leap day and starts on Monday without duplicate dates", () => {
  const days = calendarDays("2024-02-29", "month");
  assert.equal(days.length, 42);
  assert.equal(days[0], "2024-01-29");
  assert.ok(days.includes("2024-02-29"));
  assert.equal(new Set(days).size, 42);
});
test("weeks cross year boundaries and day does not shift", () => {
  assert.deepEqual(calendarDays("2027-01-01", "week"), [
    "2026-12-28",
    "2026-12-29",
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
    "2027-01-03",
  ]);
  assert.deepEqual(calendarDays("2026-10-05", "day"), ["2026-10-05"]);
});
test("month navigation from month end does not skip February", () => {
  assert.equal(shiftCalendar("2026-01-31", "month", 1), "2026-02-01");
  assert.equal(shiftCalendar("2026-01-01", "month", -1), "2025-12-01");
  assert.equal(shiftCalendar("2026-12-31", "day", 1), "2027-01-01");
  assert.equal(shiftCalendar("2026-10-05", "week", 1), "2026-10-12");
  assert.equal(dateKey(new Date(2026, 9, 5, 23, 59)), "2026-10-05");
});
