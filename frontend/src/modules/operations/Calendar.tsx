import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { calendarDays, dateKey, shiftCalendar } from "./calendarModel";
type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  kind: string;
  duration_minutes?: number | null;
  status?: string;
};
export function Calendar({
  events,
  onEdit,
  onCreate,
  onMove,
  busy = false,
  details,
  describe,
}: {
  events: Event[];
  onEdit: (id: string) => void;
  onCreate: (date: string) => void;
  onMove?: (id: string, date: string, time?: string) => void;
  busy?: boolean;
  details?: ReactNode;
  describe?: (event: Event) => string;
}) {
  const [mode, setMode] = useState<"month" | "week" | "day">("month"),
    [anchor, setAnchor] = useState(dateKey(new Date())),
    [dragging, setDragging] = useState(""),
    [over, setOver] = useState("");
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
      {describe && <small>{describe(event)}</small>}
    </button>
  );
  const hours = (day: string) => (
    <div className="hour-list">
      {Array.from({ length: 24 }, (_, hour) => {
        const time = String(hour).padStart(2, "0") + ":00";
        return (
          <div
            key={time}
            className={
              "hour-slot " + (over === day + time ? "drop-active" : "")
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
                  {mode === "week"
                    ? hours(day)
                    : events
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
    </section>
  );
}
