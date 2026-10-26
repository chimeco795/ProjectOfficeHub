import {useActionFeedback} from '../../components/ActionFeedback';
import {Toolbar,FeedbackState} from '../../components/UiPatterns';
import {useCatalogView} from "../../components/CatalogView";
import {states,stateClass} from "../planning/workPresentation";
import { useEffect,useState } from "react";
import { api,json } from "../../api";

import { ItemEditor,emptyItem,kinds,type Item,type Person } from "./ItemEditor";
import "./master.css";
import {ContextField} from '../../components/ContextField';
import {ActionMenu} from '../../components/ActionMenu';
import {personChoices} from '../../components/SearchPicker';
import './catalog.css';
import {useSession} from '../../components/authState';

export function MasterCatalog({projectId}: {projectId:string}) {
  const {notify,feedback}=useActionFeedback();
  const readOnly=useSession()?.account.security_role==='Consulta';
  const [items,setItems]=useState<Item[]>([]),[people,setPeople]=useState<Person[]>([]);
  const [kind,setKind]=useState("Risk"),[query,setQuery]=useState(""),[archived,setArchived]=useState(false);
  const [view,setView]=useCatalogView('raid');
  const [editing,setEditing]=useState<Item|null>(null);
  const [error,setError]=useState(""),[saving,setSaving]=useState<string|null>(null),[order,setOrder]=useState('name');
  async function reload(){const [i,p]=await Promise.all([api(`/projects/${projectId}/items`),api(`/projects/${projectId}/people`)]);setItems(i);setPeople(p);}
  useEffect(()=>{void reload().catch(e=>setError(e.message));},[projectId]);
  async function save(item:Item,key:keyof Item,value:unknown){setSaving(item.id);try{const saved=await api(`/projects/${projectId}/items/${item.id}`,{method:'PUT',...json({...item,[key]:value})});setItems(current=>current.map(i=>i.id===item.id?saved:i));return saved;}finally{setSaving(null);}}
  const visible=items.filter(i=>i.kind===kind && !!i.archived===archived && `${i.code} ${i.name} ${i.owner_name}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>String(a[order as keyof Item]||'').localeCompare(String(b[order as keyof Item]||''),'es',{numeric:true}));
  const menu=(item:Item)=><ActionMenu label={'Opciones de '+item.code}><button onClick={()=>setEditing(item)}>Ver detalle</button><button disabled={saving===item.id||readOnly} onClick={async()=>{try{const saved=await save(item,'archived',!item.archived);notify(item.archived?'Elemento restaurado':'Elemento archivado',async()=>{await save(saved,'archived',item.archived);});}catch(e){setError((e as Error).message);}}}>{item.archived?'Restaurar':'Archivar'}</button></ActionMenu>;
  return <>{feedback}
    <section className="panel"><div className="section-heading"><div><p>Riesgos, supuestos, incidencias, dependencias e hitos vigentes que alimentan los nuevos cortes semanales.</p></div>
      <button className="primary" disabled={readOnly} onClick={()=>setEditing(emptyItem(kind))}>Nuevo elemento</button></div>
      {error&&<p role="alert" className="message error">{error}</p>}
      <Toolbar label="Filtros de RAID e hitos" className="raid-controls">
        <ContextField requiresWrite={false} label="Tipo de elemento" value={kind} options={Object.entries(kinds).map(([value,label])=>({value,label}))} onSave={async v=>setKind(v)}/>
        <label className="raid-search">Buscar elemento<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, nombre o responsable" /></label>
        <label className="raid-archived"><input type="checkbox" checked={archived} onChange={e=>setArchived(e.target.checked)} /> Ver archivados</label>
        <label className="catalog-order">Ordenar<select value={order} onChange={e=>setOrder(e.target.value)}>{[['name','Nombre'],['code','Código'],['target_date','Objetivo'],['status','Estado']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        <div className="view-switch" role="group" aria-label="Vista de RAID e hitos"><button aria-pressed={view==='list'} onClick={()=>setView('list')}>Vista Lista</button><button aria-pressed={view==='cards'} onClick={()=>setView('cards')}>Cards</button></div>
      </Toolbar>
      {view==='list'?<div className="catalog-table-wrap"><table className="catalog-table"><thead><tr>{['Código','Nombre','Tipo','Estado','Prioridad','Responsable','Objetivo','Acciones'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{visible.map(item=><tr key={item.id}>
        <td>{item.code}</td><td><button className="catalog-name" onClick={()=>setEditing(item)}>{item.name}</button></td><td>{kinds[item.kind]}</td>
        <td><ContextField showLabel={false} label={'Estado de '+item.code} value={item.status} required disabled={saving===item.id} onSave={v=>save(item,'status',v)}/></td>
        <td><ContextField showLabel={false} label={'Prioridad de '+item.code} value={item.executive_priority} options={['Baja','Media','Alta','Crítica'].map(v=>({value:v,label:v}))} disabled={saving===item.id} onSave={v=>save(item,'executive_priority',v)}/></td>
        <td><ContextField showLabel={false} label={'Responsable de '+item.code} value={item.owner_id||''} search options={personChoices(people)} disabled={saving===item.id} onSave={v=>save(item,'owner_id',v||null)}/></td>
        <td><ContextField showLabel={false} label={'Objetivo de '+item.code} value={item.target_date||''} type="date" disabled={saving===item.id} onSave={v=>save(item,'target_date',v||null)}/></td><td>{menu(item)}</td>
      </tr>)}</tbody></table></div>:<ul className="raid-cards">{visible.map(item=><li key={item.id}>
        <button className="raid-card" aria-label={'Ver '+item.code+': '+item.name} onClick={()=>setEditing(item)}>
          <span className="raid-title"><span className="eyebrow">{item.code}</span><strong>{item.name}</strong></span>
          <span className="raid-state"><span className={"field-chip "+stateClass(item.status)}>{states[item.status]||item.status}</span><small>Prioridad {item.executive_priority}</small></span>
          <span className="raid-owner"><small>Responsable</small>{item.owner_name||'Sin asignar'}</span>
          <span className="raid-date"><small>Compromiso</small>{item.target_date||'Sin definir'}</span>
          {view==='cards'&&item.response&&<span className="raid-response">{item.response}</span>}
        </button>{menu(item)}
      </li>)}</ul>}{!visible.length&&<FeedbackState>No hay elementos en esta selección.</FeedbackState>}
    </section>
    {editing&&<ItemEditor contextual initial={editing} people={people} items={items} title={editing.id?"Detalle del elemento":"Nuevo elemento maestro"} onClose={()=>setEditing(null)} onSave={async value=>{
      const saved=await api(`/projects/${projectId}/items${value.id?`/${value.id}`:""}`,{method:value.id?"PUT":"POST",...json(value)});await reload();return saved;
    }} />}
  </>;
}
