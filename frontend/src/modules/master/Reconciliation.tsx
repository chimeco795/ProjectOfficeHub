import { useEffect, useState } from "react";
import { api, json } from "../../api";
import type { Detail, Row } from "../../types";
import { ItemEditor, emptyItem, sectionKinds, type Item, type Person } from "./ItemEditor";
import { AuditValues } from "../executive/CutHistory";
import "./master.css";
type Binding = {record_id:string;master_item_id:string;master_version:number;master_snapshot:Item;payload:Record<string,unknown>;frozen_at:string|null};
export function Reconciliation({projectId,detail,reload}:{projectId:string;detail:Detail;reload:()=>Promise<void>}) {
 const [items,setItems]=useState<Item[]>([]),[people,setPeople]=useState<Person[]>([]),[links,setLinks]=useState<Binding[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [editor,setEditor]=useState<{row:Row;item:Item;apply:boolean}|null>(null);
 const base=`/projects/${projectId}/cuts/${detail.cut.id}`;
 useEffect(()=>{let active=true;Promise.all([api(`/projects/${projectId}/items`),api(`/projects/${projectId}/people`),api(base+"/bindings")]).then(([i,p,l])=>{if(active){setItems(i);setPeople(p);setLinks(l);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[base]);
 const run=async(fn:()=>Promise<unknown>)=>{setBusy(true);setError("");try{await fn();await reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const seed=(row:Row,master?:Item):Item=>{
   const value={...(master||emptyItem(sectionKinds[row.section]))};
   const fields={description:"name",code:"code",status:"status",mitigation:"response",probability:"probability",impact:"impact"} as const;
   for(const [source,target] of Object.entries(fields)) {
     if(row.current[source]!=null) value[target]=String(row.current[source]);
   }
   for(const [source,target] of [["start_date","start_date"],["end_date","target_date"]] as const) {
     const date=row.current[source];
     if(typeof date==="string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) value[target]=date;
   }
   const progress=row.current.percentage;
   if(typeof progress==="number" && Number.isFinite(progress) && progress>=0 && progress<=100) value.progress=progress;
   return value;
 };
 const published=detail.cut.status==="publicado";
 return <section className="panel"><h2>Conciliar con el catálogo</h2><p>Primero revisa y acepta los registros. Vincula riesgos, dependencias, hitos y actividades antes de publicar. Vincular conserva los valores semanales; actualizar el catálogo requiere una acción explícita.</p>
 {error&&<p role="alert" className="message error">{error}</p>}
 {detail.records.filter(r=>r.review!=="eliminado"&&sectionKinds[r.section]).map(row=>{const link=links.find(l=>l.record_id===row.id),master=items.find(i=>i.id===link?.master_item_id);return <article className="master-card" key={row.id}>
 <h3>{String(row.current.description||row.section)}</h3><p>{row.section} · {row.review} · Estado semanal: {String(row.current.status||"Sin definir")}</p>
 {link?<><p>Vinculado: {link.master_snapshot.code} · Versión capturada {link.master_version}{link.frozen_at?" · Publicación congelada":""}</p><details><summary>Valores capturados del catálogo</summary><AuditValues value={link.master_snapshot}/></details>{published&&<details><summary>Valores semanales publicados</summary><AuditValues value={link.payload}/></details>}</>:<p>{published?"Corte histórico sin vinculación al catálogo.":"Sin vincular."}</p>}
 {!published&&<details><summary>Valores semanales para revisar</summary><AuditValues value={row.current}/></details>}
 {!published&&<fieldset disabled={busy}>
 {!link&&row.review==="aceptado"&&<><form onSubmit={e=>{e.preventDefault();const id=new FormData(e.currentTarget).get("item");void run(()=>api(`${base}/records/${row.id}/reconcile`,{method:"POST",...json({record_version:row.version,item_id:id})}));}}><label>Elemento existente<select name="item" required><option value="">Seleccionar…</option>{items.filter(i=>!i.archived&&i.kind===sectionKinds[row.section]).map(i=><option key={i.id} value={i.id}>{i.code} · {i.name}</option>)}</select></label><button>Vincular existente</button></form><button onClick={()=>setEditor({row,item:seed(row),apply:false})}>Crear elemento revisado</button></>}
 {link&&<><button onClick={()=>void run(()=>api(`${base}/records/${row.id}/binding`,{method:"DELETE",...json({record_version:row.version})}))}>Desvincular</button>{master&&<><p>Estado actual del catálogo: {master.status} · {master.owner_name||"Sin responsable"}</p><button disabled={!!master.archived} onClick={()=>void run(()=>api(`${base}/records/${row.id}/pull`,{method:"POST",...json({record_version:row.version,item_version:master.version})}))}>Traer estado actual al borrador (requiere revisión)</button><button disabled={row.review!=="aceptado"||!!master.archived} onClick={()=>setEditor({row,item:seed(row,master),apply:true})}>Revisar cambios para aplicar al catálogo</button></>}</>}
 </fieldset>}</article>;})}
 {!detail.records.some(r=>r.review!=="eliminado"&&sectionKinds[r.section])&&<p>No hay registros conciliables en este corte.</p>}
 {editor&&<ItemEditor initial={editor.item} people={people} items={items} title={editor.apply?"Actualizar estado actual del catálogo":"Crear y vincular elemento revisado"} onClose={()=>setEditor(null)} onSave={async values=>{await api(`${base}/records/${editor.row.id}/${editor.apply?"apply":"reconcile"}`,{method:"POST",...json(editor.apply?{record_version:editor.row.version,item_version:editor.item.version,values}:{record_version:editor.row.version,new_item:values})});await reload();}}/>}
 </section>;
}
export function ProjectAudit({projectId}:{projectId:string}) {
 const [events,setEvents]=useState<{id:number;origin:string;event:string;changed_at:string;previous:string;next:string}[]>([]),[error,setError]=useState("");
 useEffect(()=>{let active=true;api(`/projects/${projectId}/audit`).then(v=>{if(active)setEvents(v);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[projectId]);
 return <section className="panel"><h2>Auditoría del proyecto</h2><p>Historial del proyecto, catálogo, responsables, cortes y revisiones.</p>{error&&<p role="alert">{error}</p>}{events.map((e,i)=><details className="cut-event" key={`${e.origin}-${e.id}-${i}`}><summary>{e.event.replaceAll("_"," ")} · {new Date(e.changed_at).toLocaleString("es-MX")}</summary><div className="editor-grid"><div><h3>Antes</h3><AuditValues value={JSON.parse(e.previous)}/></div><div><h3>Después</h3><AuditValues value={JSON.parse(e.next)}/></div></div></details>)}</section>;
}
