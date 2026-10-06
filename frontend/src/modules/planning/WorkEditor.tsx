import { useState } from "react";
import { Dialog } from "../../Dialog";
import type { Person } from "../master/ItemEditor";
import type { Work, Period } from "./Planning";
import { states, types, allowedTypes } from "./workPresentation";
import { WorkComments } from "./WorkComments";
export function WorkEditor({
  projectId,
  methodology,
  initial,
  items,
  people,
  periods,
  onClose,
  onSave,
}: {
  projectId: string;
  methodology: string;
  initial: Work;
  items: Work[];
  people: Person[];
  periods: Period[];
  onClose: () => void;
  onSave: (value: Work) => Promise<Work>;
}) {
  const [v, setV] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [created, setCreated] = useState(false);
  const set = (key: keyof Work, value: unknown) =>
    setV((current) => ({ ...current, [key]: value }));
  const select = (
    key: keyof Work,
    label: string,
    options: Record<string, string>,
    nullable = false,
  ) => (
    <label>
      {label}
      <select
        value={String(v[key] ?? "")}
        onChange={(e) => set(key, e.target.value || (nullable ? null : ""))}
      >
        {Object.entries(options).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
  const date = (key: "start_date" | "target_date", label: string) => (
    <label>
      {label}
      <input
        type="date"
        value={v[key] || ""}
        onChange={(e) => set(key, e.target.value || null)}
      />
    </label>
  );
  const num = (
    key:
      | "progress"
      | "original_effort"
      | "remaining_effort"
      | "completed_effort"
      | "points",
    label: string,
  ) => (
    <label>
      {label}
      <input
        type="number"
        min="0"
        max={key === "progress" ? 100 : undefined}
        step="any"
        value={v[key] ?? ""}
        onChange={(e) =>
          set(key, e.target.value === "" ? null : Number(e.target.value))
        }
      />
    </label>
  );
  return (
    <Dialog
      title={v.id ? "Detalles del trabajo" : "Nuevo trabajo"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {created && (
        <p role="status" className="success">
          Trabajo creado. Ya puedes completar sus detalles.
        </p>
      )}
      {!v.id && (
        <p>
          Empieza con lo esencial. Podrás completar la planificación después.
        </p>
      )}
      <form
        className="progressive-work"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const saved = await onSave(v);
            if (v.id) onClose();
            else {
              setV(saved);
              setCreated(true);
            }
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <div className="form-grid">
            {select(
              "work_type",
              "Tipo",
              Object.fromEntries(
                [
                  ...new Set([
                    ...allowedTypes(methodology),
                    ...(v.id ? [v.work_type] : []),
                  ]),
                ].map((t) => [t, types[t] || t]),
              ),
            )}
            <label>
              Nombre
              <input
                autoFocus
                required
                value={v.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
            {select(
              "owner_id",
              "Responsable",
              Object.fromEntries([
                ["", "Sin asignar"],
                ...people.map((p) => [p.id, p.name]),
              ]),
              true,
            )}
            {select("status", "Estado", {
              ...states,
              ...(!states[v.status] ? { [v.status]: v.status } : {}),
            })}
            {select(
              "executive_priority",
              "Prioridad",
              Object.fromEntries(
                ["Baja", "Media", "Alta", "Crítica"].map((p) => [p, p]),
              ),
            )}
            {date("target_date", "Fecha objetivo")}
          </div>
          {v.id && (
            <div className="work-sections">
              <details>
                <summary>
                  Planificación{" "}
                  <small>Código, jerarquía, fechas y periodos</small>
                </summary>
                <div className="form-grid">
                  <label>
                    Código
                    <input
                      required
                      value={v.code}
                      onChange={(e) => set("code", e.target.value)}
                    />
                  </label>
                  {select(
                    "parent_id",
                    "Trabajo padre",
                    Object.fromEntries([
                      ["", "Sin padre"],
                      ...items
                        .filter(
                          (i) =>
                            i.id !== v.id &&
                            (!i.archived || i.id === v.parent_id),
                        )
                        .map((i) => [i.id, `${i.code} · ${i.name}`]),
                    ]),
                    true,
                  )}
                  {date("start_date", "Inicio")}
                  {num("progress", "Avance (%)")}
                  {select(
                    "iteration_id",
                    "Iteración",
                    Object.fromEntries([
                      ["", "Sin asignar"],
                      ...periods
                        .filter(
                          (p) =>
                            p.kind === "Iteration" &&
                            (!p.archived || p.id === v.iteration_id),
                        )
                        .map((p) => [p.id, p.name]),
                    ]),
                    true,
                  )}
                  {select(
                    "release_id",
                    "Entrega / release",
                    Object.fromEntries([
                      ["", "Sin asignar"],
                      ...periods
                        .filter(
                          (p) =>
                            p.kind === "Release" &&
                            (!p.archived || p.id === v.release_id),
                        )
                        .map((p) => [p.id, p.name]),
                    ]),
                    true,
                  )}
                </div>
                <label>
                  Descripción
                  <textarea
                    value={v.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={!!v.archived}
                    onChange={(e) => set("archived", e.target.checked)}
                  />
                  Archivado
                </label>
              </details>
              <details>
                <summary>
                  Esfuerzo <small>Horas y puntos</small>
                </summary>
                <div className="form-grid">
                  {num("original_effort", "Original (horas)")}
                  {num("remaining_effort", "Restante (horas)")}
                  {num("completed_effort", "Completado (horas)")}
                  {num("points", "Puntos")}
                </div>
                <button
                  type="button"
                  disabled={
                    !(
                      Number(v.completed_effort) + Number(v.remaining_effort) >
                      0
                    )
                  }
                  onClick={() =>
                    set(
                      "progress",
                      Math.round(
                        (Number(v.completed_effort) /
                          (Number(v.completed_effort) +
                            Number(v.remaining_effort))) *
                          100,
                      ),
                    )
                  }
                >
                  Calcular avance desde esfuerzo
                </button>
              </details>
              <details>
                <summary>
                  Dependencias{" "}
                  <small>{v.dependencies.length} predecesores</small>
                </summary>
                <div className="dependency-chips">
                  {v.dependencies.map((id) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() =>
                        set(
                          "dependencies",
                          v.dependencies.filter((d) => d !== id),
                        )
                      }
                      aria-label={
                        "Quitar predecesor " +
                        (items.find((i) => i.id === id)?.code || id)
                      }
                    >
                      {items.find((i) => i.id === id)?.code || id} ×
                    </button>
                  ))}
                </div>
                <label>
                  Buscar predecesor
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Código o nombre"
                  />
                </label>
                {search.trim() && (
                  <ul
                    className="dependency-results"
                    aria-label="Predecesores disponibles"
                  >
                    {items
                      .filter(
                        (i) =>
                          i.id !== v.id &&
                          !i.archived &&
                          !v.dependencies.includes(i.id) &&
                          `${i.code} ${i.name}`
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                      )
                      .map((i) => (
                        <li key={i.id}>
                          <button
                            type="button"
                            onClick={() => {
                              set("dependencies", [...v.dependencies, i.id]);
                              setSearch("");
                            }}
                          >
                            Añadir {i.code} · {i.name}
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
                <small>
                  Busca y añade cada predecesor. Las relaciones se validan al
                  guardar.
                </small>
              </details>
              <details>
                <summary>
                  Reporte ejecutivo <small>Inclusión en futuros cortes</small>
                </summary>
                <label>
                  <input
                    type="checkbox"
                    checked={!!v.include_in_report}
                    onChange={(e) => set("include_in_report", e.target.checked)}
                  />
                  Incluir en nuevos cortes desde catálogo
                </label>
                <p>Los cortes publicados conservan su información histórica.</p>
              </details>
            </div>
          )}
          {error && <p role="alert">{error}</p>}
          <div className="editor-footer">
            <button type="button" onClick={onClose}>
              {v.id ? "Cerrar" : "Cancelar"}
            </button>
            <button className="primary">
              {busy
                ? "Guardando…"
                : v.id
                  ? "Guardar cambios"
                  : "Crear y completar detalles"}
            </button>
          </div>
        </fieldset>
      </form>
      {v.id && (
        <details className="work-comments-section">
          <summary>Conversación del trabajo</summary>
          <WorkComments projectId={projectId} itemId={v.id} onBusy={setBusy} />
        </details>
      )}
    </Dialog>
  );
}
