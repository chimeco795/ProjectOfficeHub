import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/modules/operations/teamRoleModel.ts',import.meta.url),'utf8');
const {multiTeamRoles}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64'));
test('multi-team management follows explicit capability ancestors, not descendants or unrelated titles',()=>{
 const roles=[{id:'director',name:'Dirección',reports_to:null},{id:'lead',name:'Anything',manages_multiple_teams:true,reports_to:'director'},{id:'analyst',name:'Analista',reports_to:'lead'},{id:'other',name:'Director externo',reports_to:null}];
 assert.deepEqual([...multiTeamRoles(roles)],['lead','director']);
 assert.deepEqual([...multiTeamRoles(roles.map(r=>r.id==='lead'?{...r,name:'Tech_Lead'}:r))],['lead','director']);
 assert.equal(multiTeamRoles([{id:'x',name:'TechLead',reports_to:null}]).size,0);
});
test('management hierarchy tolerates missing parents, cycles and archived roles',()=>{
 assert.deepEqual([...multiTeamRoles([{id:'lead',name:'Anything',manages_multiple_teams:true,reports_to:'missing'}])],['lead']);
 assert.deepEqual([...multiTeamRoles([{id:'lead',name:'Anything',manages_multiple_teams:true,reports_to:'parent'},{id:'parent',name:'Superior',reports_to:'lead',archived:true}])],['lead']);
});
