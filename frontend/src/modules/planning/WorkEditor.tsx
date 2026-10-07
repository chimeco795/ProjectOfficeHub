import { WorkDetails } from "./WorkDetails";
import { useState } from "react";
import { Dialog } from "../../Dialog";
import type { Person } from "../master/ItemEditor";
import type { Work, Period } from "./Planning";
import { states, types, allowedTypes } from "./workPresentation";
import { SearchPicker } from "../../components/SearchPicker";
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
  if (v.id)
    return (
      <WorkDetails
        initial={v}
        methodology={methodology}
        items={items}
        people={people}
        periods={periods}
        projectId={projectId}
        onSave={onSave}
        onClose={onClose}
      />
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
            <SearchPicker
              label="Responsable"
              value={v.owner_id || ""}
              options={people.map((p) => ({ value: p.id, label: p.name }))}
              onChange={(value) => set("owner_id", String(value) || null)}
            />
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
    </Dialog>
  );
}
