import { timelineTicks, pixelsPerDay, type Zoom } from "./timelineModel";
import { useState } from "react";
import { hierarchy, states, stateClass, types } from "./workPresentation";
import type { Work } from "./Planning";
import type { Proposal } from "./ScheduleSimulation";
import { visibleHierarchy, ganttPosition } from "./ganttModel";
import { analyzeSchedule } from "./scheduleModel";
import { dateKey } from "../operations/calendarModel";
export function Schedule({
  items,
  allItems,
  onEdit,
  simulation,
}: {
  items: Work[];
  allItems: Work[];
  onEdit: (item: Work) => void;
  simulation?: Proposal | null;
}) {
  const [zoom, setZoom] = useState<Zoom>("week");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set()),
    [links, setLinks] = useState(true),
    [warningsOnly, setWarningsOnly] = useState(false);
  const today = dateKey(new Date()),
    analysis = analyzeSchedule(allItems, today);
  const proposed = new Map(
    (simulation?.errors.length ? [] : simulation?.rows || []).map((r) => [
      r.id,
      r,
    ]),
  );
  const filtered = items.filter(
    (i) =>
      !warningsOnly ||
      analysis.find((r) => r.item.id === i.id)?.warnings.length,
  );
  const rows = hierarchy(
    visibleHierarchy(filtered, allItems, collapsed),
    allItems,
  ).map((r) => {
    const p = proposed.get(r.item.id);
    return {
      ...r,
      item: p ? { ...r.item, start_date: p.start, target_date: p.end } : r.item,
    };
  });
  const stamps = rows
    .filter((r) => r.item.start_date && r.item.target_date)
    .flatMap((r) => [
      Date.parse(r.item.start_date!),
      Date.parse(r.item.target_date!),
    ]);
  const start = stamps.length ? Math.min(...stamps) : Date.parse(today),
    end = stamps.length ? Math.max(...stamps) : start,
    span = Math.max(
      { day: 14, week: 56, month: 180, quarter: 730 }[zoom] * 86400000,
      end - start + 86400000,
    );
  const position = (date: string) => ganttPosition(date, start, span),
    todayPosition = position(today);
  const ticks = timelineTicks(start, start + span - 86400000, zoom);
  const canvasWidth = Math.max(
    950,
    Math.min(50000, (span / 86400000) * pixelsPerDay[zoom] + 275),
  );
  return (
    <div className="schedule">
      <div className="section-heading">
        <div>
          <h3>Gantt · Fechas y dependencias</h3>
          <p>
            Expande la jerarquía y consulta las fechas, responsables y avance
            del plan.
          </p>
        </div>
        <div className="gantt-tools">
          <label>
            Zoom
            <select
              aria-label="Zoom temporal"
              value={zoom}
              onChange={(e) => setZoom(e.target.value as Zoom)}
            >
              <option value="day">Día</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="quarter">Trimestre</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={warningsOnly}
              onChange={(e) => setWarningsOnly(e.target.checked)}
            />{" "}
            Solo con alertas
          </label>
          <label>
            <input
              type="checkbox"
              checked={links}
              onChange={(e) => setLinks(e.target.checked)}
            />{" "}
            Dependencias visibles
          </label>
        </div>
      </div>
      {simulation && (
        <p role="status" className="gantt-simulation">
          {simulation.errors.length
            ? "La simulación tiene conflictos; se muestran las fechas actuales."
            : "Vista simulada · aún no aplicada. Contorno rojo: ruta crítica del modelo."}
        </p>
      )}
      <p className="board-hint">
        Hoy: {today}. Relaciones fin → inicio, en días naturales. Simula debajo
        para consultar holgura y ruta crítica; la jerarquía no agrega duración.
        Las barras se editan desde la ficha.
      </p>
      <div className="state-legend">
        {Object.entries(states).map(([key, label]) => (
          <span key={key} className={"field-chip " + stateClass(key)}>
            {label}
          </span>
        ))}
      </div>
      <div className="schedule-scroll">
        <div
          className="gantt-canvas"
          style={{ width: canvasWidth, minWidth: "100%" }}
        >
          <div className="schedule-axis">
            <span>Trabajo / responsable / estado / avance</span>
            <div>
              {ticks.map((tick, n) => (
                <time
                  key={n}
                  title={tick}
                  style={{ left: position(tick) + "%" }}
                >
                  {zoom === "quarter"
                    ? `T${Math.floor((Number(tick.slice(5, 7)) - 1) / 3) + 1} ${tick.slice(0, 4)}`
                    : zoom === "month"
                      ? new Date(tick + "T12:00:00").toLocaleDateString(
                          "es-MX",
                          { month: "short", year: "numeric" },
                        )
                      : zoom === "day"
                        ? new Date(tick + "T12:00:00").toLocaleDateString(
                            "es-MX",
                            { day: "2-digit", month: "short" },
                          )
                        : tick}
                </time>
              ))}
            </div>
          </div>
          <div className="gantt-body">
            {rows.map(({ item, depth }) => {
              const warning = analysis.find((r) => r.item.id === item.id),
                p = proposed.get(item.id),
                dated = item.start_date && item.target_date;
              return (
                <div className="schedule-row" key={item.id}>
                  <div
                    className="gantt-name"
                    style={{ paddingLeft: Math.min(depth, 8) * 14 }}
                  >
                    {allItems.some((i) => i.parent_id === item.id) && (
                      <button
                        className="gantt-toggle"
                        aria-expanded={!collapsed.has(item.id)}
                        aria-label={
                          (collapsed.has(item.id) ? "Expandir " : "Contraer ") +
                          item.code
                        }
                        onClick={() =>
                          setCollapsed((old) => {
                            const next = new Set(old);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          })
                        }
                      >
                        {collapsed.has(item.id) ? "▸" : "▾"}
                      </button>
                    )}
                    <button
                      className="schedule-name"
                      onClick={() =>
                        onEdit(allItems.find((i) => i.id === item.id) || item)
                      }
                    >
                      <strong>
                        {item.code} · {item.name}
                      </strong>
                      <small>
                        {types[item.work_type]} ·{" "}
                        {item.owner_name || "Sin responsable"}
                      </small>
                      <small>
                        {states[item.status] || item.status} ·{" "}
                        {item.executive_priority} ·{" "}
                        {item.progress == null
                          ? "Avance sin dato"
                          : item.progress + "%"}
                        {warning?.warnings.length ? " · ⚠" : ""}
                      </small>
                    </button>
                  </div>
                  <div className="schedule-track">
                    {todayPosition >= 0 && todayPosition < 100 && (
                      <span
                        className="today-line"
                        style={{ left: todayPosition + "%" }}
                        aria-label={"Hoy " + today}
                      />
                    )}
                    {dated ? (
                      <button
                        className={
                          "schedule-bar " +
                          stateClass(item.status) +
                          (p?.critical ? " gantt-critical" : "")
                        }
                        style={{
                          left: position(item.start_date!) + "%",
                          width:
                            Math.max(
                              0.15,
                              ((Date.parse(item.target_date!) -
                                Date.parse(item.start_date!) +
                                86400000) /
                                span) *
                                100,
                            ) + "%",
                        }}
                        onClick={() =>
                          onEdit(allItems.find((i) => i.id === item.id) || item)
                        }
                        aria-label={
                          item.code +
                          " · " +
                          item.start_date +
                          " a " +
                          item.target_date
                        }
                        title={`${item.code} · ${item.name}\n${item.owner_name || "Sin responsable"} · ${states[item.status] || item.status}\n${item.start_date} → ${item.target_date}\nPrioridad: ${item.executive_priority} · Avance: ${item.progress ?? "Sin dato"}\n${p ? "Holgura: " + p.slack + " días · " + (p.critical ? "Ruta crítica simulada" : "Simulación") : "Fechas actuales"}\n${warning?.warnings.join("; ") || "Sin alertas"}`}
                      >
                        <span style={{ width: (item.progress ?? 0) + "%" }} />
                        <b>
                          {item.progress == null ? "—" : item.progress + "%"}
                        </b>
                      </button>
                    ) : (
                      <small>Sin fechas completas</small>
                    )}
                  </div>
                </div>
              );
            })}
            {links && (
              <svg
                className="gantt-links"
                viewBox={`0 0 100 ${Math.max(1, rows.length) * 74}`}
                preserveAspectRatio="none"
                aria-label="Dependencias entre trabajos visibles"
              >
                {rows.flatMap(({ item }, index) =>
                  item.dependencies.map((id) => {
                    const predIndex = rows.findIndex((r) => r.item.id === id),
                      pred = rows[predIndex]?.item;
                    if (!pred?.target_date || !item.start_date) return null;
                    const x1 =
                        position(pred.target_date) + (86400000 / span) * 100,
                      x2 = position(item.start_date),
                      y1 = predIndex * 74 + 37,
                      y2 = index * 74 + 37;
                    return (
                      <path
                        key={id + item.id}
                        d={`M ${x1} ${y1} H ${Math.min(99, x1 + 1)} V ${y2} H ${x2}`}
                        vectorEffect="non-scaling-stroke"
                      >
                        <title>
                          {pred.code} → {item.code}
                        </title>
                      </path>
                    );
                  }),
                )}
              </svg>
            )}
          </div>
        </div>
      </div>
      {!rows.length && <p>No hay trabajos en esta selección.</p>}
      <details>
        <summary>Conflictos y predecesores</summary>
        {filtered.map((item) => (
          <article key={item.id}>
            <strong>
              {item.code} · {item.name}
            </strong>
            <p>
              Predecesores:{" "}
              {item.dependencies
                .map((id) => allItems.find((i) => i.id === id)?.code || id)
                .join(", ") || "Ninguno"}
            </p>
            {analysis
              .find((r) => r.item.id === item.id)
              ?.warnings.map((w, n) => (
                <p key={n}>{w}</p>
              ))}
          </article>
        ))}
      </details>
    </div>
  );
}
