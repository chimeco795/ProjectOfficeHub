import {Schedule} from "./Schedule";
import { useEffect, useState } from "react";
import { api, json } from "../../api";
import type { Project } from "../../types";
import { Dialog } from "../../Dialog";
import { type Item, type Person, emptyItem } from "../master/ItemEditor";
import "./planning.css";
export type Work = Item & {
  work_type: string;
  parent_id: string | null;
  dependencies: string[];
  original_effort: number | null;
  remaining_effort: number | null;
  completed_effort: number | null;
  points: number | null;
  iteration_id: string | null;
  release_id: string | null;
};
export type Period = {
  id: string;
  kind: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  description: string;
  version: number;
  archived: boolean;
};
const states: Record<string, string> = {
  New: "Nuevo",
  Prepared: "Preparado",
  Active: "En ejecución",
  Resolved: "Resuelto",
  Closed: "Cerrado",
  Blocked: "Bloqueado",
  Removed: "Retirado",
};
const types: Record<string, string> = {
  Epic: "Épica",
  Feature: "Funcionalidad",
  EnablerFeature: "Habilitador",
  UserStory: "Historia",
  EnablerUserStory: "Historia habilitadora",
  Task: "Tarea",
  Bug: "Defecto",
  Issue: "Incidencia de trabajo",
  Phase: "Fase",
  Deliverable: "Entregable",
  Activity: "Actividad",
  Document: "Documento de trabajo",
  Evidence: "Evidencia",
};
const blank = (project: Project): Work => ({
  ...emptyItem("Activity"),
  status: "New",
  work_type: project.methodology === "Agile" ? "Task" : "Activity",
  parent_id: null,
  dependencies: [],
  original_effort: null,
  remaining_effort: null,
  completed_effort: null,
  points: null,
  iteration_id: null,
  release_id: null,
});
export function Planning({
  project,
  view,
}: {
  project: Project;
  view: string;
}) {
  const [items, setItems] = useState<Work[]>([]),
    [people, setPeople] = useState<Person[]>([]),
    [periods, setPeriods] = useState<Period[]>([]),
    [editing, setEditing] = useState<Work | null>(null),
    [period, setPeriod] = useState<Period | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [archived, setArchived] = useState(false),
    [busy, setBusy] = useState(false),
    [owner, setOwner] = useState("all"),
    [stateFilter, setStateFilter] = useState("all"),
    [dragging, setDragging] = useState("");
  const base = `/projects/${project.id}`;
  async function reload() {
    const [i, p, t] = await Promise.all([
      api(base + "/items"),
      api(base + "/people"),
      api(base + "/pmo/periods"),
    ]);
    setItems(i.filter((x: Item) => x.kind === "Activity"));
    setPeople(p);
    setPeriods(t);
  }
  useEffect(() => {
    void reload().catch((e) => setError(e.message));
  }, [base]);
  async function move(item: Work, status: string) {
    setError("");
    setBusy(true);
    try {
      await api(`${base}/items/${item.id}`, {
        method: "PUT",
        ...json({ ...item, status }),
      });
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const visible = items.filter(
    (i) =>
      !!i.archived === archived &&
      (owner === "all" ||
        i.owner_id === owner ||
        (owner === "none" && !i.owner_id)) &&
      (stateFilter === "all" || i.status === stateFilter) &&
      `${i.name} ${i.code} ${i.owner_name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const title = (
    {
      backlog: "Lista de trabajo",
      board: "Tablero",
      gantt: "Cronograma",
      roadmap: "Iteraciones y entregas",
    } as Record<string, string>
  )[view];
  const stateSelect = (item: Work) => (
    <label>
      Estado de {item.code}
      <select
        value={item.status}
        disabled={busy}
        onChange={(e) => void move(item, e.target.value)}
      >
        {!states[item.status] && <option>{item.status}</option>}
        {Object.entries(states).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>
            Organiza entregables y tareas, asigna responsables y sigue su avance.
            Metodología: {project.methodology}.
          </p>
        </div>
        <button className="primary" onClick={() => setEditing(blank(project))}>
          Nuevo trabajo
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="planning-filters">
        <label>
          Buscar trabajo
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          Responsable
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="all">Todos</option>
            <option value="none">Sin asignar</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            {[
              ...new Set([
                ...Object.keys(states),
                ...items.map((i) => i.status),
              ]),
            ].map((state) => (
              <option key={state} value={state}>
                {states[state] || state}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          Ver archivados
        </label>
      </div>
      {view === "board" && (
        <p className="board-hint" role="status">
          {busy
            ? "Guardando cambio…"
            : "Arrastra una tarjeta a otro estado o usa su selector. Ambos guardan el mismo trabajo."}
        </p>
      )}
      {view === "board" ? (
        <div className="kanban">
          {[...Object.keys(states), "Otros"].map((state) => {
            const cards = visible.filter((i) =>
              state === "Otros" ? !states[i.status] : i.status === state,
            );
            return (
              <section
                className="kanban-column"
                key={state}
                onDragOver={(e) => {
                  if (state !== "Otros" && !busy) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const item = items.find((i) => i.id === dragging);
                  setDragging("");
                  if (
                    item &&
                    state !== "Otros" &&
                    !busy &&
                    item.status !== state
                  )
                    void move(item, state);
                }}
              >
                <h3>
                  {states[state] || state} · {cards.length}
                </h3>
                {cards.map((i) => (
                  <article
                    className="work-card"
                    key={i.id}
                    draggable={!busy}
                    onDragStart={(e) => {
                      setDragging(i.id);
                      e.dataTransfer.setData("text/plain", i.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragging("")}
                  >
                    <div className="card-meta">
                      <span>{types[i.work_type]}</span>
                      <span className="card-priority">
                        {i.executive_priority}
                      </span>
                    </div>
                    <button onClick={() => setEditing(i)}>
                      {i.code} · {i.name}
                    </button>
                    <p>
                      {i.owner_name || "Sin responsable"} ·{" "}
                      {i.target_date || "Sin fecha"}
                    </p>
                    <div
                      className="work-progress"
                      aria-label={
                        i.progress == null
                          ? "Avance sin definir"
                          : `Avance ${i.progress}%`
                      }
                    >
                      <span style={{ width: `${i.progress || 0}%` }} />
                    </div>
                    {stateSelect(i)}
                  </article>
                ))}
                {!cards.length && (
                  <div className="drop-placeholder">
                    Sin trabajos en este estado
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : view === "gantt" ? (
        <Schedule items={visible} allItems={items} onEdit={setEditing} />
      ) : view === "roadmap" ? (
        <>
          <div className="button-row">
            <button
              onClick={() =>
                setPeriod({
                  id: "",
                  kind: "Iteration",
                  name: "",
                  start_date: null,
                  end_date: null,
                  status: "Planned",
                  description: "",
                  version: 1,
                  archived: false,
                })
              }
            >
              Nueva iteración / release
            </button>
          </div>
          <div className="roadmap-grid">
            {periods
              .filter((p) => !!p.archived === archived)
              .map((p) => (
                <article className="work-card" key={p.id}>
                  <h3>
                    {p.kind === "Iteration" ? "Iteración" : "Release"} ·{" "}
                    {p.name}
                  </h3>
                  <p>
                    {p.start_date || "Sin inicio"} → {p.end_date || "Sin fin"} ·{" "}
                    {p.status}
                  </p>
                  <button onClick={() => setPeriod(p)}>Editar periodo</button>
                  <ul>
                    {visible
                      .filter(
                        (i) => i.iteration_id === p.id || i.release_id === p.id,
                      )
                      .map((i) => (
                        <li key={i.id}>
                          <button onClick={() => setEditing(i)}>
                            {i.code} · {i.name}
                          </button>
                        </li>
                      ))}
                  </ul>
                </article>
              ))}
          </div>
          <h3>Trabajos sin periodo asignado</h3>
          {visible
            .filter((i) => !i.iteration_id && !i.release_id)
            .map((i) => (
              <p key={i.id}>
                <button onClick={() => setEditing(i)}>
                  {i.code} · {i.name}
                </button>
              </p>
            ))}
        </>
      ) : (
        <div className="planning-table">
          <table>
            <thead>
              <tr>
                <th>Trabajo</th>
                <th>Tipo / padre</th>
                <th>Responsable</th>
                <th>Estado</th>
                <th>Compromiso</th>
                <th>Avance</th>
                <th>Predecesores</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => (
                <tr key={i.id}>
                  <td>
                    <button onClick={() => setEditing(i)}>
                      {i.code} · {i.name}
                    </button>
                  </td>
                  <td>
                    {types[i.work_type]}
                    <br />
                    {items.find((x) => x.id === i.parent_id)?.code || "Raíz"}
                  </td>
                  <td>{i.owner_name || "Sin asignar"}</td>
                  <td>{stateSelect(i)}</td>
                  <td>{i.target_date || "Sin fecha"}</td>
                  <td>{i.progress == null ? "Sin dato" : `${i.progress}%`}</td>
                  <td>
                    {i.dependencies
                      .map((d) => items.find((x) => x.id === d)?.code || d)
                      .join(", ") || "Ninguno"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!visible.length && (
        <p>
          No hay trabajos en esta selección. Puedes crear uno o usar las
          actividades del catálogo.
        </p>
      )}
      {editing && (
        <WorkEditor
          initial={editing}
          items={items}
          people={people}
          periods={periods}
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            await api(base + "/items" + (v.id ? "/" + v.id : ""), {
              method: v.id ? "PUT" : "POST",
              ...json(v),
            });
            await reload();
          }}
        />
      )}
      {period && (
        <PeriodEditor
          initial={period}
          onClose={() => setPeriod(null)}
          onSave={async (v) => {
            await api(base + "/pmo/periods" + (v.id ? "/" + v.id : ""), {
              method: v.id ? "PUT" : "POST",
              ...json(v),
            });
            await reload();
          }}
        />
      )}
    </section>
  );
}
function WorkEditor({
  initial,
  items,
  people,
  periods,
  onClose,
  onSave,
}: {
  initial: Work;
  items: Work[];
  people: Person[];
  periods: Period[];
  onClose: () => void;
  onSave: (v: Work) => Promise<void>;
}) {
  const [v, setV] = useState(initial),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const set = (key: keyof Work, value: unknown) => setV({ ...v, [key]: value });
  return (
    <Dialog
      title={v.id ? "Editar trabajo" : "Nuevo trabajo"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSave(v);
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <div className="form-grid">
            <label>
              Código
              <input
                required
                value={v.code}
                onChange={(e) => set("code", e.target.value)}
              />
            </label>
            <label>
              Tipo de trabajo
              <select
                value={v.work_type}
                onChange={(e) => set("work_type", e.target.value)}
              >
                {Object.entries(types).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nombre
              <input
                required
                value={v.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
            <label>
              Estado
              <select
                value={v.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {!states[v.status] && <option>{v.status}</option>}
                {Object.entries(states).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Padre
              <select
                value={v.parent_id || ""}
                onChange={(e) => set("parent_id", e.target.value || null)}
              >
                <option value="">Sin padre</option>
                {items
                  .filter((i) => i.id !== v.id)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.code} · {i.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Responsable
              <select
                value={v.owner_id || ""}
                onChange={(e) => set("owner_id", e.target.value || null)}
              >
                <option value="">Sin asignar</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {(
              [
                ["start_date", "Inicio"],
                ["target_date", "Compromiso"],
              ] as const
            ).map(([k, label]) => (
              <label key={k}>
                {label}
                <input
                  type="date"
                  value={v[k] || ""}
                  onChange={(e) => set(k, e.target.value || null)}
                />
              </label>
            ))}
            {(
              [
                ["progress", "Avance (%)"],
                ["original_effort", "Esfuerzo original (horas)"],
                ["remaining_effort", "Esfuerzo restante (horas)"],
                ["completed_effort", "Esfuerzo completado (horas)"],
                ["points", "Puntos"],
              ] as const
            ).map(([k, label]) => (
              <label key={k}>
                {label}
                <input
                  type="number"
                  min="0"
                  max={k === "progress" ? 100 : undefined}
                  step="any"
                  value={v[k] ?? ""}
                  onChange={(e) =>
                    set(
                      k,
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </label>
            ))}
            <label>
              Prioridad
              <select
                value={v.executive_priority}
                onChange={(e) => set("executive_priority", e.target.value)}
              >
                {["Baja", "Media", "Alta", "Crítica"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            {(
              [
                ["iteration_id", "Iteration", "Iteración"],
                ["release_id", "Release", "Release"],
              ] as const
            ).map(([key, kind, label]) => (
              <label key={key}>
                {label}
                <select
                  value={v[key] || ""}
                  onChange={(e) => set(key, e.target.value || null)}
                >
                  <option value="">Sin asignar</option>
                  {periods
                    .filter(
                      (p) =>
                        p.kind === kind && (!p.archived || p.id === v[key]),
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
            ))}
          </div>
          <label>
            Descripción
            <textarea
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <label>
            Predecesores
            <select
              multiple
              value={v.dependencies}
              onChange={(e) =>
                set(
                  "dependencies",
                  Array.from(e.target.selectedOptions, (o) => o.value),
                )
              }
            >
              {items
                .filter((i) => i.id !== v.id)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code} · {i.name}
                  </option>
                ))}
            </select>
            <small>Ctrl para seleccionar varios. No se permiten ciclos.</small>
          </label>
          <button
            type="button"
            disabled={
              !(Number(v.completed_effort) + Number(v.remaining_effort) > 0)
            }
            onClick={() =>
              set(
                "progress",
                Math.round(
                  (Number(v.completed_effort) /
                    (Number(v.completed_effort) + Number(v.remaining_effort))) *
                    100,
                ),
              )
            }
          >
            Calcular avance desde esfuerzo
          </button>
          <label>
            <input
              type="checkbox"
              checked={!!v.include_in_report}
              onChange={(e) => set("include_in_report", e.target.checked)}
            />
            Incluir en nuevos cortes desde catálogo
          </label>
          <label>
            <input
              type="checkbox"
              checked={!!v.archived}
              onChange={(e) => set("archived", e.target.checked)}
            />
            Archivado
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="primary">Guardar trabajo</button>
        </fieldset>
      </form>
    </Dialog>
  );
}
function PeriodEditor({
  initial,
  onClose,
  onSave,
}: {
  initial: Period;
  onClose: () => void;
  onSave: (v: Period) => Promise<void>;
}) {
  const [v, setV] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog
      title="Iteración / release"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave(v);
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Tipo
            <select
              disabled={!!v.id}
              value={v.kind}
              onChange={(e) => setV({ ...v, kind: e.target.value })}
            >
              <option value="Iteration">Iteración</option>
              <option value="Release">Release</option>
            </select>
          </label>
          <label>
            Nombre
            <input
              required
              value={v.name}
              onChange={(e) => setV({ ...v, name: e.target.value })}
            />
          </label>
          <div className="form-grid">
            <label>
              Inicio
              <input
                type="date"
                value={v.start_date || ""}
                onChange={(e) =>
                  setV({ ...v, start_date: e.target.value || null })
                }
              />
            </label>
            <label>
              Fin
              <input
                type="date"
                value={v.end_date || ""}
                onChange={(e) =>
                  setV({ ...v, end_date: e.target.value || null })
                }
              />
            </label>
          </div>
          <label>
            Estado
            <input
              required
              value={v.status}
              onChange={(e) => setV({ ...v, status: e.target.value })}
            />
          </label>
          <label>
            Descripción
            <textarea
              value={v.description}
              onChange={(e) => setV({ ...v, description: e.target.value })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={!!v.archived}
              onChange={(e) => setV({ ...v, archived: e.target.checked })}
            />
            Archivado
          </label>
          {error && <p role="alert">{error}</p>}
          <button>Guardar periodo</button>
        </fieldset>
      </form>
    </Dialog>
  );
}
