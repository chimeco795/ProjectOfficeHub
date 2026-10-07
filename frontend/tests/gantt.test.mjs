import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync(new URL('../src/modules/planning/ganttModel.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {visibleHierarchy,ganttPosition}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('collapse hides all descendants even when an intermediate parent is filtered',()=>{
  const rows=[{id:'epic',parent_id:null},{id:'feature',parent_id:'epic'},{id:'story',parent_id:'feature'},{id:'task',parent_id:'story'},{id:'other',parent_id:null}];
  assert.deepEqual(visibleHierarchy(rows,rows,new Set(['epic'])).map(i=>i.id),['epic','other']);
  assert.deepEqual(visibleHierarchy([rows[3],rows[4]],rows,new Set(['feature'])).map(i=>i.id),['other']);
  assert.equal(visibleHierarchy(rows,rows,new Set()).length,5);
  assert.equal(rows.length,5);
});
test('timeline dates span year boundaries without timezone offsets',()=>{
  const start=Date.parse('2026-12-31');
  assert.equal(ganttPosition('2027-01-01',start,86400000*4),25);
  assert.equal(ganttPosition('2026-12-31',start,86400000*4),0);
});
