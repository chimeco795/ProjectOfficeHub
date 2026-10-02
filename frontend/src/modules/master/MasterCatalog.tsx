import { useEffect,useState } from "react";
import { api,json } from "../../api";
import { Dialog } from "../../Dialog";
import { ItemEditor,emptyItem,kinds,type Item,type Person } from "./ItemEditor";
import "./master.css";

export function MasterCatalog({projectId}: {projectId:string}) {
  const [items,setItems]=useState<Item[]>([]),[people,setPeople]=useState<Person[]>([]),[all,setAll]=useState<Person[]>([]);
  const [kind,setKind]=useState("Risk"),[query,setQuery]=useState(""),[archived,setArchived]=useState(false);
  const [editing,setEditing]=useState<Item|null>(null),[person,setPerson]=useState<Person|null>(null);
  const [error,setError]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
  async function reload(){const [i,p,a]=await Promise.all([api(`/projects/${projectId}/items`),api(`/projects/${projectId}/people`),api('/people')]);setItems(i);setPeople(p);setAll(a);}
  useEffect(()=>{void reload().catch(e=>setError(e.message));},[projectId]);
  async function run(fn:()=>Promise<void>){setBusy(true);setError("");setNotice("");try{await fn();await reload();setNotice("Datos maestros guardados.");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const visible=items.filter(i=>i.kind===kind && !!i.archived===archived && `${i.code} ${i.name} ${i.owner_name}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <section className="panel"><div className="section-heading"><div><h2>Estado actual del proyecto</h2><p>RAID, hitos y actividades comparten responsables y se vinculan con los cortes semanales.</p></div>
      <button className="primary" onClick={()=>setEditing(emptyItem(kind))}>Nuevo elemento</button></div>
      {error&&<p role="alert" className="message error">{error}</p>}{notice&&<p role="status">{notice}</p>}
      <div className="master-filters"><label>Tipo de elemento<select value={kind} onChange={e=>setKind(e.target.value)}>{Object.entries(kinds).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
        <label>Buscar elemento<input value={query} onChange={e=>setQuery(e.target.value)} /></label>
        <label><input type="checkbox" checked={archived} onChange={e=>setArchived(e.target.checked)} /> Ver archivados</label></div>
      <div className="master-cards">{visible.map(item=><article className="master-card" key={item.id}>
        <span className="eyebrow">{item.code}</span><h3>{item.name}</h3><p>{item.status} · Prioridad {item.executive_priority}</p>
        <p>Responsable: {item.owner_name||"Sin asignar"}</p><p>Compromiso: {item.target_date||"Sin definir"}</p>
        {item.response&&<p>{item.response}</p>}<button onClick={()=>setEditing(item)}>Editar {item.code}</button>
      </article>)}</div>{!visible.length&&<p>No hay elementos en esta selección.</p>}
    </section>
    <section className="panel"><h2>Responsables del proyecto</h2><p>Reutiliza personas del catálogo global. Los nombres importados se revisan antes de asignar una identidad.</p>
      <form className="master-filters" onSubmit={e=>{e.preventDefault();const form=e.currentTarget;const values=Object.fromEntries(new FormData(form));void run(async()=>{await api(`/projects/${projectId}/people`,{method:"POST",...json({new_person:values})});form.reset();});}}>
        <label>Nombre de persona<input name="name" required /></label><label>Correo de persona<input name="email" type="email" /></label><button disabled={busy}>Crear y asignar persona</button>
      </form>
      <form className="master-filters" onSubmit={e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget));void run(async()=>{await api(`/projects/${projectId}/people`,{method:"POST",...json(values)});});}}>
        <label>Persona existente<select name="person_id" required defaultValue=""><option value="" disabled>Seleccionar del catálogo</option>{all.filter(p=>!people.some(x=>x.id===p.id)).map(p=><option key={p.id} value={p.id}>{p.name} · {p.email||"Sin correo"}</option>)}</select></label><button disabled={busy}>Asignar persona existente</button>
      </form>
      <ul>{people.map(p=><li key={p.id}>{p.name} · {p.email||"Sin correo"} <button onClick={()=>setPerson(p)}>Editar persona</button></li>)}</ul>
    </section>
    {editing&&<ItemEditor initial={editing} people={people} items={items} title={editing.id?"Editar elemento maestro":"Nuevo elemento maestro"} onClose={()=>setEditing(null)} onSave={async value=>{
      await api(`/projects/${projectId}/items${value.id?`/${value.id}`:""}`,{method:value.id?"PUT":"POST",...json(value)});await reload();
    }} />}
    {person&&<Dialog title="Editar persona del catálogo" onClose={()=>{if(!busy)setPerson(null);}}><p>Este cambio se aplica al catálogo común. Los nombres de cortes publicados permanecen iguales.</p>
      <form onSubmit={e=>{e.preventDefault();void run(async()=>{await api(`/people/${person.id}`,{method:"PUT",...json(person)});setPerson(null);});}}>
        <label>Nombre<input required value={person.name} onChange={e=>setPerson({...person,name:e.target.value})} /></label>
        <label>Correo<input type="email" value={person.email} onChange={e=>setPerson({...person,email:e.target.value})} /></label>
        {error&&<p role="alert">{error}</p>}<button disabled={busy}>Guardar persona</button>
      </form></Dialog>}
  </>;
}
