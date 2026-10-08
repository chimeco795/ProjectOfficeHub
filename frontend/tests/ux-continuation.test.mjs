import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function data(file) {return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace('./workPresentation',dataPresentation)).toString('base64');}
const dataPresentation='data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync(new URL('../src/modules/planning/workPresentation.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');
const {restoreColumns,reorderColumn}=await import(data('../src/modules/planning/columnModel.ts'));
const {deliveryGroups}=await import(data('../src/modules/planning/deliveryModel.ts'));
const {reorderSibling,restoreOrder}=await import(data('../src/modules/planning/orderModel.ts'));
test('visual order preserves sibling boundaries and restores missing/new work safely',()=>{
 const items=[{id:'a',parent_id:null},{id:'b',parent_id:'a'},{id:'c',parent_id:null}];
 assert.deepEqual(reorderSibling(items,'b','c'),items);
 assert.deepEqual(reorderSibling(items,'c','a').map(i=>i.id),['c','a','b']);
 assert.deepEqual(restoreOrder(items,['c','c','bad']).map(i=>i.id),['c','a','b']);
});
test('column preferences repair duplicates and old selections, preserve order and enforce limits',()=>{
 assert.deepEqual(restoreColumns(['Blocked','New','Blocked','Active','Closed','Prepared','bad']),['Blocked','New','Active','Closed']);
 assert.deepEqual(restoreColumns([]),['New','Prepared','Active','Blocked']);
 assert.deepEqual(reorderColumn(['New','Active'],'Active',-1),['Active','New']);
 assert.deepEqual(reorderColumn(['New'],'New',-1),['New']);
});
test('delivery groups derive current teams without duplicating work or accepting expired membership',()=>{
 const items=[{id:'a',owner_id:'p',parent_id:null,work_type:'Task',code:'A',name:'A'}];
 const memberships=[{person_id:'p',team_id:'old',archived:false,valid_from:null,valid_to:'2026-10-01'},{person_id:'p',team_id:'current',archived:false,valid_from:'2026-10-02',valid_to:null}];
 assert.equal(deliveryGroups(items,items,'team',[{id:'current',name:'Equipo'}],memberships,'2026-10-08')[0].id,'current');
 const groups=deliveryGroups(items,items,'team',[],[...memberships,{...memberships[1],team_id:'other'}],'2026-10-08');
 assert.equal(groups[0].id,'multiple');assert.equal(groups[0].items.length,1);
});
test('delivery hierarchy reaches the owning Epic through intermediate tasks and handles cycles',()=>{
 const epic={id:'e',owner_id:null,parent_id:null,work_type:'Epic',code:'E',name:'Epic'};
 const story={...epic,id:'s',parent_id:'e',work_type:'UserStory'};
 const task={...epic,id:'t',parent_id:'s',work_type:'Task'};
 assert.equal(deliveryGroups([task],[epic,story,task],'parent',[],[],'2026-10-08')[0].id,'e');
 assert.equal(deliveryGroups([task],[{...story,parent_id:'t'},task],'parent',[],[],'2026-10-08').length,1);
});
