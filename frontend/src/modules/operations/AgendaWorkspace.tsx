import { ScopeToggle, useOperationScope, projectColor } from "./OperationScope";
import { dateKey } from "./calendarModel";
import { useEffect, useState } from "react";
import { api, json } from "../../api";
import { Dialog } from "../../Dialog";
import { SearchPicker, personChoices } from "../../components/SearchPicker";
import { localPersonId } from "../../components/LocalIdentity";
import { Calendar } from "./Calendar";
import { Attachments } from "./Attachments";
import { MeetingMinutes } from "./MeetingMinutes";
import {ContextField} from '../../components/ContextField';
import {ActionMenu} from '../../components/ActionMenu';
export type AgendaEvent = {
  project_id: string;
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
  propose_executive: boolean;
};
export function AgendaWorkspace({ projectId }: { projectId: string }) {
  const base = "/projects/" + projectId;
  const [filtersOpen,setFiltersOpen]=useState(false);
  const scope = useOperationScope(projectId),
    scopeKey = scope.ids.join(",");
  const [projectFilter, setProjectFilter] = useState(""),
    [projects, setProjects] = useState<any[]>([]),
    [workingCalendar, setWorkingCalendar] = useState<any>(undefined),
    [absences, setAbsences] = useState<any[]>([]);
  const [attachmentRevision, setAttachmentRevision] = useState(0);
  const [reminder, setReminder] = useState(
      () => localStorage.getItem("pohub.agenda.reminder") || "0",
    ),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
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
    let active = true;
    setEvents([]);
    setSelected("");
    setEditing(null);
    setPending(null);
    setUndo(null);
    setProjectFilter("");
    setError("");
    Promise.all([
      Promise.all(
        scope.ids.map(async (id) => {
          const [e, p, i, d, a] = await Promise.all([
            api("/projects/" + id + "/pmo/events"),
            api("/projects/" + id + "/people"),
            api("/projects/" + id + "/items"),
            api("/projects/" + id + "/documents"),
            api("/projects/" + id + "/availability"),
          ]);
          return {
            events: e.map((v: any) => ({ ...v, project_id: id })),
            people: p.map((v: any) => ({ ...v, project_id: id })),
            items: i.map((v: any) => ({ ...v, project_id: id })),
            documents: d.map((v: any) => ({ ...v, project_id: id })),
            absences: a,
          };
        }),
      ),
      api("/projects"),
      api(base + "/working-calendars"),
    ])
      .then(([rows, all, calendars]) => {
        if (!active) return;
        setEvents(rows.flatMap((r) => r.events));
        setPeople(rows.flatMap((r) => r.people));
        setItems(rows.flatMap((r) => r.items));
        setDocuments(rows.flatMap((r) => r.documents));
        setAbsences([
          ...new Map(
            rows.flatMap((r) => r.absences).map((a) => [a.id, a]),
          ).values(),
        ]);
        setProjects(all);
        setProject(all.find((p: any) => p.id === projectId) || {});
        setWorkingCalendar(calendars.find((c: any) => !c.team_id));
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [base, scopeKey]);
  const projectLabel = (id: string) =>
    projects.find((p) => p.id === id)?.name || "Proyecto";
  const upcoming = events
    .filter(
      (e) =>
        !e.archived &&
        !["Cancelado", "Completado"].includes(e.status) &&
        [e.owner_id, ...e.guests].includes(scope.person) &&
        Number(reminder) > 0,
    )
    .filter((e) => {
      const time = new Date(e.date + "T" + e.time).getTime();
      return time >= now && time - now <= Number(reminder) * 60000;
    });
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
        (!projectFilter || e.project_id === projectFilter) &&
        [
          e.title,
          e.description,
          e.notes,
          e.date,
          e.status,
          person(e.owner_id),
          ...e.guests.map(person),
          related(e.related_id),
          projectLabel(e.project_id),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const current = visible.find((e) => e.id === selected);
  const save = async (e: AgendaEvent) => {
    const result = await api(
      "/projects/" +
        (e.project_id || projectId) +
        "/pmo/events" +
        (e.id ? "/" + e.id : ""),
      {
        method: e.id ? "PUT" : "POST",
        ...json(e),
      },
    );
    result.project_id = e.project_id || projectId;
    setEvents((all) =>
      e.id
        ? all.map((x) => (x.id === result.id ? result : x))
        : [...all, result],
    );
    setSelected(result.id);
  };
  const create = (date: string) =>
    setEditing({
      project_id: projectId,
      id: "",
      version: 1,
      title: "",
      description: "",
      date,
      time: "09:00",
      duration_minutes: 60,
      kind: "Reunión",
      status: "Programado",
      owner_id: people.some(
        (p) => p.project_id === projectId && p.id === localPersonId(),
      )
        ? localPersonId()
        : null,
      guests: [],
      related_id: null,
      notes: "",
      document_ids: [],
      archived: false,
      propose_executive: false,
    });
  const move = async (
    value: { event: AgendaEvent; date: string; time: string },
    remember: boolean,
  ) => {
    setBusy(true);
    setError("");
    try {
      const saved = await api(
        "/projects/" +
          value.event.project_id +
          "/events/" +
          value.event.id +
          "/move",
        {
          method: "POST",
          ...json({
            version: value.event.version,
            date: value.date,
            time: value.time,
          }),
        },
      );
      saved.project_id = value.event.project_id;
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
      <ContextField label="Estado del evento" value={current.status} options={['Programado','Confirmado','Completado','Cancelado'].map(v=>({value:v,label:v}))} onSave={v=>save({...current,status:v})}/>
      <h3><ContextField label="Título del evento" showLabel={false} value={current.title} required onSave={v=>save({...current,title:v})}/></h3>
      <p style={{ color: projectColor(current.project_id) }}>
        {projectLabel(current.project_id)}
      </p>
      <ContextField label="Descripción" type="textarea" value={current.description} onSave={v=>save({...current,description:v})}/>
      <dl>
        <dt>Fecha y hora</dt>
        <dd>
          <ContextField label="Fecha del evento" value={current.date} required type="date" onSave={v=>save({...current,date:v})}/><ContextField label="Hora del evento" value={current.time.slice(0,5)} required type="time" onSave={v=>save({...current,time:v})}/>
        </dd>
        <dt>Duración</dt>
        <dd>
          <ContextField label="Duración (min)" value={current.duration_minutes} type="number" min={1} onSave={v=>save({...current,duration_minutes:v?Number(v):null})}/>
        </dd>
        <dt>Organizador</dt>
        <dd><ContextField label="Organizador" value={current.owner_id||''} search options={[{value:'',label:'Sin asignar'},...personChoices(people.filter(p=>p.project_id===current.project_id))]} onSave={v=>save({...current,owner_id:v||null})}/></dd>
        <dt>Invitados</dt>
        <dd><ContextField label="Invitados" value={current.guests} search multiple options={personChoices(people.filter(p=>p.project_id===current.project_id))} onSave={v=>save({...current,guests:v})}/></dd>
        <dt>Trabajo relacionado</dt>
        <dd><ContextField label="Trabajo relacionado" value={current.related_id||''} search options={[{value:'',label:'Sin relación'},...items.filter(i=>i.project_id===current.project_id).map(i=>({value:i.id,label:i.code+' · '+i.name}))]} onSave={v=>save({...current,related_id:v||null})}/></dd>
      </dl>
      <ContextField label="Notas" value={current.notes} type="textarea" onSave={v=>save({...current,notes:v})}/>
      {!!current.propose_executive && (
        <p>
          Propuesto para Seguimiento Ejecutivo · {related(current.related_id)}
        </p>
      )}
      <div>
        {current.document_ids.map((id) => {
          const doc = documents.find((d) => d.id === id);
          return doc ? (
            <a
              key={id}
              href={
                "/api/projects/" +
                current.project_id +
                "/documents/" +
                id +
                "/download"
              }
            >
              {doc.filename}
            </a>
          ) : (
            <span key={id}>Documento no disponible</span>
          );
        })}
      </div>
      <ActionMenu label="Opciones del evento"><button onClick={()=>setEditing(current)}>Editar todos los datos</button></ActionMenu>
      <Attachments
        key={attachmentRevision}
        projectId={current.project_id}
        kind="event"
        id={current.id}
      />
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
      <ScopeToggle scope={scope} />
      {upcoming.length > 0 && (
        <p role="status" className="action-toast">
          Recordatorio:{" "}
          {upcoming
            .map((e) => e.title + " · " + e.time.slice(0, 5))
            .join(" / ")}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {undo && (
        <p role="status">
          Evento movido.{" "}
          <button disabled={busy} onClick={() => void move(undo, false)}>
            Deshacer movimiento
          </button>
          <button aria-label="Cerrar aviso" onClick={()=>setUndo(null)}>×</button>
        </p>
      )}
      <div className="agenda-view-controls"><button aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(!filtersOpen)}>Filtros{query||archived||projectFilter?' · Activos':''}</button><button aria-pressed={view==='calendar'} onClick={()=>setView('calendar')}>Calendario</button><button aria-pressed={view==='list'} onClick={()=>setView('list')}>Lista</button></div>
      {filtersOpen&&<div className="pmo-actions">
        {scope.all && (
          <label>
            Proyecto
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="">Todos mis proyectos</option>
              {scope.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Recordatorio local
          <select
            value={reminder}
            onChange={(e) => {
              setReminder(e.target.value);
              localStorage.setItem("pohub.agenda.reminder", e.target.value);
            }}
          >
            {[
              ["0", "Desactivado"],
              ["5", "5 minutos"],
              ["15", "15 minutos"],
              ["30", "30 minutos"],
            ].map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
          <small>Mientras la agenda está abierta, para tus eventos.</small>
        </label>
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
        <button onClick={()=>{setQuery('');setArchived(false);setProjectFilter('');}}>Limpiar filtros</button>
      </div>}
      {view === "calendar" ? (
        <Calendar
          events={visible}
          workingCalendar={workingCalendar}
          onEdit={setSelected}
          onCreate={create}
          onMove={(id, date, time) => {
            const event = events.find((e) => e.id === id);
            if (event && !busy && !event.archived)
              void move({ event, date, time: time || event.time },true);
          }}
          busy={busy || archived}
          details={detail}
          describe={(e) => {
            const event = events.find((x) => x.id === e.id)!;
            const absence = absences
              .filter(
                (a) =>
                  !a.archived &&
                  a.start_date <= event.date &&
                  a.end_date >= event.date &&
                  [event.owner_id, ...event.guests].includes(a.person_id),
              )
              .map((a) => person(a.person_id) + ": " + a.kind);
            return `${projectLabel(event.project_id)} · Organizador: ${person(event.owner_id)} · Invitados: ${event.guests.map(person).join(", ") || "—"} · ${related(event.related_id)} · ${event.description} · ${event.notes}${absence.length ? " · Disponibilidad: " + absence.join(", ") : ""}`;
          }}
        />
      ) : (
        <div className="event-master-detail">
          <div className="event-list">
            {visible.map((e) => (
              <button
                key={e.id}
                style={{
                  borderLeft: `4px solid ${projectColor(e.project_id)}`,
                }}
                className={e.id === selected ? "selected" : ""}
                onClick={() => setSelected(e.id)}
              >
                <time>
                  {e.date} · {e.time.slice(0, 5)}
                </time>
                <strong>{e.title}</strong>
                <small>{projectLabel(e.project_id)}</small>
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
      {current && (
        <MeetingMinutes
          key={current.id}
          projectId={current.project_id}
          eventId={current.id}
          eventTitle={current.title}
          people={people.filter((p) => p.project_id === current.project_id)}
          items={items.filter((i) => i.project_id === current.project_id)}
          onChange={async () => {
            setAttachmentRevision((v) => v + 1);
            const fresh = await api(
              "/projects/" + current.project_id + "/items",
            );
            setItems((all) => [
              ...all.filter((i) => i.project_id !== current.project_id),
              ...fresh.map((i: any) => ({
                ...i,
                project_id: current.project_id,
              })),
            ]);
          }}
        />
      )}
      {editing && (
        <EventEditor
          initial={editing}
          people={people.filter((p) => p.project_id === editing.project_id)}
          items={items.filter((i) => i.project_id === editing.project_id)}
          documents={documents.filter(
            (d) => d.project_id === editing.project_id,
          )}
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
            options={personChoices(people)}
            onChange={(value) => set("owner_id", value || null)}
          />
          <SearchPicker
            label="Invitados"
            multiple
            value={v.guests}
            options={personChoices(people)}
            onChange={(value) => set("guests", value)}
          />
          <SearchPicker
            label="Elemento relacionado"
            value={v.related_id || ""}
            options={items.map((i) => ({
              value: i.id,
              label: `${i.code} · ${i.name}`,
            }))}
            onChange={(value) =>
              setV({
                ...v,
                related_id: String(value) || null,
                propose_executive: !!value && v.propose_executive,
              })
            }
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
          <label className="executive-event-label">
            <input
              type="checkbox"
              checked={!!v.propose_executive}
              disabled={!v.related_id}
              onChange={(e) => set("propose_executive", e.target.checked)}
            />{" "}
            Proponer el elemento relacionado para Seguimiento Ejecutivo
          </label>
          <small className="executive-event-help">
            Vincula un trabajo o RAID. El siguiente corte propondrá ese elemento
            para revisión; no copiará las notas de la reunión.
          </small>
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
