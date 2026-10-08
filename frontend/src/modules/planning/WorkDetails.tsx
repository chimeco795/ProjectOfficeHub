import { useState } from "react";
import { Dialog } from "../../Dialog";
import { ContextField } from "../../components/ContextField";
import { personChoices } from "../../components/SearchPicker";
import { iterationLabel } from "./workPresentation";
import { WorkComments } from "./WorkComments";
import { Attachments } from '../operations/Attachments';
import { states, types, allowedTypes, stateClass } from "./workPresentation";
import type { Work, Period } from "./Planning";
import type { Person } from "../master/ItemEditor";
export function WorkDetails({
  initial,
  methodology,
  items,
  people,
  periods,
  projectId,
  onSave,
  onClose,
}: {
  initial: Work;
  methodology: string;
  items: Work[];
  people: Person[];
  periods: Period[];
  projectId: string;
  onSave: (v: Work) => Promise<Work>;
  onClose: () => void;
}) {
  const [work, setWork] = useState(initial),
    [editing, setEditing] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(key: keyof Work, value: any) {
    setBusy(true);
    try {
      const saved = await onSave({ ...work, [key]: value });
      setWork(saved);
    } finally {
      setBusy(false);
    }
  }
  const field = (
    key: keyof Work,
    label: string,
    options?: Record<string, string>,
    type = "text",
    search = false,
  ) => (
    <ContextField
      key={key}
      label={label}
      value={['archived','include_in_report'].includes(key) ? String(!!work[key]) : work[key]}
      options={
        key === 'owner_id' ? personChoices(people) : options
          ? Object.entries(options).map(([value, label]) => ({ value, label }))
          : undefined
      }
      type={type}
      showLabel={key !== 'name'}
      confirm={key === 'archived'}
      search={search}
      required={["name", "code"].includes(key)}
      min={type === "number" ? 0 : undefined}
      max={key === "progress" ? 100 : undefined}
      disabled={busy || (!!editing && editing !== key)}
      className={key === "status" ? stateClass(work.status) : ""}
      onEditing={(open) => setEditing(open ? key : "")}
      onSave={(v) =>
        save(
          key,
          ["archived", "include_in_report"].includes(key)
            ? v === "true"
            : type === "number"
              ? v === ""
                ? null
                : Number(v)
              : [
                    "owner_id",
                    "parent_id",
                    "start_date",
                    "target_date",
                    "iteration_id",
                    "release_id",
                  ].includes(key)
                ? v || null
                : v,
        )
      }
    />
  );
  const persons = Object.fromEntries([
    ["", "Sin asignar"],
    ...people.map((p) => [p.id, p.name]),
  ]);
  return (
    <Dialog
      title="Detalle del trabajo"
      className="work-detail-dialog"
      onClose={() => {
        if (!busy && !editing) onClose();
      }}
    >
      <div className="work-detail-heading">
        <span className="eyebrow">{work.code} · {types[work.work_type] || work.work_type}</span>
        <h3>{field("name", "Nombre")}</h3>
        <span className={"field-chip " + stateClass(work.status)}>
          {states[work.status] || work.status}
        </span>
      </div>
      <div className="detail-grid">
        {field("status", "Estado", {
          ...states,
          ...(!states[work.status] ? { [work.status]: work.status } : {}),
        })}
        {field("owner_id", "Responsable", persons, "text", true)}
        {field(
          "executive_priority",
          "Prioridad",
          Object.fromEntries(
            ["Baja", "Media", "Alta", "Crítica"].map((v) => [v, v]),
          ),
        )}
        {field(
          "work_type",
          "Tipo",
          Object.fromEntries(
            [...new Set([...allowedTypes(methodology), work.work_type])].map(
              (t) => [t, types[t] || t],
            ),
          ),
        )}
        {field("target_date", "Fecha compromiso", undefined, "date")}
        {field("start_date", "Inicio", undefined, "date")}
        {field("progress", "Avance (%)", undefined, "number")}
        {field("iteration_id", iterationLabel(methodology), Object.fromEntries([["", "Sin asignar"], ...periods.filter(p=>p.kind==='Iteration').map(p=>[p.id,p.name])]),"text",true)}
      </div>
      <div className="work-sections">
        <section className="work-detail-block">
          <h4>Planificación</h4>
          <div className="detail-grid">
            {field("code", "Código")}
            {field(
              "parent_id",
              "Padre",
              Object.fromEntries([
                ["", "Sin padre"],
                ...items
                  .filter(
                    (i) =>
                      i.id !== work.id &&
                      (!i.archived || i.id === work.parent_id),
                  )
                  .map((i) => [i.id, `${i.code} · ${i.name}`]),
              ]),
              "text",
              true,
            )}
            {(["Release"] as const).map((kind) =>
              field(
                "release_id",
                (methodology === "Hybrid" ? "Entrega" : "Release"),
                Object.fromEntries([
                  ["", "Sin asignar"],
                  ...periods
                    .filter((p) => p.kind === kind)
                    .map((p) => [p.id, p.name]),
                ]),
                "text",
                true,
              ),
            )}
            {field("archived", "Archivo", {
              false: "Activo",
              true: "Archivado",
            })}
          </div>
        </section>
        <section className="work-detail-block">
          <h4>Esfuerzo</h4>
          <div className="detail-grid">
            {field("original_effort", "Original (h)", undefined, "number")}
            {field("remaining_effort", "Restante (h)", undefined, "number")}
            {field("completed_effort", "Completado (h)", undefined, "number")}
            {field("points", "Puntos", undefined, "number")}
          </div>
          <button
            disabled={
              busy ||
              !!editing ||
              !(
                Number(work.completed_effort) + Number(work.remaining_effort) >
                0
              )
            }
            onClick={() =>
              void save(
                "progress",
                Math.round(
                  (Number(work.completed_effort) /
                    (Number(work.completed_effort) +
                      Number(work.remaining_effort))) *
                    100,
                ),
              ).catch((e) => setError(e.message))
            }
          >
            Calcular avance desde esfuerzo
          </button>
        </section>
        <section className="work-detail-block">
          <h4>Dependencias · {work.dependencies.length}</h4>
          <ContextField
            label="Predecesores"
            value={work.dependencies}
            options={items
              .filter(
                (i) =>
                  i.id !== work.id &&
                  (!i.archived || work.dependencies.includes(i.id)),
              )
              .map((i) => ({ value: i.id, label: `${i.code} · ${i.name}` }))}
            search
            multiple
            disabled={busy || (!!editing && editing !== "dependencies")}
            onEditing={(open) => setEditing(open ? "dependencies" : "")}
            onSave={(v) => save("dependencies", v)}
          />
        </section>
        <section className="work-detail-block">
          <h4>Reporte ejecutivo</h4>
          {field("include_in_report", "Incluir en nuevos cortes", {
            true: "Sí",
            false: "No",
          })}
          <p>Los cortes publicados conservan su información histórica.</p>
        </section>
      </div>
      <div className="work-detail-bottom">
      <section className="work-detail-block work-detail-description">{field("description", "Descripción", undefined, "textarea")}</section>
      <section className="work-comments-section work-detail-block">
        <h4>Conversación</h4>
        <WorkComments compact projectId={projectId} itemId={work.id} onBusy={setBusy} />
      </section>
      </div>
      <Attachments projectId={projectId} kind="item" id={work.id}/>
      {error && <p role="alert">{error}</p>}
      <div className="editor-footer">
        <button disabled={busy || !!editing} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Dialog>
  );
}
