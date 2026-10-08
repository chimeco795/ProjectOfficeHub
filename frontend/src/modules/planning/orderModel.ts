export function reorderSibling<T extends {id:string;parent_id:string|null}>(items:T[], source:string, target:string):T[] {
  const from=items.findIndex(i=>i.id===source),to=items.findIndex(i=>i.id===target);
  if(from<0||to<0||items[from].parent_id!==items[to].parent_id)return items;
  const result=[...items], [moved]=result.splice(from,1);
  result.splice(result.findIndex(i=>i.id===target),0,moved);
  return result;
}
export function restoreOrder<T extends {id:string}>(items:T[],raw:unknown):T[] {
  if(!Array.isArray(raw))return items;
  const ids=[...new Set(raw.filter(x=>typeof x==='string'))];
  const ranks=new Map(ids.map((id,index)=>[id,index]));
  return [...items].sort((a,b)=>(ranks.get(a.id)??ids.length)-(ranks.get(b.id)??ids.length));
}
