import { ContextField } from "../../components/ContextField";
import { iterationLabel } from "./workPresentation";
import { useState, type ReactNode } from "react";
import type { Work, Period } from "./Planning";
export function Roadmap({
  methodology,
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
  );
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
  function cards(id: string | null) {
    return items
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
          <div className="roadmap-lanes">
            <section
              onDragOver={(e) => {
                if (!busy && !archived) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                drop(null);
              }}
            >
              <h3>Sin {label}</h3>
              {cards(null)}
              <div className="drop-placeholder">Trabajos por asignar</div>
            </section>
            {columns.map((period) => (
              <section
                key={period.id}
                onDragOver={(e) => {
                  if (!busy && !archived) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  drop(period.id);
                }}
              >
                <div className="section-heading">
                  <h3>{period.name}</h3>
                  <button disabled={busy} onClick={() => onPeriod(period)}>
                    Editar
                  </button>
                </div>
                <p>
                  {period.start_date || "Sin inicio"} →{" "}
                  {period.end_date || "Sin fin"}
                </p>
                <small>
                  {period.status} ·{" "}
                  {items.filter((i) => i[key] === period.id).length} trabajos en
                  esta selección
                </small>
                {cards(period.id)}
                <div className="drop-placeholder">Asignar a {period.name}</div>
              </section>
            ))}
          </div>
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
