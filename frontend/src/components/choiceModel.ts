export type Choice = {value:string;label:string;detail?:string;keywords?:string;person?:boolean};
export const personChoices=(people:{id:string;name:string;email?:string|null}[]):Choice[]=>people.map(p=>({value:p.id,label:p.name,detail:p.email||undefined,keywords:p.email||'',person:true}));
const normalize=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
export function matchingChoices(options:Choice[],selected:string[],query:string):Choice[] {
  const needle=normalize(query.trim());
  if(!needle)return [];
  return options.filter(o=>!selected.includes(o.value) && normalize(o.label+' '+(o.keywords||'')).includes(needle)).slice(0,8);
}
