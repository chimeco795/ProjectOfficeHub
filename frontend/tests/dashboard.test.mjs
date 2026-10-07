import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
async function model(file) {const js=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));}
const {arrange,defaultLayout,overlaps,restoreLayout}=await model('../src/modules/projects/dashboardModel.ts');
const {timelineTicks}=await model('../src/modules/planning/timelineModel.ts');
const {roadmapLabel,planningViews}=await model('../src/modules/planning/methodology.ts');
test('moving and resizing widgets preserves all widgets and prevents overlap',()=>{
 const before=defaultLayout();const after=arrange(before,{...before[0],x:7,y:2,w:8,h:6});
 assert.equal(after.length,8);assert.deepEqual(before,defaultLayout());assert.equal(after[0].x,4);
 for(let i=0;i<after.length;i++)for(let j=i+1;j<after.length;j++)assert.equal(overlaps(after[i],after[j]),false);
 const reduced=arrange(after,{...after[4],x:-10,w:1,h:1,y:-2});assert.equal(reduced[4].w,4);assert.equal(reduced[4].h,4);assert.equal(reduced[4].x,0);
});
test('restore repairs invalid layouts, hidden widgets and collisions',()=>{
 assert.deepEqual(restoreLayout(null),defaultLayout());
 const rows=defaultLayout();rows[0].visible=false;rows[1].x=0;rows[2].x=0;
 const restored=restoreLayout(rows);assert.equal(restored[0].visible,false);
 for(let i=0;i<restored.length;i++)for(let j=i+1;j<restored.length;j++)assert.equal(overlaps(restored[i],restored[j]),false);
 assert.equal(restoreLayout([{id:'attention',x:NaN,y:0,w:0,h:0,visible:true}]).length,8);
});
test('calendar zoom aligns month and quarter boundaries across years',()=>{
 const start=Date.parse('2026-11-12'),end=Date.parse('2027-04-02');
 assert.deepEqual(timelineTicks(start,end,'quarter'),['2027-01-01','2027-04-01']);
 assert.deepEqual(timelineTicks(start,Date.parse('2027-01-04'),'month'),['2026-12-01','2027-01-01']);
 assert.equal(timelineTicks(Date.parse('2026-10-07'),Date.parse('2026-10-14'),'week')[0],'2026-10-12');
});
test('methodology has distinct planning priorities and exact roadmap labels',()=>{
 assert.equal(roadmapLabel('Agile'),'Sprints y releases');assert.equal(roadmapLabel('Hybrid'),'Iteraciones y entregas');assert.equal(roadmapLabel('Waterfall'),'Fases y entregables');
 assert.equal(planningViews('Waterfall')[0][0],'gantt');assert.equal(planningViews('Agile')[0][0],'board');assert.ok(!planningViews('Waterfall').flat().join(' ').includes('Sprint'));
});
