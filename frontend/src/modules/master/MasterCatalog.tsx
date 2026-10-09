import { SearchPicker, personChoices } from "../../components/SearchPicker";
import {states,stateClass} from "../planning/workPresentation";
import { useEffect,useState } from "react";
import { api,json } from "../../api";
import { Dialog } from "../../Dialog";
import { ItemEditor,emptyItem,kinds,type Item,type Person } from "./ItemEditor";
import "./master.css";
import {ContextField} from '../../components/ContextField';

export function MasterCatalog({projectId}: {projectId:string}) {
  const [items,setItems]=useState<Item[]>([]),[people,setPeople]=useState<Person[]>([]),[all,setAll]=useState<Person[]>([]);
  const [assignPerson,setAssignPerson]=useState("");
  const [kind,setKind]=useState("Risk"),[query,setQuery]=useState(""),[archived,setArchived]=useState(false);
  const [view,setView]=useState<'list'|'cards'>('list');
  const [editing,setEditing]=useState<Item|null>(null),[person,setPerson]=useState<Person|null>(null);
  const [error,setError]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
  async function reload(){const [i,p,a]=await Promise.all([api(`/projects/${projectId}/items`),api(`/projects/${projectId}/people`),api('/people')]);setItems(i);setPeople(p);setAll(a);}
  useEffect(()=>{void reload().catch(e=>setError(e.message));},[projectId]);
  async function run(fn:()=>Promise<void>){setBusy(true);setError("");setNotice("");try{await fn();await reload();setNotice("Datos maestros guardados.");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const visible=items.filter(i=>i.kind===kind && !!i.archived===archived && `${i.code} ${i.name} ${i.owner_name}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <section className="panel"><div className="section-heading"><div><h2>RAID e hitos</h2><p>Riesgos, supuestos, incidencias, dependencias e hitos vigentes que alimentan los nuevos cortes semanales.</p></div>
      <button className="primary" onClick={()=>setEditing(emptyItem(kind))}>Nuevo elemento</button></div>
      {error&&<p role="alert" className="message error">{error}</p>}{notice&&<p role="status">{notice}</p>}
      <div className="raid-controls">
        <ContextField label="Tipo de elemento" value={kind} options={Object.entries(kinds).map(([value,label])=>({value,label}))} onSave={async v=>setKind(v)}/>
        <label className="raid-search">Buscar elemento<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, nombre o responsable" /></label>
        <label className="raid-archived"><input type="checkbox" checked={archived} onChange={e=>setArchived(e.target.checked)} /> Ver archivados</label>
        <div className="view-switch" role="group" aria-label="Vista de RAID e hitos"><button aria-pressed={view==='list'} onClick={()=>setView('list')}>Vista Lista</button><button aria-pressed={view==='cards'} onClick={()=>setView('cards')}>Cards</button></div>
      </div>
      <ul className={view==='list'?'raid-list':'raid-cards'}>{visible.map(item=><li key={item.id}>
        <button className={view==='list'?'raid-row':'raid-card'} aria-label={'Ver '+item.code+': '+item.name} onClick={()=>setEditing(item)}>
          <span className="raid-title"><span className="eyebrow">{item.code}</span><strong>{item.name}</strong></span>
          <span className="raid-state"><span className={"field-chip "+stateClass(item.status)}>{states[item.status]||item.status}</span><small>Prioridad {item.executive_priority}</small></span>
          <span className="raid-owner"><small>Responsable</small>{item.owner_name||'Sin asignar'}</span>
          <span className="raid-date"><small>Compromiso</small>{item.target_date||'Sin definir'}</span>
          {view==='cards'&&item.response&&<span className="raid-response">{item.response}</span>}
        </button>
      </li>)}</ul>{!visible.length&&<p>No hay elementos en esta selección.</p>}
    </section>
    <details className="panel"><summary>Responsables del proyecto · {people.length}</summary><p>Reutiliza personas del catálogo global. También puedes administrar sus fichas desde Personas.</p>
      <form className="master-filters" onSubmit={e=>{e.preventDefault();const form=e.currentTarget;const values=Object.fromEntries(new FormData(form));void run(async()=>{await api(`/projects/${projectId}/people`,{method:"POST",...json({new_person:values})});form.reset();});}}>
        <label>Nombre de persona<input name="name" required /></label><label>Correo de persona<input name="email" type="email" /></label><button disabled={busy}>Crear y asignar persona</button>
      </form>
      <form className="master-filters" onSubmit={e=>{e.preventDefault();if(!assignPerson){setError("Selecciona una persona");return;}void run(async()=>{await api(`/projects/${projectId}/people`,{method:"POST",...json({person_id:assignPerson})});setAssignPerson("");});}}>
        <SearchPicker label="Persona existente" value={assignPerson} options={personChoices(all.filter(p=>!people.some(x=>x.id===p.id)))} onChange={v=>setAssignPerson(String(v))}/><button disabled={busy}>Asignar persona existente</button>
      </form>
      <ul>{people.map(p=><li key={p.id}>{p.name} · {p.email||"Sin correo"} <button onClick={()=>setPerson(p)}>Editar persona</button></li>)}</ul>
    </details>
    {editing&&<ItemEditor contextual initial={editing} people={people} items={items} title={editing.id?"Detalle del elemento":"Nuevo elemento maestro"} onClose={()=>setEditing(null)} onSave={async value=>{
      const saved=await api(`/projects/${projectId}/items${value.id?`/${value.id}`:""}`,{method:value.id?"PUT":"POST",...json(value)});await reload();return saved;
    }} />}
    {person&&<Dialog title="Editar persona del catálogo" onClose={()=>{if(!busy)setPerson(null);}}><p>Este cambio se aplica al catálogo común. Los nombres de cortes publicados permanecen iguales.</p>
      <form onSubmit={e=>{e.preventDefault();void run(async()=>{await api(`/people/${person.id}`,{method:"PUT",...json(person)});setPerson(null);});}}>
        <label>Nombre<input required value={person.name} onChange={e=>setPerson({...person,name:e.target.value})} /></label>
        <label>Correo<input type="email" value={person.email} onChange={e=>setPerson({...person,email:e.target.value})} /></label>
        {error&&<p role="alert">{error}</p>}<button disabled={busy}>Guardar persona</button>
      </form></Dialog>}
  </>;
}
