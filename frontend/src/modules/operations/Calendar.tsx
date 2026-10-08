import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { calendarDays, dateKey, shiftCalendar } from "./calendarModel";
import { projectColor } from "./OperationScope";
type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  kind: string;
  duration_minutes?: number | null;
  status?: string;
  project_id?: string;
};
export function Calendar({
  events,
  onEdit,
  onCreate,
  onMove,
  busy = false,
  details,
  describe,
  workingCalendar,
}: {
  events: Event[];
  onEdit: (id: string) => void;
  onCreate: (date: string) => void;
  onMove?: (id: string, date: string, time?: string) => void;
  busy?: boolean;
  details?: ReactNode;
  describe?: (event: Event) => string;
  workingCalendar?: { days: number[]; start_time: string; end_time: string };
}) {
  const [mode, setMode] = useState<"month" | "week" | "day">("month"),
    [anchor, setAnchor] = useState(dateKey(new Date())),
    [dragging, setDragging] = useState(""),
    [over, setOver] = useState(""),
    [outsideHours, setOutsideHours] = useState(false),
    [hover, setHover] = useState<{
      event: Event;
      left: number;
      top: number;
    } | null>(null);
  const days = calendarDays(anchor, mode),
    today = dateKey(new Date());
  const drop = (date: string, time?: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (dragging && !busy) {
        e.preventDefault();
        e.stopPropagation();
        setOver(date + (time || ""));
      }
    },
    onDragLeave: () => setOver(""),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragging && !busy) onMove?.(dragging, date, time);
      setDragging("");
      setOver("");
    },
  });
  const card = (event: Event) => (
    <button
      key={event.id}
      draggable={!!onMove && !busy}
      onDragStart={(e) => {
        setDragging(event.id);
        e.dataTransfer.setData("text/plain", event.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => {
        setDragging("");
        setOver("");
      }}
      className="calendar-event"
      style={{
        borderLeft: `4px solid ${projectColor(event.project_id || "")}`,
      }}
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setHover({
          event,
          left: Math.max(8, Math.min(r.left, window.innerWidth - 340)),
          top: Math.max(8, Math.min(r.bottom + 4, window.innerHeight - 270)),
        });
      }}
      onMouseLeave={() => setHover(null)}
      onFocus={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setHover({
          event,
          left: Math.max(8, Math.min(r.left, window.innerWidth - 340)),
          top: Math.max(8, Math.min(r.bottom + 4, window.innerHeight - 270)),
        });
      }}
      onBlur={() => setHover(null)}
      onClick={() => onEdit(event.id)}
      title={`${event.time.slice(0, 5)} · ${event.title}`}
    >
      <time>{event.time.slice(0, 5)}</time>
      <strong>{event.title}</strong>
      <small>
        {event.duration_minutes
          ? `${event.duration_minutes} min`
          : "Duración sin definir"}{" "}
        · {event.status || event.kind}
      </small>
    </button>
  );
  const startHour = Number(
    (workingCalendar?.start_time || "09:00").slice(0, 2),
  );
  const endHour = Math.ceil(
    Number((workingCalendar?.end_time || "18:00").slice(0, 2)) +
      Number((workingCalendar?.end_time || "18:00").slice(3, 5)) / 60,
  );
  const hourRange = Array.from({ length: 24 }, (_, h) => h).filter(
    (h) => outsideHours || (h >= startHour && h < endHour),
  );
  const isWorking = (day: string, hour: number) => {
    const weekday = (new Date(day + "T12:00:00").getDay() + 6) % 7;
    return (
      (workingCalendar?.days || [0, 1, 2, 3, 4]).includes(weekday) &&
      hour >= startHour &&
      hour < endHour
    );
  };
  const hours = (day: string) => (
    <div className="hour-list">
      {hourRange.map((hour) => {
        const time = String(hour).padStart(2, "0") + ":00";
        return (
          <div
            key={time}
            className={
              "hour-slot " +
              (!isWorking(day, hour) ? "outside-working " : "") +
              (over === day + time ? "drop-active" : "")
            }
            {...drop(day, time)}
            aria-label={`Mover a ${day} ${time}`}
          >
            <time>{time}</time>
            <div>
              {events
                .filter(
                  (e) => e.date === day && Number(e.time.slice(0, 2)) === hour,
                )
                .sort((a, b) => a.time.localeCompare(b.time))
                .map(card)}
            </div>
          </div>
        );
      })}
    </div>
  );
  return (
    <section className="calendar" aria-label="Calendario del proyecto">
      <div className="calendar-toolbar">
        <div className="button-row">
          <button
            aria-label="Periodo anterior"
            onClick={() => setAnchor(shiftCalendar(anchor, mode, -1))}
          >
            <ChevronLeft size={17} />
          </button>
          <button onClick={() => setAnchor(today)}>Hoy</button>
          <button
            aria-label="Periodo siguiente"
            onClick={() => setAnchor(shiftCalendar(anchor, mode, 1))}
          >
            <ChevronRight size={17} />
          </button>
          <h3>
            {new Date(anchor + "T12:00:00").toLocaleDateString("es-MX", {
              month: "long",
              year: "numeric",
              ...(mode !== "month" ? { day: "numeric" } : {}),
            })}
          </h3>
        </div>
        <div className="calendar-modes">
          {(["month", "week", "day"] as const).map((id, n) => (
            <button
              key={id}
              aria-pressed={mode === id}
              onClick={() => setMode(id)}
            >
              {["Mes", "Semana", "Día"][n]}
            </button>
          ))}
        </div>
      </div>
      <p className="board-hint">
        Selecciona para leer. Arrastra a un día u hora para proponer un cambio;
        confirma antes de guardar.
      </p>
      {mode !== "month" && (
        <>
          <button
            aria-pressed={outsideHours}
            onClick={() => setOutsideHours(!outsideHours)}
          >
            {outsideHours
              ? "Priorizar horario laboral"
              : "Mostrar todas las horas"}
          </button>
          {!outsideHours && (
            <div className="outside-events">
              <strong>Fuera de horario laboral</strong>
              {events
                .filter(
                  (e) =>
                    days.includes(e.date) &&
                    (Number(e.time.slice(0, 2)) < startHour ||
                      Number(e.time.slice(0, 2)) >= endHour),
                )
                .map(card)}
            </div>
          )}
        </>
      )}
      {mode === "day" ? (
        <div className="event-master-detail">
          <div>
            <button onClick={() => onCreate(anchor)}>
              Nuevo evento este día
            </button>
            {!events.some((e) => e.date === anchor) && (
              <p>Sin eventos este día.</p>
            )}
            {hours(anchor)}
          </div>
          {details}
        </div>
      ) : mode === "week" ? (
        <>
          <div className="weekly-time-scroll">
            <div className="weekly-time-grid">
              <div className="weekly-time-heading">Hora</div>
              {days.map((day, n) => (
                <div className="weekly-time-heading" key={day}>
                  {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][n]}{" "}
                  {Number(day.slice(8))}
                  <button
                    aria-label={`Crear evento el ${day}`}
                    onClick={() => onCreate(day)}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              ))}
              {hourRange.map((hour) => {
                const time = String(hour).padStart(2, "0") + ":00";
                return (
                  <div className="weekly-hour-row" key={hour}>
                    <time>{time}</time>
                    {days.map((day) => (
                      <div
                        key={day}
                        className={
                          "weekly-hour-cell " +
                          (!isWorking(day, hour) ? "outside-working " : "") +
                          (over === day + time ? "drop-active" : "")
                        }
                        {...drop(day, time)}
                        aria-label={`Mover a ${day} ${time}`}
                      >
                        {events
                          .filter(
                            (e) =>
                              e.date === day &&
                              Number(e.time.slice(0, 2)) === hour,
                          )
                          .sort((a, b) => a.time.localeCompare(b.time))
                          .map(card)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          {details}
        </>
      ) : (
        <>
          <div className="calendar-scroll">
            <div className={"calendar-grid " + mode}>
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <div key={d} className="calendar-weekday">
                  {d}
                </div>
              ))}
              {days.map((day) => (
                <div
                  key={day}
                  className={
                    "calendar-day " +
                    (day === today ? "today " : "") +
                    (mode === "month" && day.slice(0, 7) !== anchor.slice(0, 7)
                      ? "outside "
                      : "") +
                    (over === day ? "drop-active" : "")
                  }
                  {...drop(day)}
                >
                  <div className="calendar-date">
                    <time>{Number(day.slice(8))}</time>
                    <button
                      aria-label={`Crear evento el ${day}`}
                      onClick={() => onCreate(day)}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  {events
                    .filter((e) => e.date === day)
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map(card)}
                </div>
              ))}
            </div>
          </div>
          {details}
        </>
      )}
      {hover && (
        <aside
          className="event-hover-card"
          role="tooltip"
          style={{ left: hover.left, top: hover.top }}
        >
          <strong>{hover.event.title}</strong>
          <p>
            {hover.event.date} · {hover.event.time.slice(0, 5)} ·{" "}
            {hover.event.duration_minutes || "—"} min
          </p>
          <p>{describe?.(hover.event)}</p>
        </aside>
      )}
    </section>
  );
}
