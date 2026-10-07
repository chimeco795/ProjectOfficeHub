import { useState } from "react";
import { Dialog } from "../../Dialog";
import { ContextField } from "../../components/ContextField";
import { WorkComments } from "./WorkComments";
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
      value={work[key]}
      options={
        options
          ? Object.entries(options).map(([value, label]) => ({ value, label }))
          : undefined
      }
      type={type}
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
      onClose={() => {
        if (!busy && !editing) onClose();
      }}
    >
      <div className="work-detail-heading">
        <span className="eyebrow">{work.code}</span>
        <h3>{work.name}</h3>
        <span className={"field-chip " + stateClass(work.status)}>
          {states[work.status] || work.status}
        </span>
      </div>
      {editing && (
        <p role="status">Guarda o cancela el campo activo para continuar.</p>
      )}
      <div className="detail-grid">
        {field("name", "Nombre")}
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
      </div>
      <div className="work-sections">
        <details>
          <summary>Planificación</summary>
          <div className="detail-grid">
            {field("code", "Código")}
            {field("start_date", "Inicio", undefined, "date")}
            {field("progress", "Avance (%)", undefined, "number")}
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
            {(["Iteration", "Release"] as const).map((kind) =>
              field(
                kind === "Iteration" ? "iteration_id" : "release_id",
                kind === "Iteration" ? "Iteración" : "Release",
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
        </details>
        <details>
          <summary>Esfuerzo</summary>
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
        </details>
        <details>
          <summary>Dependencias · {work.dependencies.length}</summary>
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
        </details>
        <details>
          <summary>Reporte ejecutivo</summary>
          {field("include_in_report", "Incluir en nuevos cortes", {
            true: "Sí",
            false: "No",
          })}
          <p>Los cortes publicados conservan su información histórica.</p>
        </details>
      </div>
      {field("description", "Descripción", undefined, "textarea")}
      {error && <p role="alert">{error}</p>}
      <details className="work-comments-section">
        <summary>Conversación</summary>
        <WorkComments projectId={projectId} itemId={work.id} onBusy={setBusy} />
      </details>
      <div className="editor-footer">
        <button disabled={busy || !!editing} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Dialog>
  );
}
