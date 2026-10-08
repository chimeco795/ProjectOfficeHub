import {useEffect,useState} from 'react';
import {api,json} from '../../api';
import {ContextField} from '../../components/ContextField';
import {SearchPicker,personChoices} from '../../components/SearchPicker';
import {Dialog} from '../../Dialog';
import {RecordEditor} from './Operations';
import {Capacity} from './Capacity';
import {OrganizationChart} from './OrganizationChart';
export function ManagementWorkspace({projectId,view}:{projectId:string;view:string}) {
 const base='/projects/'+projectId;
 const [people,setPeople]=useState<any[]>([]),[assigned,setAssigned]=useState<any[]>([]),[roles,setRoles]=useState<any[]>([]),[absences,setAbsences]=useState<any[]>([]),[teams,setTeams]=useState<any[]>([]),[calendars,setCalendars]=useState<any[]>([]);
 const [selected,setSelected]=useState<any>(null),[adding,setAdding]=useState(''),[error,setError]=useState(''),[query,setQuery]=useState('');
 async function reload(){const [p,a,r,d,t,c]=await Promise.all([api('/people'),api(base+'/people'),api('/roles'),api(base+'/availability'),api(base+'/pmo/teams'),api(base+'/working-calendars')]);setPeople(p);setAssigned(a);setRoles(r);setAbsences(d);setTeams(t);setCalendars(c);}
 useEffect(()=>{void reload().catch(e=>setError(e.message));},[base]);
 const titles:Record<string,string>={people:'Personas',roles:'Roles',availability:'Capacidad / Disponibilidad',organization:'Organigrama'};
 async function savePerson(key:string,value:any){try{const next={...selected,[key]:value};const contact=['phone','mobile','location','contact_notes'].includes(key);const saved=await api('/people/'+next.id+(contact?'/contact':''),{method:'PUT',...json(next)});setSelected(saved);await reload();}catch(e){throw e;}}
 return <section className="panel management-workspace">
  <div className="section-heading"><h2>{titles[view]}</h2>{view!=='organization'&&<button className="primary" onClick={()=>setAdding(view)}>{view==='people'?'Nueva persona':view==='roles'?'Nuevo rol':'Registrar ausencia'}</button>}</div>
  {error&&<p role="alert">{error}</p>}
  {view==='people'?<>
   <label>Buscar persona<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre o correo"/></label>
   <div className="team-grid">{people.filter(p=>(p.name+' '+p.email).toLowerCase().includes(query.toLowerCase())).map(p=><article className="person-card" key={p.id}>
    <span className="person-avatar">{p.name.slice(0,2).toUpperCase()}</span><h3>{p.name}</h3><p>{p.email||'Sin correo'}</p>
    <button onClick={()=>setSelected(p)}>Ver contacto</button>{!assigned.some(a=>a.id===p.id)?<button onClick={async()=>{try{await api(base+'/people',{method:'POST',...json({person_id:p.id})});await reload();}catch(e){setError((e as Error).message);}}}>Asignar a este proyecto</button>:<small>En este proyecto</small>}
   </article>)}</div></>:
  view==='roles'?<div className="team-grid">{roles.map(r=><article className="person-card" key={r.id}><h3>{r.name}</h3><p>Reporta a: {roles.find(x=>x.id===r.reports_to)?.name||'Raíz'}</p><p>{r.archived?'Archivado':'Activo'} · {roles.filter(x=>x.reports_to===r.id).length} roles subordinados</p><button onClick={()=>setSelected(r)}>Editar rol</button></article>)}</div>:
  view==='organization'?<OrganizationChart projectId={projectId}/>:
  <>
   <div className="availability-list">{absences.filter(a=>!a.archived).map(a=><article className="person-card" key={a.id}><h3>{people.find(p=>p.id===a.person_id)?.name}</h3><p>{a.kind} · {a.start_date} → {a.end_date}</p><p>{a.notes}</p><button onClick={()=>setSelected(a)}>Editar disponibilidad</button></article>)}</div>
   <div className="section-heading"><h3>Horario laboral</h3><button onClick={()=>setAdding('calendar')}>Configurar horario</button></div>
   {calendars.map(c=><p key={c.id}>{teams.find(t=>t.id===c.team_id)?.name||'Proyecto'} · {c.days.map((d:number)=>['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][d]).join(', ')} · {c.start_time.slice(0,5)}–{c.end_time.slice(0,5)} <button onClick={()=>{setSelected(c);setAdding('calendar');}}>Editar horario</button></p>)}
   <Capacity projectId={projectId} revision={JSON.stringify(absences)}/>
  </>}
  {selected&&view==='people'&&<Dialog title={selected.name} onClose={()=>setSelected(null)}>
   <div className="detail-grid">{(['name','email'] as const).map(key=><ContextField key={key} label={key==='name'?'Nombre':'Correo'} type={key==='email'?'email':'text'} required={key==='name'} value={selected[key]} onSave={v=>savePerson(key,v)}/>)}</div>
   {(['phone','mobile','location','contact_notes'] as const).map((key,index)=>selected[key]!==undefined&&selected[key]!==null&&(selected[key]!==''||selected['_show'+key])?<ContextField key={key} label={['Teléfono','Celular','Ubicación','Otros datos'][index]} type={key==='contact_notes'?'textarea':'text'} value={selected[key]} onSave={v=>savePerson(key,v)}/>:<button key={key} onClick={()=>setSelected({...selected,['_show'+key]:true})}>+ {['Teléfono','Celular','Ubicación','Otros datos'][index]}</button>)}
  </Dialog>}
  {(adding==='people')&&<RecordEditor title="Nueva persona" initial={{name:'',email:''}} fields={[{key:'name',label:'Nombre',required:true},{key:'email',label:'Correo',type:'email'}]} onClose={()=>setAdding('')} onSave={async v=>{await api(base+'/people',{method:'POST',...json({new_person:v})});await reload();}}/>}
  {(adding==='roles'||selected&&view==='roles')&&<RecordEditor title="Rol" initial={selected||{name:'',reports_to:null,version:1,archived:false}} fields={[{key:'name',label:'Nombre',required:true},{key:'reports_to',label:'Reporta a',nullable:true,options:roles.filter(r=>r.id!==selected?.id&&!r.archived).map(r=>({value:r.id,label:r.name}))},{key:'archived',label:'Archivado',type:'checkbox'}]} onClose={()=>{setSelected(null);setAdding('');}} onSave={async v=>{await api('/roles'+(v.id?'/'+v.id:''),{method:v.id?'PUT':'POST',...json(v)});await reload();}}/>}
  {(adding==='availability'||selected&&view==='availability'&&!adding)&&<RecordEditor title="Disponibilidad" initial={selected||{person_id:'',kind:'Vacaciones',start_date:'',end_date:'',notes:'',version:1,archived:false}} fields={[{key:'person_id',label:'Persona',options:personChoices(assigned),required:true},{key:'kind',label:'Tipo',required:true,options:['Vacaciones','Permiso','Enfermedad','Asunto personal','Fuera de oficina'].map(value=>({value,label:value}))},{key:'start_date',label:'Inicio',type:'date',required:true},{key:'end_date',label:'Fin',type:'date',required:true},{key:'notes',label:'Nota',type:'textarea'},{key:'archived',label:'Archivado',type:'checkbox'}]} onClose={()=>{setSelected(null);setAdding('');}} onSave={async v=>{await api(base+'/availability'+(v.id?'/'+v.id:''),{method:v.id?'PUT':'POST',...json(v)});await reload();}}/>}
  {adding==='calendar'&&<CalendarEditor initial={selected} teams={teams} onClose={()=>{setAdding('');setSelected(null);}} onSave={async v=>{await api(base+'/working-calendar',{method:'PUT',...json(v)});await reload();}}/>}
 </section>;
}
function CalendarEditor({initial,teams,onClose,onSave}:{initial:any;teams:any[];onClose:()=>void;onSave:(v:any)=>Promise<void>}) {
 const [v,setV]=useState(initial||{team_id:null,days:[0,1,2,3,4],start_time:'09:00',end_time:'18:00',version:0}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <Dialog title="Horario laboral" onClose={()=>{if(!busy)onClose();}}><form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await onSave(v);onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><fieldset disabled={busy}>
  <label>Ámbito<select disabled={!!initial} value={v.team_id||''} onChange={e=>setV({...v,team_id:e.target.value||null})}><option value="">Proyecto</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
  <div className="button-row">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((day,i)=><label key={day}><input type="checkbox" checked={v.days.includes(i)} onChange={e=>setV({...v,days:e.target.checked?[...v.days,i]:v.days.filter((d:number)=>d!==i)})}/>{day}</label>)}</div>
  {['start_time','end_time'].map((key,index)=><label key={key}>{index?'Fin':'Inicio'}<input type="time" required value={v[key].slice(0,5)} onChange={e=>setV({...v,[key]:e.target.value})}/></label>)}
  {error&&<p role="alert">{error}</p>}<button className="primary">Guardar horario</button>
 </fieldset></form></Dialog>;
}
