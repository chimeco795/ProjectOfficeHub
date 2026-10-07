import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync(new URL('../src/components/choiceModel.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {personChoices,matchingChoices}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('predictive people search includes email, accents and excludes selected identities',()=>{
  const options=personChoices([{id:'a',name:'Sara García Ruiz',email:'sara@example.test'},{id:'b',name:'Luis López',email:'QA@example.test'}]);
  assert.deepEqual(matchingChoices(options,[],'garcia').map(o=>o.value),['a']);
  assert.deepEqual(matchingChoices(options,[],'qa@example').map(o=>o.value),['b']);
  assert.deepEqual(matchingChoices(options,['a'],'sara'),[]);
});
test('empty query never opens a directory and broad queries are bounded',()=>{
  const options=personChoices(Array.from({length:50},(_,n)=>({id:String(n),name:'Persona '+n})));
  assert.deepEqual(matchingChoices(options,[],' '),[]);
  assert.equal(matchingChoices(options,[],'persona').length,8);
  assert.equal(matchingChoices(options,[],'Persona 49')[0].value,'49');
});
