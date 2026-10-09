import {useEffect,useState} from 'react';
import {api,json} from '../../api';
import {SearchPicker} from '../../components/SearchPicker';
import {AssignmentFields} from './AssignmentFields';
import {dateKey} from './calendarModel';

export function PersonAssignment({projectId,person,onAssigned}:{projectId:string;person:any;onAssigned:()=>Promise<void>}) {
  const base='/projects/'+projectId;
  const [teams,setTeams]=useState<any[]>([]),[roles,setRoles]=useState<any[]>([]),[people,setPeople]=useState<any[]>([]),[members,setMembers]=useState<any[]>([]);
  const [loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  async function reload(){const [t,r,p,m]=await Promise.all([api(base+'/pmo/teams'),api('/roles'),api(base+'/people'),api(base+'/pmo/memberships')]);setTeams(t);setRoles(r);setPeople(p);setMembers(m);setLoaded(true);}
  useEffect(()=>{void reload().catch(e=>setError(e.message));},[base,person.id]);
  const assigned=people.some(p=>p.id===person.id);
  const today=dateKey(new Date());
  const personMembers=members.filter(m=>m.person_id===person.id&&!m.archived);
  const assignments=personMembers.filter(m=>!m.valid_to||m.valid_to>=today);
  const previous=personMembers.filter(m=>m.valid_to&&m.valid_to<today);
  async function assignProject(){setBusy(true);setError('');try{await api(base+'/people',{method:'POST',...json({person_id:person.id})});await reload();await onAssigned();setNotice('Persona asignada al proyecto. Elige su equipo.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function addTeam(teamId:string){if(!teamId||busy)return;setBusy(true);setError('');try{
    // Existing assignments are edited in place, never silently duplicated.
    await api(base+'/pmo/memberships',{method:'POST',...json({person_id:person.id,team_id:teamId,role:'',role_id:null,leader_id:null,allocation:100,valid_from:null,valid_to:null,allow_multiple_teams:false,archived:false})});
    await reload();setNotice('Equipo asignado. Elige el rol y ajusta la dedicación.');
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function update(member:any,key:string,value:any){const saved=await api(base+'/pmo/memberships/'+member.id,{method:'PUT',...json({...member,[key]:value})});setMembers(old=>old.map(m=>m.id===saved.id?saved:m));setNotice('Asignación guardada.');}
  return <div className="person-assignment">
    <h3>Rol y equipo en este proyecto</h3>
    <p className="assignment-path">Persona → Proyecto → Equipo → Rol → Dedicación</p>
    {error&&<p role="alert">{error}</p>}{notice&&<small role="status">{notice}</small>}
    {!loaded?<p>Cargando asignación…</p>:!assigned?<button className="primary" disabled={busy} onClick={()=>void assignProject()}>Asignar a este proyecto</button>:<>
      <small>Persona asignada al proyecto</small>
      {assignments.length?assignments.map(m=><section className="person-assignment-record" key={m.id} aria-label="Asignación de la persona"><AssignmentFields member={m} roles={roles} teams={teams} people={people} onSave={(key,value)=>update(m,key,value)}/></section>):teams.some(t=>!t.archived)?<SearchPicker label="Asignar equipo" value="" disabled={busy} options={teams.filter(t=>!t.archived).map(t=>({value:t.id,label:t.name}))} onChange={v=>void addTeam(String(v))}/>:<p>Crea o vincula un equipo desde Equipos / Asignaciones para elegirlo aquí.</p>}
    </>}
    {!!previous.length&&<details className="assignment-options"><summary>Asignaciones anteriores · {previous.length}</summary><ul>{previous.map(m=><li key={m.id}>{teams.find(t=>t.id===m.team_id)?.name||'Sin equipo'} · {roles.find(r=>r.id===m.role_id)?.name||m.role||'Sin rol'} · {m.allocation}% · {m.valid_from||'Sin inicio'} → {m.valid_to}</li>)}</ul></details>}
  </div>;
}
