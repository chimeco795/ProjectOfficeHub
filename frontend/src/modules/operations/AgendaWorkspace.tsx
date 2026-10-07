import { dateKey } from "./calendarModel";
import { useEffect, useState } from "react";
import { api, json } from "../../api";
import { Dialog } from "../../Dialog";
import { SearchPicker } from "../../components/SearchPicker";
import { localPersonId } from "../../components/LocalIdentity";
import { Calendar } from "./Calendar";
export type AgendaEvent = {
  id: string;
  version: number;
  title: string;
  description: string;
  date: string;
  time: string;
  duration_minutes: number | null;
  kind: string;
  status: string;
  owner_id: string | null;
  guests: string[];
  related_id: string | null;
  notes: string;
  document_ids: string[];
  archived: boolean;
};
export function AgendaWorkspace({ projectId }: { projectId: string }) {
  const base = "/projects/" + projectId;
  const [events, setEvents] = useState<AgendaEvent[]>([]),
    [people, setPeople] = useState<any[]>([]),
    [items, setItems] = useState<any[]>([]),
    [documents, setDocuments] = useState<any[]>([]),
    [project, setProject] = useState<any>({}),
    [selected, setSelected] = useState(""),
    [editing, setEditing] = useState<AgendaEvent | null>(null),
    [query, setQuery] = useState(""),
    [archived, setArchived] = useState(false),
    [view, setView] = useState("calendar"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<{
      event: AgendaEvent;
      date: string;
      time: string;
    } | null>(null),
    [undo, setUndo] = useState<{
      event: AgendaEvent;
      date: string;
      time: string;
    } | null>(null);
  useEffect(() => {
    Promise.all([
      api(base + "/pmo/events"),
      api(base + "/people"),
      api(base + "/items"),
      api(base + "/documents"),
      api("/projects"),
    ])
      .then(([e, p, i, d, projects]) => {
        setEvents(e);
        setPeople(p);
        setItems(i);
        setDocuments(d);
        setProject(projects.find((p: any) => p.id === projectId) || {});
      })
      .catch((e) => setError(e.message));
  }, [base]);
  const person = (id: string | null) =>
    people.find((p) => p.id === id)?.name || "Sin asignar";
  const related = (id: string | null) => {
    const i = items.find((i) => i.id === id);
    return i ? `${i.code} · ${i.name}` : "Sin relación";
  };
  const visible = events
    .filter(
      (e) =>
        !!e.archived === archived &&
        [
          e.title,
          e.description,
          e.notes,
          e.date,
          e.status,
          person(e.owner_id),
          ...e.guests.map(person),
          related(e.related_id),
          project.name,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const current = visible.find((e) => e.id === selected);
  const save = async (e: AgendaEvent) => {
    const result = await api(base + "/pmo/events" + (e.id ? "/" + e.id : ""), {
      method: e.id ? "PUT" : "POST",
      ...json(e),
    });
    setEvents((all) =>
      e.id
        ? all.map((x) => (x.id === result.id ? result : x))
        : [...all, result],
    );
    setSelected(result.id);
  };
  const create = (date: string) =>
    setEditing({
      id: "",
      version: 1,
      title: "",
      description: "",
      date,
      time: "09:00",
      duration_minutes: 60,
      kind: "Reunión",
      status: "Programado",
      owner_id: people.some((p) => p.id === localPersonId())
        ? localPersonId()
        : null,
      guests: [],
      related_id: null,
      notes: "",
      document_ids: [],
      archived: false,
    });
  const move = async (
    value: { event: AgendaEvent; date: string; time: string },
    remember: boolean,
  ) => {
    setBusy(true);
    setError("");
    try {
      const saved = await api(base + "/events/" + value.event.id + "/move", {
        method: "POST",
        ...json({
          version: value.event.version,
          date: value.date,
          time: value.time,
        }),
      });
      setEvents((all) => all.map((e) => (e.id === saved.id ? saved : e)));
      setSelected(saved.id);
      setUndo(
        remember
          ? { event: saved, date: value.event.date, time: value.event.time }
          : null,
      );
      setPending(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const detail = current ? (
    <article className="event-detail">
      <span className="field-chip">{current.status}</span>
      <h3>{current.title}</h3>
      <p>{current.description || "Sin descripción registrada"}</p>
      <dl>
        <dt>Fecha y hora</dt>
        <dd>
          {current.date} · {current.time.slice(0, 5)}
        </dd>
        <dt>Duración</dt>
        <dd>
          {current.duration_minutes
            ? `${current.duration_minutes} minutos`
            : "Sin definir"}
        </dd>
        <dt>Organizador</dt>
        <dd>{person(current.owner_id)}</dd>
        <dt>Invitados</dt>
        <dd>{current.guests.map(person).join(", ") || "Sin invitados"}</dd>
        <dt>Trabajo relacionado</dt>
        <dd>{related(current.related_id)}</dd>
      </dl>
      <p>{current.notes || "Sin notas adicionales"}</p>
      <div>
        {current.document_ids.map((id) => {
          const doc = documents.find((d) => d.id === id);
          return doc ? (
            <a key={id} href={"/api" + base + "/documents/" + id + "/download"}>
              {doc.filename}
            </a>
          ) : (
            <span key={id}>Documento no disponible</span>
          );
        })}
      </div>
      <button className="primary" onClick={() => setEditing(current)}>
        Editar evento
      </button>
    </article>
  ) : (
    <div className="event-detail empty-state">
      Selecciona un evento para consultar sus detalles.
    </div>
  );
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Agenda</h2>
          <p>
            Reuniones y compromisos del proyecto. Las invitaciones se registran
            localmente.
          </p>
        </div>
        <button className="primary" onClick={() => create(dateKey(new Date()))}>
          Nuevo evento
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {undo && (
        <p role="status">
          Evento movido.{" "}
          <button disabled={busy} onClick={() => void move(undo, false)}>
            Deshacer movimiento
          </button>
        </p>
      )}
      <div className="pmo-actions">
        <label>
          Buscar eventos
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Título, descripción, persona, fecha o trabajo"
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          Archivados
        </label>
        <button
          aria-pressed={view === "calendar"}
          onClick={() => setView("calendar")}
        >
          Calendario
        </button>
        <button aria-pressed={view === "list"} onClick={() => setView("list")}>
          Lista
        </button>
      </div>
      {view === "calendar" ? (
        <Calendar
          events={visible}
          onEdit={setSelected}
          onCreate={create}
          onMove={(id, date, time) => {
            const event = events.find((e) => e.id === id);
            if (event && !busy && !event.archived)
              setPending({ event, date, time: time || event.time });
          }}
          busy={busy || archived}
          details={detail}
          describe={(e) => {
            const event = events.find((x) => x.id === e.id)!;
            return `${person(event.owner_id)} · ${related(event.related_id)}`;
          }}
        />
      ) : (
        <div className="event-master-detail">
          <div className="event-list">
            {visible.map((e) => (
              <button
                key={e.id}
                className={e.id === selected ? "selected" : ""}
                onClick={() => setSelected(e.id)}
              >
                <time>
                  {e.date} · {e.time.slice(0, 5)}
                </time>
                <strong>{e.title}</strong>
                <small>
                  {e.duration_minutes ?? "—"} min · {e.status} ·{" "}
                  {person(e.owner_id)}
                </small>
                <small>{related(e.related_id)}</small>
              </button>
            ))}
            {!visible.length && <p>No hay eventos en esta selección.</p>}
          </div>
          {detail}
        </div>
      )}
      {editing && (
        <EventEditor
          initial={editing}
          people={people}
          items={items}
          documents={documents}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {pending && (
        <Dialog
          title="Mover evento"
          onClose={() => {
            if (!busy) setPending(null);
          }}
        >
          <h3>{pending.event.title}</h3>
          <p>
            {pending.event.date} {pending.event.time.slice(0, 5)} →{" "}
            {pending.date} {pending.time.slice(0, 5)}
          </p>
          <p>
            Duración: {pending.event.duration_minutes ?? "sin definir"} minutos.
            Se conservan invitados, descripción y relaciones.
          </p>
          <button disabled={busy} onClick={() => setPending(null)}>
            Cancelar
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void move(pending, true)}
          >
            Confirmar movimiento
          </button>
        </Dialog>
      )}
    </section>
  );
}
function EventEditor({
  initial,
  people,
  items,
  documents,
  onClose,
  onSave,
}: {
  initial: AgendaEvent;
  people: any[];
  items: any[];
  documents: any[];
  onClose: () => void;
  onSave: (e: AgendaEvent) => Promise<void>;
}) {
  const [v, setV] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (key: keyof AgendaEvent, value: any) =>
    setV({ ...v, [key]: value });
  return (
    <Dialog
      title={v.id ? "Editar evento" : "Nuevo evento"}
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
          <div className="form-grid">
            <label>
              Título
              <input
                required
                value={v.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </label>
            <label>
              Tipo
              <input
                required
                value={v.kind}
                onChange={(e) => set("kind", e.target.value)}
              />
            </label>
            <label>
              Fecha
              <input
                type="date"
                required
                value={v.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </label>
            <label>
              Hora
              <input
                type="time"
                required
                value={v.time.slice(0, 5)}
                onChange={(e) => set("time", e.target.value)}
              />
            </label>
            <label>
              Duración (minutos)
              <input
                type="number"
                min="1"
                max="10080"
                required
                value={v.duration_minutes ?? ""}
                onChange={(e) =>
                  set("duration_minutes", Number(e.target.value))
                }
              />
            </label>
            <label>
              Estado
              <select
                value={v.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {["Programado", "Confirmado", "Completado", "Cancelado"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          <label>
            Descripción
            <textarea
              required
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <SearchPicker
            label="Organizador"
            value={v.owner_id || ""}
            options={people.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(value) => set("owner_id", value || null)}
          />
          <SearchPicker
            label="Invitados"
            multiple
            value={v.guests}
            options={people.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(value) => set("guests", value)}
          />
          <SearchPicker
            label="Elemento relacionado"
            value={v.related_id || ""}
            options={items.map((i) => ({
              value: i.id,
              label: `${i.code} · ${i.name}`,
            }))}
            onChange={(value) => set("related_id", value || null)}
          />
          <details>
            <summary>Notas y documentos</summary>
            <label>
              Notas
              <textarea
                value={v.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </label>
            <SearchPicker
              label="Documentos del proyecto"
              multiple
              value={v.document_ids}
              options={documents.map((d) => ({
                value: d.id,
                label: d.filename,
              }))}
              onChange={(value) => set("document_ids", value)}
            />
          </details>
          <label>
            <input
              type="checkbox"
              checked={!!v.archived}
              onChange={(e) => set("archived", e.target.checked)}
            />
            Archivado
          </label>
          {error && <p role="alert">{error}</p>}
          <div className="editor-footer">
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary">Guardar evento</button>
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
}
