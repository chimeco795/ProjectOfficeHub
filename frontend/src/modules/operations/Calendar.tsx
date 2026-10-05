import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { calendarDays, dateKey, shiftCalendar } from "./calendarModel";
type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  kind: string;
};
export function Calendar({
  events,
  onEdit,
  onCreate,
}: {
  events: Event[];
  onEdit: (id: string) => void;
  onCreate: (date: string) => void;
}) {
  const [mode, setMode] = useState<"month" | "week" | "day">("month"),
    [anchor, setAnchor] = useState(dateKey(new Date()));
  const days = calendarDays(anchor, mode),
    today = dateKey(new Date());
  const heading = new Date(anchor + "T12:00:00").toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
    ...(mode !== "month" ? { day: "numeric" } : {}),
  });
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
          <h3>{heading}</h3>
        </div>
        <div className="calendar-modes">
          {(
            [
              ["month", "Mes"],
              ["week", "Semana"],
              ["day", "Día"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-pressed={mode === id}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="calendar-scroll">
        <div className={"calendar-grid " + mode}>
          {mode !== "day" &&
            ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
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
                  ? "outside"
                  : "")
              }
            >
              <div className="calendar-date">
                <time dateTime={day}>
                  {Number(day.slice(8))}
                  {mode !== "month" && (
                    <small>
                      {" "}
                      ·{" "}
                      {new Date(day + "T12:00:00").toLocaleDateString("es-MX", {
                        month: "short",
                      })}
                    </small>
                  )}
                </time>
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
                .map((event) => (
                  <button
                    className="calendar-event"
                    key={event.id}
                    onClick={() => onEdit(event.id)}
                    title={`${event.time} · ${event.title}`}
                  >
                    <time>{event.time.slice(0, 5)}</time>
                    <strong>{event.title}</strong>
                    <small>{event.kind}</small>
                  </button>
                ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
