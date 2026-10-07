import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(
  new URL("../src/modules/executive/exportReport.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;
const { fitPage } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
test("export fits wide and tall reports inside one page without distortion", () => {
  for (const [w, h] of [
    [1536, 1024],
    [600, 1800],
    [2400, 400],
  ]) {
    const box = fitPage(w, h, 420, 297);
    assert.ok(box.x >= 8 - 1e-9 && box.y >= 8 - 1e-9);
    assert.ok(
      box.x + box.width <= 412 + 1e-9 && box.y + box.height <= 289 + 1e-9,
    );
    assert.ok(Math.abs(box.width / box.height - w / h) < 1e-9);
  }
});
