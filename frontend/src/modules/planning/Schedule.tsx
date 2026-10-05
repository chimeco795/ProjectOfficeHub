import { useState } from "react";
import type { Work } from "./Planning";
import { analyzeSchedule } from "./scheduleModel";
import { dateKey } from "../operations/calendarModel";
export function Schedule({
  items,
  allItems,
  onEdit,
}: {
  items: Work[];
  allItems: Work[];
  onEdit: (item: Work) => void;
}) {
  const [onlyWarnings, setOnlyWarnings] = useState(false);
  const today = dateKey(new Date());
  const analysis = analyzeSchedule(allItems, today);
  const rows = items.filter(
    (i) =>
      !onlyWarnings ||
      analysis.find((r) => r.item.id === i.id)?.warnings.length,
  );
  const dated = rows.filter((i) => i.start_date && i.target_date);
  const stamps = dated.flatMap((i) => [
    Date.parse(i.start_date!),
    Date.parse(i.target_date!),
  ]);
  const start = stamps.length ? Math.min(...stamps) : 0,
    end = stamps.length ? Math.max(...stamps) : 0;
  const span = Math.max(86400000, end - start + 86400000);
  const tickCount = Math.min(7, Math.round(span / 86400000));
  const ticks = Array.from({ length: tickCount }, (_, index) =>
    new Date(start + ((span - 86400000) * index) / Math.max(1, tickCount - 1))
      .toISOString()
      .slice(0, 10),
  );
  return (
    <div className="schedule">
      <div className="schedule-intro">
        <div>
          <h3>Fechas y dependencias</h3>
          <p>
            Revisa los compromisos y resuelve los cruces antes de ajustar el
            plan.
          </p>
        </div>
        <label>
          <input
            type="checkbox"
            checked={onlyWarnings}
            onChange={(e) => setOnlyWarnings(e.target.checked)}
          />
          Solo con alertas
        </label>
      </div>
      <p className="board-hint">
        Las alertas usan una relación fin → inicio al día siguiente, en días
        naturales. Son orientativas: no cambian fechas ni calculan una ruta
        crítica.
      </p>
      {!!dated.length && (
        <div className="schedule-scroll">
          <div className="schedule-axis">
            <span>Trabajo / responsable</span>
            <div>
              {ticks.map((tick, index) => (
                <time key={index}>{tick.slice(5)}</time>
              ))}
            </div>
          </div>
          {dated.map((item) => {
            const row = analysis.find((r) => r.item.id === item.id);
            return (
              <div className="schedule-row" key={item.id}>
                <button className="schedule-name" onClick={() => onEdit(item)}>
                  <strong>
                    {item.code} · {item.name}
                  </strong>
                  <small>{item.owner_name || "Sin responsable"}</small>
                </button>
                <div className="schedule-track">
                  <button
                    className={
                      "schedule-bar " + (row?.warnings.length ? "warning" : "")
                    }
                    onClick={() => onEdit(item)}
                    title={`${item.start_date} → ${item.target_date}`}
                    style={{
                      left: `${((Date.parse(item.start_date!) - start) / span) * 100}%`,
                      width: `${((Date.parse(item.target_date!) - Date.parse(item.start_date!) + 86400000) / span) * 100}%`,
                    }}
                  >
                    <span style={{ width: `${item.progress ?? 0}%` }} />
                    <b>
                      {item.progress == null
                        ? "Sin avance"
                        : `${item.progress}%`}
                    </b>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="schedule-details">
        {rows.map((item) => {
          const row = analysis.find((r) => r.item.id === item.id);
          return (
            <article key={item.id}>
              <div className="section-heading">
                <div>
                  <strong>
                    {item.code} · {item.name}
                  </strong>
                  <p>
                    {item.start_date || "Sin inicio"} →{" "}
                    {item.target_date || "Sin compromiso"}
                  </p>
                </div>
                <button onClick={() => onEdit(item)}>Revisar trabajo</button>
              </div>
              <p>
                Predecesores:{" "}
                {item.dependencies
                  .map(
                    (id) =>
                      allItems.find((i) => i.id === id)?.code ||
                      "No disponible",
                  )
                  .join(", ") || "Ninguno"}
              </p>
              {row?.warnings.length ? (
                <ul className="schedule-alerts">
                  {row.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <small>
                  {item.archived
                    ? "Trabajo archivado: excluido del análisis."
                    : "Sin alertas de fechas detectadas."}
                </small>
              )}
              {row?.earliest && (
                <p className="board-hint">
                  Inicio compatible con los compromisos de sus predecesores:{" "}
                  {row.earliest} o posterior.
                </p>
              )}
            </article>
          );
        })}
      </div>
      {!rows.length && <p>No hay trabajos que coincidan con esta selección.</p>}
    </div>
  );
}
