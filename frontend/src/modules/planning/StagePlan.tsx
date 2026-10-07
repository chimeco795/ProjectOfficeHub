import { useState } from "react";
import type { Work } from "./Planning";
import type { Item } from "../master/ItemEditor";
import { states, stateClass, types } from "./workPresentation";
export function StagePlan({
  items,
  milestones,
  onEdit,
  onMilestones,
  waterfall = false,
}: {
  items: Work[];
  milestones: Item[];
  onEdit: (item: Work) => void;
  onMilestones: () => void;
  waterfall?: boolean;
}) {
  const [kind, setKind] = useState(waterfall ? "Phase" : "Deliverable");
  const roots =
    kind === "Milestone"
      ? milestones
      : items.filter((i) => i.work_type === kind);
  return (
    <section className="methodology-plan">
      <div className="section-heading">
        <div className="workspace-tabs">
          {(waterfall
            ? [
                ["Phase", "Fases"],
                ["Deliverable", "Entregables"],
                ["Milestone", "Hitos"],
              ]
            : [
                ["Deliverable", "Entregables"],
                ["Milestone", "Hitos"],
              ]
          ).map(([id, label]) => (
            <button
              key={id}
              className={kind === id ? "selected" : ""}
              onClick={() => setKind(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {kind === "Milestone" && (
          <button onClick={onMilestones}>Gestionar hitos</button>
        )}
      </div>
      <div className="stage-plan">
        {roots.map((item) => (
          <article className="stage-card" key={item.id}>
            <div className="section-heading">
              <button
                onClick={() =>
                  item.kind === "Activity"
                    ? onEdit(item as Work)
                    : onMilestones()
                }
              >
                <strong>
                  {item.code} · {item.name}
                </strong>
              </button>
              <span className={"field-chip " + stateClass(item.status)}>
                {states[item.status] || item.status}
              </span>
            </div>
            <p>
              {item.owner_name || "Sin responsable"} ·{" "}
              {item.start_date || "Sin inicio"} →{" "}
              {item.target_date || "Sin fecha objetivo"}
            </p>
            <div className="work-progress">
              <span style={{ width: `${item.progress || 0}%` }} />
            </div>
            <small>
              {item.progress == null
                ? "Avance sin definir"
                : `${item.progress}%`}{" "}
              · {item.executive_priority}
            </small>
            {items
              .filter((i) => i.parent_id === item.id)
              .map((child) => (
                <button
                  className="stage-child"
                  key={child.id}
                  onClick={() => onEdit(child)}
                >
                  <span>
                    {types[child.work_type]} · {child.code} · {child.name}
                  </span>
                  <small>
                    {child.target_date || "Sin fecha"} ·{" "}
                    {states[child.status] || child.status}
                  </small>
                </button>
              ))}
            {milestones
              .filter((i) => i.related_id === item.id)
              .map((m) => (
                <p key={m.id}>
                  ◇ {m.code} · {m.name} · {m.target_date || "Sin fecha"}
                </p>
              ))}
          </article>
        ))}
      </div>
      {!roots.length && (
        <p>
          No hay{" "}
          {kind === "Phase"
            ? "fases"
            : kind === "Deliverable"
              ? "entregables"
              : "hitos"}{" "}
          en esta selección. Utiliza el catálogo existente para completar el
          plan.
        </p>
      )}
    </section>
  );
}
