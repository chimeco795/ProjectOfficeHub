import { SearchPicker, personChoices } from "../../components/SearchPicker";
import { useState } from "react";
import { Dialog } from "../../Dialog";

export type Person = { id:string; name:string; email:string; version:number };
export type Item = {
  id:string; project_id:string; kind:string; code:string; name:string; description:string; status:string;
  owner_id:string|null; owner_name:string; related_id:string|null; start_date:string|null; target_date:string|null;
  probability:string; impact:string; response:string; executive_priority:string; include_in_report:boolean|number;
  progress:number|null; archived:boolean|number; version:number;
};
export const kinds: Record<string,string> = {Risk:"Riesgos",Assumption:"Supuestos",Issue:"Incidencias",Dependency:"Dependencias",Milestone:"Hitos",Activity:"Actividades"};
export const sectionKinds: Record<string,string> = {riesgos:"Risk",general:"Assumption",problemas:"Issue",dependencias:"Dependency",hitos:"Milestone",actividades:"Activity"};
export const emptyItem = (kind="Risk"): Item => ({id:"",project_id:"",kind,code:"",name:"",description:"",status:"Abierto",owner_id:null,owner_name:"",related_id:null,start_date:null,target_date:null,probability:"",impact:"",response:"",executive_priority:"Media",include_in_report:true,progress:null,archived:false,version:1});

export function ItemEditor({ initial, people, items, title, onClose, onSave }: {
  initial: Item; people:Person[]; items:Item[]; title:string; onClose:()=>void; onSave:(value:Item)=>Promise<void>;
}) {
  const [value,setValue]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const set=(key:keyof Item,next:unknown)=>setValue({...value,[key]:next});
  return <Dialog title={title} onClose={()=>{if(!busy)onClose();}}><form onSubmit={async e=>{
    e.preventDefault();setBusy(true);setError("");try {await onSave(value);onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }}><fieldset disabled={busy}>
    <div className="form-grid">
      <label>Tipo<select value={value.kind} disabled={!!value.id} onChange={e=>set("kind",e.target.value)}>{Object.entries(kinds).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
      <label>Código<input required maxLength={60} value={value.code} onChange={e=>set("code",e.target.value)} /></label>
    </div>
    <label>Nombre / descripción breve<input required maxLength={300} value={value.name} onChange={e=>set("name",e.target.value)} /></label>
    <label>Detalle<textarea value={value.description} onChange={e=>set("description",e.target.value)} /></label>
    <div className="form-grid">
      <label>Estado<input required value={value.status} onChange={e=>set("status",e.target.value)} /></label>
      <SearchPicker label="Responsable" value={value.owner_id||""} options={personChoices(people)} onChange={v=>set("owner_id",String(v)||null)}/>
      <label>Inicio<input type="date" value={value.start_date||""} onChange={e=>set("start_date",e.target.value||null)} /></label>
      <label>Compromiso / fecha del hito<input type="date" value={value.target_date||""} onChange={e=>set("target_date",e.target.value||null)} /></label>
      <label>Probabilidad<input value={value.probability} onChange={e=>set("probability",e.target.value)} /></label>
      <label>Impacto<input value={value.impact} onChange={e=>set("impact",e.target.value)} /></label>
      <label>Prioridad ejecutiva<select value={value.executive_priority} onChange={e=>set("executive_priority",e.target.value)}>{["Baja","Media","Alta","Crítica"].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Avance (%)<input type="number" min={0} max={100} step="any" value={value.progress??""} onChange={e=>set("progress",e.target.value===""?null:Number(e.target.value))} /></label>
      <label>Elemento relacionado<select value={value.related_id||""} onChange={e=>set("related_id",e.target.value||null)}><option value="">Sin relación</option>{items.filter(i=>i.id!==value.id).map(i=><option key={i.id} value={i.id}>{i.code} · {i.name}</option>)}</select></label>
    </div>
    <label>Respuesta / mitigación<textarea value={value.response} onChange={e=>set("response",e.target.value)} /></label>
    <label><input type="checkbox" checked={!!value.include_in_report} onChange={e=>set("include_in_report",e.target.checked)} /> Incluir al crear corte desde el estado actual</label>
    <label><input type="checkbox" checked={!!value.archived} onChange={e=>set("archived",e.target.checked)} /> Archivado</label>
    <p>Estos son datos actuales del proyecto. Los cortes publicados conservan sus valores anteriores.</p>
    {error && <p role="alert" className="message error">{error}</p>}
    <button className="primary" disabled={busy}>{busy?"Guardando…":"Guardar elemento"}</button>
  </fieldset></form></Dialog>;
}
