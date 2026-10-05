import { Calendar } from "./Calendar";
import { useEffect, useState } from "react";
import { api, json } from "../../api";
import { Dialog } from "../../Dialog";
import "../planning/planning.css";
type Value = Record<string, any>;
type Option = { value: string; label: string };
type Field = {
  key: string;
  label: string;
  type?: string;
  options?: Option[];
  required?: boolean;
  nullable?: boolean;
  step?: string;
  max?: number;
};
const options = (v: string[]) => v.map((x) => ({ value: x, label: x }));
const money = (v: unknown, c: string) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: c }).format(
    Number(v || 0),
  );
export function RecordEditor({
  title,
  initial,
  fields,
  onSave,
  onClose,
}: {
  title: string;
  initial: Value;
  fields: Field[];
  onSave: (v: Value) => Promise<void>;
  onClose: () => void;
}) {
  const [v, setV] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (key: string, value: unknown) => setV({ ...v, [key]: value });
  return (
    <Dialog
      title={title}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="pmo-editor"
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
          {fields.map((f) => (
            <label key={f.key}>
              {f.label}
              {f.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={!!v[f.key]}
                  onChange={(e) => set(f.key, e.target.checked)}
                />
              ) : f.options ? (
                <select
                  multiple={f.type === "multiple"}
                  required={f.required}
                  value={v[f.key] ?? (f.type === "multiple" ? [] : "")}
                  onChange={(e) =>
                    set(
                      f.key,
                      f.type === "multiple"
                        ? Array.from(e.target.selectedOptions, (x) => x.value)
                        : e.target.value || (f.nullable ? null : ""),
                    )
                  }
                >
                  {f.type !== "multiple" && (
                    <option value="">
                      {f.required ? "Seleccionar" : "Sin asignar"}
                    </option>
                  )}
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  value={v[f.key] || ""}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ) : (
                <input
                  type={f.type || "text"}
                  required={f.required}
                  min={f.type === "number" ? 0 : undefined}
                  max={f.max}
                  step={f.step || "any"}
                  value={v[f.key] ?? ""}
                  onChange={(e) =>
                    set(f.key, e.target.value || (f.nullable ? null : ""))
                  }
                />
              )}
            </label>
          ))}
          {error && <p role="alert">{error}</p>}
          <button className="primary">Guardar</button>
        </fieldset>
      </form>
    </Dialog>
  );
}
export function Operations({
  projectId,
  view,
}: {
  projectId: string;
  view: string;
}) {
  const base = `/projects/${projectId}`;
  const [rows, setRows] = useState<Value[]>([]),
    [people, setPeople] = useState<Value[]>([]),
    [items, setItems] = useState<Value[]>([]),
    [teams, setTeams] = useState<Value[]>([]),
    [allTeams, setAllTeams] = useState<Value[]>([]),
    [budget, setBudget] = useState<Value>({ baseline: null, totals: {} });
  const [agendaView, setAgendaView] = useState("calendar");
  const [error, setError] = useState(""),
    [editing, setEditing] = useState<{
      collection: string;
      value: Value;
      fields: Field[];
      title: string;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [archived, setArchived] = useState(false),
    [query, setQuery] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const collection =
    view === "teams" ? "memberships" : view === "budget" ? "entries" : "events";
  async function reload() {
    const [r, p, i, t, b, a] = await Promise.all([
      api(base + (view === "documents" ? "/documents" : "/pmo/" + collection)),
      api(base + "/people"),
      api(base + "/items"),
      api(base + "/pmo/teams"),
      api(base + "/budget"),
      api("/teams"),
    ]);
    setRows(r);
    setPeople(p);
    setItems(i);
    setTeams(t);
    setBudget(b);
    setAllTeams(a);
  }
  useEffect(() => {
    void reload().catch((e) => setError(e.message));
  }, [base, view]);
  const personOptions = people.map((p) => ({ value: p.id, label: p.name })),
    itemOptions = items.map((i) => ({
      value: i.id,
      label: `${i.code} · ${i.name}`,
    })),
    teamOptions = teams
      .filter((t) => !t.archived)
      .map((t) => ({ value: t.id, label: t.name }));
  const archive: Field = {
    key: "archived",
    label: "Archivado",
    type: "checkbox",
  };
  const fields: Record<string, Field[]> = {
    teams: [
      { key: "name", label: "Nombre de equipo", required: true },
      {
        key: "lead_id",
        label: "Líder",
        options: personOptions,
        nullable: true,
      },
      archive,
    ],
    memberships: [
      {
        key: "person_id",
        label: "Persona del proyecto",
        required: true,
        options: personOptions,
      },
      { key: "team_id", label: "Equipo", options: teamOptions, nullable: true },
      { key: "role", label: "Rol", required: true },
      {
        key: "allocation",
        label: "Asignación (%)",
        type: "number",
        required: true,
        max: 100,
      },
      { key: "valid_from", label: "Desde", type: "date", nullable: true },
      { key: "valid_to", label: "Hasta", type: "date", nullable: true },
      archive,
    ],
    entries: [
      { key: "concept", label: "Concepto", required: true },
      { key: "category", label: "Categoría", required: true },
      {
        key: "kind",
        label: "Tipo de costo",
        required: true,
        options: options(["Planned", "Committed", "Actual", "Forecast"]),
      },
      {
        key: "amount",
        label: "Monto",
        type: "number",
        step: "0.01",
        required: true,
      },
      {
        key: "currency",
        label: "Moneda",
        required: true,
        options: options(["MXN", "USD", "EUR"]),
      },
      { key: "date", label: "Fecha", type: "date", nullable: true },
      { key: "vendor", label: "Proveedor / responsable" },
      {
        key: "related_id",
        label: "Relacionado con",
        options: itemOptions,
        nullable: true,
      },
      { key: "notes", label: "Notas", type: "textarea" },
      archive,
    ],
    events: [
      { key: "title", label: "Título", required: true },
      { key: "date", label: "Fecha", required: true, type: "date" },
      { key: "time", label: "Hora local", required: true, type: "time" },
      { key: "kind", label: "Tipo de evento", required: true },
      {
        key: "owner_id",
        label: "Organizador",
        options: personOptions,
        nullable: true,
      },
      {
        key: "guests",
        label: "Invitados (Ctrl para varios)",
        type: "multiple",
        options: personOptions,
      },
      { key: "description", label: "Descripción", type: "textarea" },
      archive,
    ],
    budget: [
      {
        key: "approved",
        label: "Presupuesto aprobado",
        type: "number",
        step: "0.01",
        required: true,
      },
      {
        key: "contingency",
        label: "Contingencia",
        type: "number",
        step: "0.01",
        required: true,
      },
      {
        key: "currency",
        label: "Moneda base",
        required: true,
        options: options(["MXN", "USD", "EUR"]),
      },
      { key: "notes", label: "Notas", type: "textarea" },
    ],
    documents: [
      {
        key: "related_id",
        label: "Relacionado con",
        options: itemOptions,
        nullable: true,
      },
      { key: "notes", label: "Notas", type: "textarea" },
      archive,
    ],
  };
  const defaults: Record<string, Value> = {
    teams: { name: "", lead_id: null },
    memberships: {
      person_id: "",
      team_id: null,
      role: "",
      allocation: 100,
      valid_from: null,
      valid_to: null,
    },
    entries: {
      concept: "",
      category: "",
      kind: "Planned",
      amount: "",
      currency: budget.baseline?.currency || "MXN",
      date: null,
      vendor: "",
      notes: "",
      related_id: null,
    },
    events: {
      title: "",
      date: "",
      time: "09:00",
      kind: "Reunión",
      owner_id: null,
      guests: [],
      description: "",
    },
    budget: {
      approved: "",
      contingency: "0",
      currency: "MXN",
      notes: "",
      version: 1,
    },
  };
  const edit = (c: string, value?: Value) =>
    setEditing({
      collection: c,
      value: value || {
        ...defaults[c],
        version: c === "budget" ? 0 : 1,
        archived: false,
      },
      fields: fields[c],
      title: (
        {
          teams: "Equipo compartido",
          memberships: "Asignación de persona",
          entries: "Registro de costo",
          events: "Evento de agenda",
          budget: "Presupuesto aprobado",
          documents: "Documento",
        } as Record<string, string>
      )[c],
    });
  const visible = rows
    .filter(
      (r) =>
        !!r.archived === archived &&
        (!from || !r.date || r.date >= from) &&
        (!to || !r.date || r.date <= to) &&
        JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      `${a.date || ""} ${a.time || ""}`.localeCompare(
        `${b.date || ""} ${b.time || ""}`,
      ),
    );
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>
        {
          (
            {
              teams: "Equipos y asignaciones",
              budget: "Presupuesto",
              agenda: "Agenda",
              documents: "Documentos",
            } as Record<string, string>
          )[view]
        }
      </h2>
      {error && <p role="alert">{error}</p>}
      {view === "teams" && (
        <>
          <p>
            Las personas se administran en Catálogo y responsables. Los equipos
            son compartidos; editar su nombre o líder afecta a todos sus
            proyectos.
          </p>
          <button onClick={() => edit("teams")}>Nuevo equipo</button>
          <form
            className="pmo-actions"
            onSubmit={(e) => {
              e.preventDefault();
              const team_id = new FormData(e.currentTarget).get("team_id");
              void run(() =>
                api(base + "/teams/assign", {
                  method: "POST",
                  ...json({ team_id }),
                }),
              );
            }}
          >
            <label>
              Equipo existente
              <select name="team_id" required>
                <option value="">Seleccionar…</option>
                {allTeams
                  .filter(
                    (t) => !t.archived && !teams.some((x) => x.id === t.id),
                  )
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <button disabled={busy}>Asignar equipo</button>
          </form>
          <div className="roadmap-grid">
            {teams
              .filter((t) => !!t.archived === archived)
              .map((t) => (
                <article className="work-card" key={t.id}>
                  <h3>{t.name}</h3>
                  <p>
                    Líder:{" "}
                    {people.find((p) => p.id === t.lead_id)?.name ||
                      "Sin líder en este proyecto"}
                  </p>
                  <button onClick={() => edit("teams", t)}>
                    Editar equipo
                  </button>
                </article>
              ))}
          </div>
        </>
      )}
      {view === "budget" && (
        <>
          <p>
            Los importes se conservan por moneda. No se aplican conversiones
            automáticas ni se insertan presupuestos de ejemplo.
          </p>
          <button onClick={() => edit("budget", budget.baseline || undefined)}>
            Configurar presupuesto
          </button>
          {budget.baseline ? (
            <div className="pmo-metrics">
              <span>
                Aprobado
                <strong>
                  {money(budget.baseline.approved, budget.baseline.currency)}
                </strong>
              </span>
              <span>
                Contingencia
                <strong>
                  {money(budget.baseline.contingency, budget.baseline.currency)}
                </strong>
              </span>
              <span>
                Disponible en moneda base
                <strong>
                  {money(
                    Number(budget.baseline.approved) +
                      Number(budget.baseline.contingency) -
                      Number(
                        budget.totals[budget.baseline.currency]?.Actual || 0,
                      ) -
                      Number(
                        budget.totals[budget.baseline.currency]?.Committed || 0,
                      ),
                    budget.baseline.currency,
                  )}
                </strong>
              </span>
            </div>
          ) : (
            <p>Presupuesto aprobado sin definir.</p>
          )}
          {Object.entries(budget.totals).map(([currency, totals]) => (
            <div className="pmo-metrics" key={currency}>
              <b>{currency}</b>
              {Object.entries(totals as Value).map(([kind, amount]) => (
                <span key={kind}>
                  {kind}
                  <strong>{money(amount, currency)}</strong>
                </span>
              ))}
            </div>
          ))}
        </>
      )}
      {view === "agenda" && (
        <p>
          Agenda local del proyecto. Registrar invitados no envía correos ni
          invitaciones externas.
        </p>
      )}
      <div className="pmo-actions">
        <label>
          Buscar
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          Ver archivados
        </label>
        {["agenda", "budget"].includes(view) && (
          <>
            <label>
              Desde
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </>
        )}
        {view !== "documents" && (
          <button onClick={() => edit(collection)}>
            Nuevo{" "}
            {view === "teams"
              ? "registro de asignación"
              : view === "budget"
                ? "costo"
                : "evento"}
          </button>
        )}
      </div>
      {view === "documents" && (
        <form
          className="pmo-actions"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const payload = new FormData(form);
            void run(async () => {
              await api(base + "/documents", { method: "POST", body: payload });
              form.reset();
            });
          }}
        >
          <label>
            Archivo (máximo 20 MB)
            <input name="file" type="file" required disabled={busy} />
          </label>
          <button disabled={busy}>Guardar documento</button>
        </form>
      )}
      {view === "agenda" && (
        <div className="workspace-tabs">
          <button
            className={agendaView === "calendar" ? "selected" : ""}
            onClick={() => setAgendaView("calendar")}
          >
            Calendario
          </button>
          <button
            className={agendaView === "list" ? "selected" : ""}
            onClick={() => setAgendaView("list")}
          >
            Lista
          </button>
        </div>
      )}
      {view === "agenda" && agendaView === "calendar" ? (
        <Calendar
          events={
            visible as {
              id: string;
              title: string;
              date: string;
              time: string;
              kind: string;
            }[]
          }
          onEdit={(id) =>
            edit(
              "events",
              rows.find((r) => r.id === id),
            )
          }
          onCreate={(date) =>
            edit("events", {
              ...defaults.events,
              date,
              version: 1,
              archived: false,
            })
          }
        />
      ) : (
        <div className="agenda-list">
          {visible.map((r) => (
            <article key={r.id}>
              <h3>
                {view === "teams"
                  ? people.find((p) => p.id === r.person_id)?.name || "Persona"
                  : r.concept || r.title || r.filename}
              </h3>
              {view === "teams" ? (
                <p>
                  {r.role} · {r.allocation}% ·{" "}
                  {teams.find((t) => t.id === r.team_id)?.name || "Sin equipo"}{" "}
                  · {r.valid_from || "Sin inicio"} → {r.valid_to || "Sin fin"}
                </p>
              ) : view === "budget" ? (
                <p>
                  {r.kind} · {r.category} · {money(r.amount, r.currency)} ·{" "}
                  {r.date || "Sin fecha"} · {r.vendor}
                </p>
              ) : view === "agenda" ? (
                <>
                  <p>
                    {r.date} · {r.time} · {r.kind} ·{" "}
                    {people.find((p) => p.id === r.owner_id)?.name ||
                      "Sin organizador"}
                  </p>
                  <p>{r.description}</p>
                  <p>
                    Invitados:{" "}
                    {(r.guests || [])
                      .map(
                        (id: string) =>
                          people.find((p) => p.id === id)?.name || id,
                      )
                      .join(", ") || "Sin invitados"}
                  </p>
                </>
              ) : (
                <>
                  <p>
                    {Math.ceil(r.size / 1024)} KB · {r.created_at.slice(0, 10)}
                  </p>
                  <a href={"/api" + base + "/documents/" + r.id + "/download"}>
                    Descargar original
                  </a>
                </>
              )}
              {r.notes && <p>{r.notes}</p>}
              <button
                onClick={() =>
                  edit(view === "documents" ? "documents" : collection, r)
                }
              >
                Editar
              </button>
            </article>
          ))}
        </div>
      )}
      {!visible.length && <p>No hay registros en esta selección.</p>}
      {view === "teams" && (
        <details>
          <summary>
            Asignaciones activas acumuladas (sin filtrar por vigencia)
          </summary>
          {people.map((p) => {
            const total = rows
              .filter((r) => r.person_id === p.id && !r.archived)
              .reduce((s, r) => s + Number(r.allocation), 0);
            return (
              <p key={p.id}>
                {p.name}: {total}%
                {total > 100 ? " · Revisar periodos de asignación" : ""}
              </p>
            );
          })}
        </details>
      )}
      {editing && (
        <RecordEditor
          {...editing}
          initial={editing.value}
          onClose={() => setEditing(null)}
          onSave={async (value) => {
            const c = editing.collection;
            const path =
              c === "budget"
                ? base + "/budget"
                : c === "documents"
                  ? base + "/documents/" + value.id
                  : base + "/pmo/" + c + (value.id ? "/" + value.id : "");
            await api(path, {
              method: c === "budget" || value.id ? "PUT" : "POST",
              ...json(value),
            });
            await reload();
          }}
        />
      )}
    </section>
  );
}
