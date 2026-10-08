type Item = {id:string;owner_id:string|null;parent_id:string|null;work_type:string;code:string;name:string};
type Membership = {person_id:string;team_id:string|null;archived:boolean;valid_from:string|null;valid_to:string|null};
export function deliveryGroups<T extends Item>(items:T[], all:T[], mode:string, teams:{id:string;name:string}[], members:Membership[], today:string) {
  const groups = new Map<string,{id:string;name:string;items:T[]}>();
  for (const item of items) {
    let id = item.owner_id || 'none', name = 'Sin responsable';
    if (mode === 'team') {
      const ids=[...new Set(members.filter(m=>!m.archived && m.person_id===item.owner_id && (!m.valid_from||m.valid_from<=today) && (!m.valid_to||m.valid_to>=today)).map(m=>m.team_id).filter(Boolean))];
      id=ids.length===1 ? ids[0]! : ids.length>1 ? 'multiple' : 'none';
      name=teams.find(t=>t.id===id)?.name || (id==='multiple' ? 'Varios equipos · revisar asignación' : 'Sin equipo');
    } else if(mode==='parent') {
      let parent=all.find(i=>i.id===item.parent_id); const visited=new Set([item.id]);
      while(parent && !['Epic','Feature','EnablerFeature','Phase','Deliverable'].includes(parent.work_type) && !visited.has(parent.id)) {visited.add(parent.id);parent=all.find(i=>i.id===parent!.parent_id);}
      id=parent?.id || (['Epic','Feature','Phase','Deliverable'].includes(item.work_type)?item.id:'none');
      const root=all.find(i=>i.id===id); name=root ? root.code+' · '+root.name : 'Sin agrupación';
    }
    if(!groups.has(id))groups.set(id,{id,name,items:[]});
    groups.get(id)!.items.push(item);
  }
  return [...groups.values()];
}
