import { useEffect, useState } from "react";
import type { Cut } from "../../types";
import { api } from "../../api";

import "./executive.css";

export function CutHistory({ cuts, onOpen, onCreate, busy }: {
  cuts: Cut[]; onOpen: (id: string) => void; onCreate: () => void; busy: boolean;
}) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const visible = cuts.filter(c => (filter === "all" || c.status === filter) && c.report_date.includes(query));
  return <section className="panel">
    <div className="section-heading"><div><h2>Histórico semanal</h2>
      <p>Los borradores se pueden revisar. Las publicaciones conservan su información histórica.</p></div>
      <button className="primary" onClick={onCreate} disabled={busy}>Nuevo corte semanal</button></div>
    <div className="executive-filters">
      <label>Estado del corte<select value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="all">Todos</option><option value="borrador">Borradores</option><option value="publicado">Publicados</option>
      </select></label>
      <label>Buscar fecha<input placeholder="AAAA-MM-DD" value={query} onChange={e => setQuery(e.target.value)} /></label>
    </div>
    <div className="cut-history-grid">
      {visible.map(c => <article className="cut-history-card" key={c.id}>
        <div className="section-heading"><h3>{c.report_date}</h3><span className={"badge " + (c.status === "publicado" ? "aceptado" : "pendiente")}>{c.status === "publicado" ? "Publicado" : "Borrador"}</span></div>
        <p>Periodo: {c.start_date || "Sin definir"} — {c.end_date || "Sin definir"}</p>
        <dl className="cut-metrics">
          <div><dt>Planeado</dt><dd>{c.metadata.planned == null ? "Sin definir" : `${c.metadata.planned}%`}</dd></div>
          <div><dt>Real</dt><dd>{c.metadata.actual == null ? "Sin definir" : `${c.metadata.actual}%`}</dd></div>
        </dl>
        <p>{c.record_count ?? 0} registros · {c.pending_count ?? 0} por revisar</p>
        {c.published_at && <p>Publicado: {new Date(c.published_at).toLocaleString("es-MX")}</p>}
        <button disabled={busy} onClick={() => onOpen(c.id)}>{c.status === "publicado" ? "Consultar publicación" : "Continuar revisión"}</button>
      </article>)}
    </div>
    {!visible.length && <p role="status">No hay cortes con estos filtros.</p>}
  </section>;
}

type Event = { id: number; changed_at: string; event: string; previous: string; next: string; location?: string; section?: string };
const eventNames: Record<string,string> = { crear:"Creación del corte", copiar:"Copia de corte anterior", importar:"Importación de archivo", editar:"Edición del resumen", publicar:"Publicación", registro:"Cambio de registro" };
export function CutTimeline({ cutId, version }: { cutId: string; version: number }) {
  const [events,setEvents] = useState<Event[]>([]);
  const [error,setError] = useState("");
  useEffect(() => {
    let active=true;
    setEvents([]);setError("");
    api(`/cuts/${cutId}/timeline`).then(result => { if(active)setEvents(result); }).catch(e => { if(active)setError(e.message); });
    return () => { active=false; };
  }, [cutId,version]);
  return <section className="panel"><h2>Trazabilidad del corte</h2>
    <p>Creación, importaciones, correcciones y publicación conservadas en este corte.</p>
    {error && <p role="alert">{error}</p>}
    {events.map((event,index) => <details className="cut-event" key={`${event.event}-${event.id}-${index}`}>
      <summary>{eventNames[event.event] || event.event} · {new Date(event.changed_at).toLocaleString("es-MX")}</summary>
      {event.location && <p>{event.section} · {event.location}</p>}
      <div className="editor-grid"><div><h3>Antes</h3><AuditValues value={JSON.parse(event.previous)} /></div>
        <div><h3>Después</h3><AuditValues value={JSON.parse(event.next)} /></div></div>
    </details>)}
    {!error && !events.length && <p>Sin eventos registrados para este corte.</p>}
  </section>;
}

const auditLabels: Record<string,string> = {
  header:"Encabezado", value:"Valor", cached:"Valor almacenado", format:"Formato",
  current:"Valores corregidos", original:"Valores originales", metadata:"Resumen semanal", description:"Descripción",
  owner:"Responsable", section:"Sección", review:"Revisión", filename:"Archivo", count:"Registros",
  warnings:"Observaciones", start_date:"Inicio", end_date:"Fin", report_date:"Fecha del corte",
  planned:"Planeado", actual:"Real", executive_comment:"Resumen ejecutivo", project_snapshot:"Proyecto al publicar",
  name:"Nombre", status:"Estado", changed_at:"Fecha", copy_from:"Corte de origen", location:"Ubicación de origen",
};
function AuditValues({value}: {value: unknown}) {
  if (value == null || value === "") return <span>Sin dato</span>;
  if (typeof value !== "object") return <span>{String(value)}</span>;
  if (Array.isArray(value)) return <span>{value.map(v => typeof v === "object" ? JSON.stringify(v) : String(v)).join("; ") || "Sin datos"}</span>;
  const entries = Object.entries(value).filter(([key]) => !["id","cut_id","source_id","version","generated","modified","parent_record_id"].includes(key));
  if (!entries.length) return <span>Sin datos anteriores</span>;
  return <dl className="audit-values">{entries.map(([key,raw]) => {
    let item = raw;
    if (typeof raw === "string" && ["current","original","metadata","project_snapshot"].includes(key)) {
      try { item=JSON.parse(raw); } catch { /* Keep legacy plain text. */ }
    }
    return <div key={key}><dt>{auditLabels[key] || key}</dt><dd>{key === "brand_logo" ? (raw ? "Logotipo configurado" : "Sin logotipo") : <AuditValues value={item} />}</dd></div>;
  })}</dl>;
}
