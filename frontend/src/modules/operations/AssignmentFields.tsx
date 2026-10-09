import {ContextField} from '../../components/ContextField';
import {personChoices} from '../../components/SearchPicker';

// The same assignment fields are available from a person and from their team.
export function AssignmentFields({member,roles,teams,people,onSave}:{member:any;roles:any[];teams:any[];people:any[];onSave:(key:string,value:any)=>Promise<void>}) {
  const m=member;
  return <div className="member-fields">
    <ContextField label="Equipo" value={m.team_id||''} search options={[{value:'',label:'Sin equipo'},...teams.filter(t=>!t.archived||t.id===m.team_id).map(t=>({value:t.id,label:t.name}))]} onSave={v=>onSave('team_id',v||null)}/>
    <ContextField label="Rol" value={m.role_id||''} display={roles.find(r=>r.id===m.role_id)?.name||m.role||'Sin rol'} search options={[{value:'',label:'Sin rol'},...roles.filter(r=>!r.archived||r.id===m.role_id).map(r=>({value:r.id,label:r.name}))]} onSave={v=>onSave('role_id',v||null)}/>
    <ContextField label="Dedicación (%)" value={m.allocation} type="number" min={0} max={100} onSave={v=>onSave('allocation',Number(v))}/>
    <details className="assignment-options"><summary>Vigencia y líder</summary><div className="member-fields">
      <ContextField label="Desde" value={m.valid_from||''} type="date" onSave={v=>onSave('valid_from',v||null)}/>
      <ContextField label="Hasta" value={m.valid_to||''} type="date" onSave={v=>onSave('valid_to',v||null)}/>
      <ContextField label="Líder" value={m.leader_id||''} search options={[{value:'',label:'Sin líder'},...personChoices(people.filter(p=>p.id!==m.person_id))]} onSave={v=>onSave('leader_id',v||null)}/>
      <ContextField label="Excepción multiequipo" value={m.allow_multiple_teams?'1':'0'} options={[{value:'0',label:'No'},{value:'1',label:'Sí, explícita'}]} onSave={v=>onSave('allow_multiple_teams',v==='1')}/>
      {!m.role_id&&m.role&&<ContextField label="Rol heredado" value={m.role} onSave={v=>onSave('role',v)}/>}
    </div></details>
  </div>;
}
