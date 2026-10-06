import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync(new URL('../src/modules/planning/workPresentation.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {allowedTypes,hierarchy,stateClass}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('methodology type lists avoid unsupported new work and preserve a unique hybrid union',()=>{
 assert.ok(allowedTypes('Agile').includes('Bug'));
 assert.ok(!allowedTypes('Agile').includes('Phase'));
 assert.ok(allowedTypes('Waterfall').includes('Deliverable'));
 assert.ok(!allowedTypes('Waterfall').includes('UserStory'));
 assert.deepEqual(new Set(allowedTypes('Hybrid')),new Set([...allowedTypes('Agile'),...allowedTypes('Waterfall')]));
 assert.equal(allowedTypes('Hybrid').length,new Set(allowedTypes('Hybrid')).size);
});
test('hierarchy puts parents before descendants and retains depth through filtered ancestors',()=>{
 const all=[{id:'task',parent_id:'story'},{id:'feature',parent_id:'epic'},{id:'epic',parent_id:null},{id:'story',parent_id:'feature'}];
 const before=JSON.stringify(all);
 assert.deepEqual(hierarchy(all,all).map(r=>[r.item.id,r.depth]),[['epic',0],['feature',1],['story',2],['task',3]]);
 assert.equal(hierarchy([all[0]],all)[0].depth,3);
 assert.equal(JSON.stringify(all),before);
});
test('legacy missing parents and cycles remain displayable and unknown status is neutral',()=>{
 const all=[{id:'a',parent_id:'b'},{id:'b',parent_id:'a'},{id:'c',parent_id:'missing'}];
 assert.equal(hierarchy(all,all).length,3);
 assert.equal(hierarchy([all[2]],all)[0].depth,0);
 assert.equal(stateClass('Active'),'state-active');
 assert.equal(stateClass('Legacy'),'state-new');
 assert.equal(stateClass('constructor'),'state-new');
});
