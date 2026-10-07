import { StagePlan } from "./StagePlan";
import {
  Filter,
  Columns3,
  KanbanSquare,
  List,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  localPersonId,
  useLocalPersonId,
} from "../../components/LocalIdentity";
import { roadmapLabel } from "./methodology";
import { SearchPicker, personChoices } from "../../components/SearchPicker";
import { iterationLabel } from "./workPresentation";
import { InlineField } from "./InlineField";
import { WorkEditor } from "./WorkEditor";
import {
  states,
  types,
  allowedTypes,
  stateClass,
  hierarchy,
} from "./workPresentation";
import { Roadmap } from "./Roadmap";
import { ScheduleSimulation, type Proposal } from "./ScheduleSimulation";
import { Schedule } from "./Schedule";
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
const blank = (project: Project): Work => ({
  ...emptyItem("Activity"),
  code:
    "W-" + crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase(),
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
export function Planning(props: {
  project: Project;
  view: string;
  onViewChange: (view: string) => void;
}) {
  const person = useLocalPersonId();
  return <PlanningWorkspace key={`${props.project.id}.${person}`} {...props} />;
}
function PlanningWorkspace({
  project,
  view,
  onViewChange,
}: {
  project: Project;
  view: string;
  onViewChange: (view: string) => void;
}) {
  const [milestones, setMilestones] = useState<Item[]>([]);
  const [simulation, setSimulation] = useState<Proposal | null>(null);
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
    [typeFilter, setTypeFilter] = useState("all"),
    [level, setLevel] = useState("operational"),
    [stateFilter, setStateFilter] = useState("all"),
    [dragging, setDragging] = useState("");
  const preferenceKey = `pohub.columns.${localPersonId() || "local"}.${project.id}`;
  const [filtersOpen, setFiltersOpen] = useState(false),
    [columnsOpen, setColumnsOpen] = useState(false);
  const [columns, setColumns] = useState<string[]>(() => {
    try {
      const value = JSON.parse(localStorage.getItem(preferenceKey) || "null");
      if (
        Array.isArray(value) &&
        value.length &&
        value.every(
          (x) => typeof x === "string" && (x in states || x === "Otros"),
        )
      )
        return value;
    } catch {}
    return ["New", "Prepared", "Active", "Blocked"];
  });
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(preferenceKey + ".collapsed") || "[]",
      );
      if (Array.isArray(saved))
        return saved.filter(
          (x) => typeof x === "string" && (x in states || x === "Otros"),
        );
    } catch {}
    return [];
  });
  useEffect(() => {
    localStorage.setItem(
      preferenceKey + ".collapsed",
      JSON.stringify(collapsedColumns),
    );
  }, [collapsedColumns, preferenceKey]);
  useEffect(() => {
    localStorage.setItem(preferenceKey, JSON.stringify(columns));
  }, [columns, preferenceKey]);
  const filterCount = [
    !!query,
    owner !== "all",
    typeFilter !== "all",
    stateFilter !== "all",
    archived,
    level !== "operational",
  ].filter(Boolean).length;
  const clearFilters = () => {
    setQuery("");
    setOwner("all");
    setTypeFilter("all");
    setStateFilter("all");
    setArchived(false);
    setLevel("operational");
  };
  const base = `/projects/${project.id}`;
  async function reload() {
    const [i, p, t] = await Promise.all([
      api(base + "/items"),
      api(base + "/people"),
      api(base + "/pmo/periods"),
    ]);
    setMilestones(i.filter((x: Item) => x.kind === "Milestone"));
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
  const visibleMilestones = milestones.filter(
    (i) =>
      !!i.archived === archived &&
      typeFilter === "all" &&
      (owner === "all" ||
        i.owner_id === owner ||
        (owner === "none" && !i.owner_id)) &&
      (stateFilter === "all" || i.status === stateFilter) &&
      `${i.code} ${i.name} ${i.owner_name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const visible = items.filter(
    (i) =>
      !!i.archived === archived &&
      (typeFilter === "all" || i.work_type === typeFilter) &&
      (!["board", "backlog"].includes(view) ||
        level === "all" ||
        (level === "operational"
          ? [
              "UserStory",
              "EnablerUserStory",
              "Task",
              "Bug",
              "Issue",
              "Activity",
              "Document",
              "Evidence",
            ].includes(i.work_type)
          : [
              "Epic",
              "Feature",
              "EnablerFeature",
              "Phase",
              "Deliverable",
            ].includes(i.work_type))) &&
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
      roadmap: roadmapLabel(project.methodology),
    } as Record<string, string>
  )[view];
  async function update(item: Work, key: keyof Work, value: string) {
    const saved = await api(`${base}/items/${item.id}`, {
      method: "PUT",
      ...json({ ...item, [key]: value || null }),
    });
    setItems((current) => current.map((i) => (i.id === saved.id ? saved : i)));
  }
  const inline = (
    item: Work,
    key: keyof Work,
    label: string,
    options?: Record<string, string>,
    display?: string,
  ) => (
    <InlineField
      label={`${label} de ${item.code}`}
      value={String(item[key] ?? "")}
      display={display}
      options={options}
      searchable={key === "owner_id"}
      choices={
        key === "owner_id"
          ? [{ value: "", label: "Sin asignar" }, ...personChoices(people)]
          : undefined
      }
      className={key === "status" ? stateClass(item.status) : ""}
      onSave={(value) => update(item, key, value)}
    />
  );
  const stateSelect = (item: Work) =>
    inline(item, "status", "Estado", {
      ...states,
      ...(!states[item.status] ? { [item.status]: item.status } : {}),
    });
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>
            Organiza entregables y tareas, asigna responsables y sigue su
            avance. Metodología: {project.methodology}.
          </p>
        </div>
        <div className="planning-actions">
          {["board", "backlog"].includes(view) && (
            <div className="view-switch" aria-label="Vista del trabajo">
              <button
                aria-label="Vista Tablero"
                aria-pressed={view === "board"}
                onClick={() => onViewChange("board")}
              >
                <KanbanSquare size={16} /> Tablero
              </button>
              <button
                aria-label="Vista Lista"
                aria-pressed={view === "backlog"}
                onClick={() => onViewChange("backlog")}
              >
                <List size={16} /> Lista
              </button>
            </div>
          )}
          <button
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter size={16} /> Filtros{filterCount ? ` · ${filterCount}` : ""}
          </button>
          {view === "board" && (
            <button
              aria-expanded={columnsOpen}
              onClick={() => setColumnsOpen(!columnsOpen)}
            >
              <Columns3 size={16} /> Columnas
            </button>
          )}
          <button
            className="primary"
            onClick={() => setEditing(blank(project))}
          >
            Nuevo trabajo
          </button>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {filtersOpen && (
        <div className="planning-filters">
          <label>
            Buscar trabajo
            <input value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <SearchPicker
            label="Responsable"
            value={owner}
            options={[
              { value: "all", label: "Todos" },
              { value: "none", label: "Sin asignar" },
              ...personChoices(people),
            ]}
            onChange={(value) => setOwner(String(value) || "all")}
          />
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
            Tipo
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Todos los tipos</option>
              {[
                ...new Set([
                  ...allowedTypes(project.methodology),
                  ...items.map((i) => i.work_type),
                ]),
              ].map((t) => (
                <option key={t} value={t}>
                  {types[t] || t}
                </option>
              ))}
            </select>
          </label>
          {["board", "backlog"].includes(view) && (
            <label>
              Nivel
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="operational">Trabajo operativo</option>
                <option value="strategic">Épicas y entregables</option>
                <option value="all">Todos los niveles</option>
              </select>
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => setArchived(e.target.checked)}
            />
            Ver archivados
          </label>
          <button onClick={clearFilters}>Limpiar filtros</button>
          <button onClick={() => setFiltersOpen(false)}>Cerrar filtros</button>
        </div>
      )}
      {view === "board" && columnsOpen && (
        <div className="columns-panel" aria-label="Columnas disponibles">
          {[...Object.keys(states), "Otros"].map((state) => (
            <label key={state}>
              <input
                type="checkbox"
                checked={columns.includes(state)}
                disabled={columns.length === 1 && columns.includes(state)}
                onChange={(e) =>
                  setColumns((old) =>
                    e.target.checked
                      ? [...Object.keys(states), "Otros"].filter(
                          (x) => old.includes(x) || x === state,
                        )
                      : old.filter((x) => x !== state),
                  )
                }
              />
              {states[state] || state}
            </label>
          ))}
          <button onClick={() => setColumnsOpen(false)}>Cerrar columnas</button>
        </div>
      )}
      {view === "board" && (
        <p className="board-hint" role="status">
          {busy
            ? "Guardando cambio…"
            : "Arrastra una tarjeta a otro estado o usa su selector. Ambos guardan el mismo trabajo."}
        </p>
      )}
      {view === "board" && (
        <small className="board-count">
          {visible.length} trabajos en la selección ·{" "}
          {
            visible.filter(
              (i) => !columns.includes(states[i.status] ? i.status : "Otros"),
            ).length
          }{" "}
          en columnas ocultas
        </small>
      )}
      {view === "board" ? (
        <div className="kanban">
          {columns.map((state, columnIndex) => {
            const cards = visible.filter((i) =>
              state === "Otros" ? !states[i.status] : i.status === state,
            );
            return (
              <section
                className={
                  "kanban-column " +
                  stateClass(state) +
                  (collapsedColumns.includes(state) ? " column-collapsed" : "")
                }
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
                  {(columnIndex === 0 ||
                    columnIndex === columns.length - 1) && (
                    <button
                      aria-label={
                        (collapsedColumns.includes(state)
                          ? "Expandir "
                          : "Colapsar ") + (states[state] || state)
                      }
                      aria-expanded={!collapsedColumns.includes(state)}
                      onClick={() =>
                        setCollapsedColumns((old) =>
                          old.includes(state)
                            ? old.filter((x) => x !== state)
                            : [...old, state],
                        )
                      }
                    >
                      {collapsedColumns.includes(state) ? (
                        <ChevronRight size={14} />
                      ) : (
                        <ChevronLeft size={14} />
                      )}
                    </button>
                  )}
                </h3>
                {!collapsedColumns.includes(state) &&
                  cards.map((i) => (
                    <article
                      className={"work-card " + stateClass(i.status)}
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
                {!collapsedColumns.includes(state) && !cards.length && (
                  <div className="drop-placeholder">
                    Sin trabajos en este estado
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : view === "gantt" ? (
        <>
          <Schedule
            items={visible}
            allItems={items}
            onEdit={setEditing}
            simulation={simulation}
          />
          <ScheduleSimulation
            projectId={project.id}
            revision={JSON.stringify(items.map((i) => [i.id, i.version]))}
            onApplied={reload}
            onPreview={setSimulation}
          />
        </>
      ) : view === "roadmap" ? (
        project.methodology === "Waterfall" ? (
          <StagePlan
            waterfall
            items={visible}
            milestones={visibleMilestones}
            onEdit={setEditing}
            onMilestones={() => onViewChange("master")}
          />
        ) : (
          <Roadmap
            deliverables={
              project.methodology === "Hybrid" ? (
                <StagePlan
                  items={visible}
                  milestones={visibleMilestones}
                  onEdit={setEditing}
                  onMilestones={() => onViewChange("master")}
                />
              ) : undefined
            }
            methodology={project.methodology}
            items={visible}
            periods={periods}
            archived={archived}
            busy={busy}
            onEdit={setEditing}
            onPeriod={setPeriod}
            onAssign={async (item, key, id) => {
              setBusy(true);
              setError("");
              try {
                await api(`${base}/items/${item.id}`, {
                  method: "PUT",
                  ...json({ ...item, [key]: id }),
                });
                await reload();
              } catch (e) {
                setError((e as Error).message);
                throw e;
              } finally {
                setBusy(false);
              }
            }}
          />
        )
      ) : (
        <div className="planning-table">
          <table>
            <thead>
              <tr>
                <th>Trabajo</th>
                <th>Tipo / padre</th>
                <th>Responsable</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Compromiso</th>
                <th>Avance</th>
                <th>Predecesores</th>
              </tr>
            </thead>
            <tbody>
              {hierarchy(visible, items).map(({ item: i, depth }) => (
                <tr key={i.id}>
                  <td>
                    <button
                      style={{ paddingLeft: Math.min(depth, 5) * 12 }}
                      title={`${i.code} · ${i.name}`}
                      onClick={() => setEditing(i)}
                    >
                      {i.code} · {i.name}
                    </button>
                  </td>
                  <td>
                    {inline(
                      i,
                      "work_type",
                      "Tipo",
                      Object.fromEntries(
                        [
                          ...new Set([
                            ...allowedTypes(project.methodology),
                            i.work_type,
                          ]),
                        ].map((t) => [t, types[t] || t]),
                      ),
                    )}
                    <br />
                    {items.find((x) => x.id === i.parent_id)?.code || "Raíz"}
                  </td>
                  <td>
                    {inline(
                      i,
                      "owner_id",
                      "Responsable",
                      Object.fromEntries([
                        ["", "Sin asignar"],
                        ...people.map((p) => [p.id, p.name]),
                      ]),
                      i.owner_name || "Sin asignar",
                    )}
                  </td>
                  <td>{stateSelect(i)}</td>
                  <td>
                    {inline(
                      i,
                      "executive_priority",
                      "Prioridad",
                      Object.fromEntries(
                        ["Baja", "Media", "Alta", "Crítica"].map((p) => [p, p]),
                      ),
                    )}
                  </td>
                  <td>
                    {inline(
                      i,
                      "target_date",
                      "Fecha objetivo",
                      undefined,
                      i.target_date || "Sin fecha",
                    )}
                  </td>
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
          methodology={project.methodology}
          projectId={project.id}
          initial={editing}
          items={items}
          people={people}
          periods={periods}
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            const saved = await api(
              base + "/items" + (v.id ? "/" + v.id : ""),
              {
                method: v.id ? "PUT" : "POST",
                ...json(v),
              },
            );
            setItems((current) =>
              v.id
                ? current.map((i) => (i.id === saved.id ? saved : i))
                : [...current, saved],
            );
            return saved;
          }}
        />
      )}
      {period && (
        <PeriodEditor
          initial={period}
          methodology={project.methodology}
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
function PeriodEditor({
  methodology,
  initial,
  onClose,
  onSave,
}: {
  methodology: string;
  initial: Period;
  onClose: () => void;
  onSave: (v: Period) => Promise<void>;
}) {
  const [v, setV] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog
      title={iterationLabel(methodology) + " / Release"}
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
              <option value="Iteration">{iterationLabel(methodology)}</option>
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
