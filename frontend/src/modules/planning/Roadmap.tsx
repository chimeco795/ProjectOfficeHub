import { deliveryGroups } from './deliveryModel';
import { dateKey } from '../operations/calendarModel';
import { ContextField } from "../../components/ContextField";
import { iterationLabel } from "./workPresentation";
import { useState, type ReactNode } from "react";
import type { Work, Period } from "./Planning";
export function Roadmap({
  methodology, allItems, teams, members, people,
  deliverables,
  items,
  periods,
  archived,
  busy,
  onEdit,
  onPeriod,
  onAssign,
}: {
  methodology: string;
  allItems: Work[]; teams: {id:string;name:string}[]; members: any[]; people: {id:string;name:string}[];
  deliverables?: ReactNode;
  items: Work[];
  periods: Period[];
  archived: boolean;
  busy: boolean;
  onEdit: (work: Work) => void;
  onPeriod: (period: Period) => void;
  onAssign: (
    work: Work,
    key: "iteration_id" | "release_id",
    id: string | null,
  ) => Promise<void>;
}) {
  const [groupBy,setGroupBy]=useState('team'), [collapsed,setCollapsed]=useState<string[]>([]);
  const today=dateKey(new Date());
  const groups=deliveryGroups(items,allItems,groupBy,teams,members,today);
  const [showDeliverables, setShowDeliverables] = useState(false);
  const [kind, setKind] = useState<"Iteration" | "Release">("Iteration"),
    [dragging, setDragging] = useState("");
  const label =
    kind === "Iteration"
      ? iterationLabel(methodology)
      : methodology === "Hybrid"
        ? "Entrega"
        : "Release";
  const key = kind === "Iteration" ? "iteration_id" : "release_id";
  const columns = periods.filter(
    (p) => p.kind === kind && !!p.archived === archived,
  ).sort((a,b)=>(a.start_date||'9999').localeCompare(b.start_date||'9999')||a.name.localeCompare(b.name));
  const blank: Period = {
    id: "",
    kind,
    name: "",
    start_date: null,
    end_date: null,
    status: "Planned",
    description: "",
    archived: false,
    version: 1,
  };
  function cards(id: string | null, groupItems: Work[] = items) {
    return groupItems
      .filter((i) => (i[key] || null) === id)
      .map((item) => (
        <article
          className="work-card"
          key={item.id}
          draggable={!archived && !busy}
          onDragStart={(e) => {
            setDragging(item.id);
            e.dataTransfer.setData("text/plain", item.id);
          }}
          onDragEnd={() => setDragging("")}
        >
          <button onClick={() => onEdit(item)}>
            {item.code} · {item.name}
          </button>
          <p>
            {item.owner_name || "Sin responsable"} ·{" "}
            {item.progress == null ? "Avance sin definir" : `${item.progress}%`}
          </p>
          <ContextField
            label={label + " de " + item.code}
            value={item[key] || ""}
            search
            disabled={busy || archived}
            options={[
              { value: "", label: "Sin asignar" },
              ...periods
                .filter(
                  (p) => p.kind === kind && (!p.archived || p.id === item[key]),
                )
                .map((p) => ({ value: p.id, label: p.name })),
            ]}
            onSave={async (value) => onAssign(item, key, value || null)}
          />
        </article>
      ));
  }
  function drop(id: string | null) {
    const item = items.find((i) => i.id === dragging);
    setDragging("");
    if (item && !busy && !archived && item[key] !== id)
      void onAssign(item, key, id).catch(() => {});
  }
  const inactive = items.filter(
    (i) => i[key] && !columns.some((p) => p.id === i[key]),
  );
  return (
    <section className="roadmap">
      <div className="section-heading">
        <div className="workspace-tabs">
          <button
            className={
              !showDeliverables && kind === "Iteration" ? "selected" : ""
            }
            onClick={() => {
              setShowDeliverables(false);
              setKind("Iteration");
            }}
          >
            {iterationLabel(methodology)}
          </button>
          <button
            className={
              !showDeliverables && kind === "Release" ? "selected" : ""
            }
            onClick={() => {
              setShowDeliverables(false);
              setKind("Release");
            }}
          >
            {methodology === "Hybrid" ? "Entregas" : "Releases"}
          </button>
          {deliverables && (
            <button
              className={showDeliverables ? "selected" : ""}
              onClick={() => setShowDeliverables(true)}
            >
              Entregables e hitos
            </button>
          )}
        </div>
        {!showDeliverables && (
          <button onClick={() => onPeriod(blank)}>Crear {label}</button>
        )}
      </div>
      {showDeliverables ? (
        deliverables
      ) : (
        <>
          <p className="board-hint">
            Arrastra un trabajo al periodo o utiliza su selector. Cambia
            únicamente esta asignación; conserva fechas, dependencias y el otro
            tipo de periodo.
          </p>
          <label className="delivery-group">Agrupar por <select value={groupBy} onChange={e=>setGroupBy(e.target.value)}><option value="team">Equipo</option><option value="owner">Responsable</option><option value="parent">Epic / Feature / Entregable</option></select></label>
          <div className="delivery-scroll" tabIndex={0} aria-label="Distribución temporal por periodos" onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();e.currentTarget.scrollLeft+=e.key==='ArrowRight'?220:-220;}}}>
            <div className="delivery-matrix" style={{gridTemplateColumns:`180px repeat(${columns.length+1}, minmax(230px,1fr))`}}>
              <div className="delivery-head">{groupBy==='team'?'Equipo':groupBy==='owner'?'Responsable':'Agrupación'}</div>
              <div className="delivery-head">Sin {label}</div>
              {columns.map(period=><div className={'delivery-head'+(period.start_date && period.end_date && period.start_date<=today && today<=period.end_date?' period-today':'')} key={period.id}>
                <strong>{period.name}</strong><small>{period.start_date || 'Sin inicio'} → {period.end_date || 'Sin fin'}</small>
                {period.start_date && period.end_date && period.start_date<=today && today<=period.end_date && <span className="delivery-today">Hoy · {today}</span>}
                <button disabled={busy} onClick={()=>onPeriod(period)}>Editar periodo</button>
              </div>)}
              {groups.map(group=><div className="delivery-row" key={group.id}>
                <button className="delivery-label" aria-expanded={!collapsed.includes(group.id)} onClick={()=>setCollapsed(old=>old.includes(group.id)?old.filter(x=>x!==group.id):[...old,group.id])}>
                  {collapsed.includes(group.id)?'▸':'▾'} {groupBy==='owner'?people.find(p=>p.id===group.id)?.name || 'Sin responsable':group.name} · {group.items.length}
                </button>
                {[null,...columns.map(p=>p.id)].map(id=><section className={'delivery-cell'+(id && columns.some(p=>p.id===id && p.start_date && p.end_date && p.start_date<=today && today<=p.end_date)?' period-today':'')} key={id||'unassigned'}
                  aria-label={(groupBy==='owner'?people.find(p=>p.id===group.id)?.name || 'Sin responsable':group.name)+' · '+(columns.find(p=>p.id===id)?.name || 'Sin asignar')}
                  onDragOver={e=>{if(!busy&&!archived&&!collapsed.includes(group.id))e.preventDefault();}}
                  onDrop={e=>{e.preventDefault();if(!collapsed.includes(group.id))drop(id);}}>
                  {!collapsed.includes(group.id) && cards(id,group.items)}
                  {!collapsed.includes(group.id) && !group.items.some(i=>(i[key]||null)===id) && <small>Sin trabajos</small>}
                </section>)}
              </div>)}
            </div>
          </div>
          {!groups.length && <p>No hay trabajos para distribuir.</p>}
          {!!inactive.length && (
            <details>
              <summary>
                Trabajos vinculados a periodos fuera de esta vista (
                {inactive.length})
              </summary>
              {inactive.map((item) => (
                <div key={item.id}>
                  {cards(item[key])?.find((card) => card.key === item.id)}
                </div>
              ))}
            </details>
          )}
        </>
      )}
    </section>
  );
}
