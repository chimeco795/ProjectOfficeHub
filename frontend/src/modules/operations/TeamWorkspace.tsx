import {useEffect,useState} from 'react';
import {api,json} from '../../api';
import {ContextField} from '../../components/ContextField';
import {SearchPicker,personChoices} from '../../components/SearchPicker';
import {ActionMenu} from '../../components/ActionMenu';
import {useActionFeedback} from '../../components/ActionFeedback';
import {Dialog} from '../../Dialog';
import {dateKey} from './calendarModel';

export function TeamWorkspace({projectId}:{projectId:string}) {
  const base='/projects/'+projectId;
  const [teams,setTeams]=useState<any[]>([]),[allTeams,setAllTeams]=useState<any[]>([]),[people,setPeople]=useState<any[]>([]),[globalPeople,setGlobalPeople]=useState<any[]>([]),[members,setMembers]=useState<any[]>([]),[roles,setRoles]=useState<any[]>([]);
  const [selected,setSelected]=useState(''),[create,setCreate]=useState(false),[name,setName]=useState(''),[adding,setAdding]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[showArchived,setShowArchived]=useState(false),[showShared,setShowShared]=useState(false);
  const {notify,feedback}=useActionFeedback();
  const [exceptionPerson,setExceptionPerson]=useState('');
  async function reload(){const [t,a,p,g,m,r]=await Promise.all([api(base+'/pmo/teams'),api('/teams'),api(base+'/people'),api('/people'),api(base+'/pmo/memberships'),api('/roles')]);setTeams(t);setAllTeams(a);setPeople(p);setGlobalPeople(g);setMembers(m);setRoles(r);}
  useEffect(()=>{setSelected('');void reload().catch(e=>setError(e.message));},[base]);
  const team=teams.find(t=>t.id===selected);
  async function updateMember(member:any,key:string,value:any){const saved=await api(base+'/pmo/memberships/'+member.id,{method:'PUT',...json({...member,[key]:value})});setMembers(old=>old.map(m=>m.id===saved.id?saved:m));notify('Asignación actualizada');}
  async function addPerson(id:string,exception=false){if(!id||busy)return;
    if(!exception&&members.some(m=>m.person_id===id&&!m.archived&&m.team_id&&m.team_id!==selected&&(!m.valid_to||m.valid_to>=dateKey(new Date())))){setExceptionPerson(id);return;}
    setBusy(true);setError('');try{
    if(!people.some(p=>p.id===id))await api(base+'/people',{method:'POST',...json({person_id:id})});
    // Reuse an ungrouped assignment; do not manufacture a duplicate allocation.
    const today=dateKey(new Date());
    const ungrouped=members.find(m=>m.person_id===id&&!m.team_id&&!m.archived&&(!m.valid_from||m.valid_from<=today)&&(!m.valid_to||m.valid_to>=today));
    await api(base+'/pmo/memberships'+(ungrouped?'/'+ungrouped.id:''),{method:ungrouped?'PUT':'POST',...json(ungrouped?{...ungrouped,team_id:selected,allow_multiple_teams:exception||ungrouped.allow_multiple_teams}:{person_id:id,team_id:selected,role:'',role_id:null,leader_id:null,allocation:100,valid_from:null,valid_to:null,allow_multiple_teams:exception,archived:false})});
    await reload();setAdding(false);setExceptionPerson('');notify('Persona añadida al equipo');
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function saveTeam(key:string,value:any){const saved=await api(base+'/pmo/teams/'+team.id,{method:'PUT',...json({...team,[key]:value})});setTeams(old=>old.map(t=>t.id===saved.id?saved:t));notify('Equipo actualizado');}
  function memberCard(m:any){const person=people.find(p=>p.id===m.person_id);return <article className="team-member" key={m.id}>
    <div className="section-heading"><h3>{person?.name||'Persona'}</h3><ActionMenu label={'Opciones de asignación de '+person?.name}><button onClick={()=>{if(window.confirm('¿Archivar esta asignación? La persona se conserva.'))void updateMember(m,'archived',!m.archived).catch(e=>setError(e.message));}}>{m.archived?'Restaurar asignación':'Archivar asignación'}</button></ActionMenu></div>
    <div className="member-fields">
      <ContextField label="Rol" value={m.role_id||''} display={roles.find(r=>r.id===m.role_id)?.name||m.role||'Sin rol'} search options={[{value:'',label:'Sin rol'},...roles.filter(r=>!r.archived||r.id===m.role_id).map(r=>({value:r.id,label:r.name}))]} onSave={v=>updateMember(m,'role_id',v||null)}/>
      <ContextField label="Dedicación (%)" value={m.allocation} type="number" min={0} max={100} onSave={v=>updateMember(m,'allocation',Number(v))}/>
      <ContextField label="Líder" value={m.leader_id||''} search options={[{value:'',label:'Sin líder'},...personChoices(people.filter(p=>p.id!==m.person_id))]} onSave={v=>updateMember(m,'leader_id',v||null)}/>
      <ContextField label="Desde" value={m.valid_from||''} type="date" onSave={v=>updateMember(m,'valid_from',v||null)}/>
      <ContextField label="Hasta" value={m.valid_to||''} type="date" onSave={v=>updateMember(m,'valid_to',v||null)}/>
      <ContextField label="Equipo" value={m.team_id||''} search options={[{value:'',label:'Sin equipo'},...teams.filter(t=>!t.archived).map(t=>({value:t.id,label:t.name}))]} onSave={v=>updateMember(m,'team_id',v||null)}/>
      <ContextField label="Excepción multiequipo" value={m.allow_multiple_teams?'1':'0'} options={[{value:'0',label:'No'},{value:'1',label:'Sí, explícita'}]} onSave={v=>updateMember(m,'allow_multiple_teams',v==='1')}/>
      {!m.role_id&&m.role&&<ContextField label="Rol heredado" value={m.role} onSave={v=>updateMember(m,'role',v)}/>}
    </div>
  </article>;}
  return <section className="panel team-workspace">{feedback}<div className="section-heading"><div>{team?<><button className="quiet" onClick={()=>setSelected('')}>← Equipos</button><h2>{team.name}</h2></>:<h2>Equipos</h2>}</div>{team?<button className="primary" onClick={()=>setAdding(!adding)}>Añadir persona</button>:<button className="primary" onClick={()=>{setName('');setCreate(true);}}>Nuevo equipo</button>}<ActionMenu label="Opciones de equipos"><button onClick={()=>setShowArchived(!showArchived)}>{showArchived?'Ocultar archivados':'Mostrar archivados'}</button>{!team&&<button onClick={()=>setShowShared(!showShared)}>Vincular equipo existente</button>}</ActionMenu></div>
    {error&&<p role="alert">{error}</p>}
    {exceptionPerson&&<div className="context-add"><p>{globalPeople.find(p=>p.id===exceptionPerson)?.name} ya pertenece a otro equipo. Añadir aquí requiere una excepción explícita; revisa después su dedicación total.</p><button disabled={busy} onClick={()=>void addPerson(exceptionPerson,true)}>Permitir excepción y añadir</button><button onClick={()=>setExceptionPerson('')}>Cancelar</button></div>}
    {team?<><div className="detail-grid"><ContextField label="Nombre del equipo" value={team.name} required onSave={v=>saveTeam('name',v)}/><ContextField label="Líder del equipo" value={team.lead_id||''} search options={[{value:'',label:'Sin líder'},...personChoices(people)]} onSave={v=>saveTeam('lead_id',v||null)}/><ContextField label="Estado del equipo" value={team.archived?'1':'0'} options={[{value:'0',label:'Activo'},{value:'1',label:'Archivado'}]} onSave={async v=>{if(v==='1'&&!window.confirm('¿Archivar el equipo compartido?'))return;await saveTeam('archived',v==='1');}}/></div><small>El nombre y líder del equipo son compartidos entre proyectos.</small>
    {adding&&<div className="context-add"><SearchPicker label="Añadir persona al equipo" value="" disabled={busy} options={personChoices(globalPeople.filter(p=>!members.some(m=>m.person_id===p.id&&m.team_id===selected&&!m.archived)))} onChange={v=>void addPerson(String(v))}/><button onClick={()=>setAdding(false)}>Cerrar</button></div>}
    <div className="team-member-list">{members.filter(m=>m.team_id===selected&&(showArchived||!m.archived)).map(memberCard)}</div>{!members.some(m=>m.team_id===selected&&!m.archived)&&<p>Añade una persona existente para comenzar.</p>}</>:<>
      {showShared&&<SearchPicker label="Equipo existente" value="" options={allTeams.filter(t=>!t.archived&&!teams.some(x=>x.id===t.id)).map(t=>({value:t.id,label:t.name}))} onChange={async v=>{if(v){try{await api(base+'/teams/assign',{method:'POST',...json({team_id:v})});await reload();setSelected(String(v));setShowShared(false);}catch(e){setError((e as Error).message);}}}}/>}<div className="team-grid">{teams.filter(t=>showArchived||!t.archived).map(t=><article className="person-card" key={t.id}><button className="team-open" onClick={()=>setSelected(t.id)}><h3>{t.name}</h3><span>{members.filter(m=>m.team_id===t.id&&!m.archived).length} integrantes{t.archived?' · Archivado':''}</span></button></article>)}</div>
      {!!members.filter(m=>!m.team_id&&(showArchived||!m.archived)).length&&<details><summary>Asignaciones sin equipo</summary>{members.filter(m=>!m.team_id&&(showArchived||!m.archived)).map(memberCard)}</details>}
    </>}
    {create&&<Dialog title="Nuevo equipo" onClose={()=>{if(!busy)setCreate(false);}}><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const t=await api(base+'/pmo/teams',{method:'POST',...json({name,lead_id:null,archived:false})});await reload();setSelected(t.id);setCreate(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><label>Nombre<input autoFocus required value={name} onChange={e=>setName(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button disabled={busy} className="primary">Crear equipo</button></form></Dialog>}
  </section>;
}
