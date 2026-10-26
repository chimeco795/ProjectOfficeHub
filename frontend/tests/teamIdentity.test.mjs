import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/modules/operations/teamIdentityModel.ts',import.meta.url),'utf8');
const {teamLabel}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64'));
test('team identity does not depend on catalog ordering or color',()=>{
 const sre={id:'b',code:'SRE',shape:'diamond',color:'#246b58',name:'Platform'};
 const teams=[{id:'a',code:'MT1',shape:'circle',name:'Other'},sre];
 assert.equal(teamLabel(sre),'SRE ◆ · Platform');
 assert.equal(teamLabel([...teams].reverse().find(t=>t.id==='b')),teamLabel(sre));
 assert.equal(teamLabel({...sre,color:'#365baa'}),teamLabel(sre));
});
