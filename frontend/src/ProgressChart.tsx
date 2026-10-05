import { chartPoints } from "./modules/executive/reportModel";
export type Point = {
  date: string;
  planned: number | null;
  actual: number | null;
  status?: string;
};
export function ProgressChart({
  points: rawPoints,
  compact = false,
}: {
  points: Point[];
  compact?: boolean;
}) {
  const points = chartPoints(rawPoints);
  const w = 800,
    h = compact ? 195 : 260,
    left = 45,
    right = 20,
    top = 20,
    bottom = compact ? 48 : 42;
  const stamps = points.map((p) =>
    Date.parse(p.date.slice(0, 10) + "T12:00:00Z"),
  );
  const low = Math.min(...stamps),
    high = Math.max(...stamps);
  const x = (i: number) =>
    high === low
      ? (w + left - right) / 2
      : left + ((stamps[i] - low) / (high - low)) * (w - left - right);
  const y = (v: number) => top + ((100 - v) / 100) * (h - top - bottom);
  const path = (key: "planned" | "actual") => {
    let pen = false;
    return points
      .map((p, i) => {
        const v = p[key];
        if (v === null) {
          pen = false;
          return "";
        }
        const command = pen ? "L" : "M";
        pen = true;
        return `${command}${x(i)},${y(v)}`;
      })
      .join(" ");
  };
  if (
    !points.length ||
    !points.some((p) => p.planned !== null || p.actual !== null)
  )
    return (
      <p className="report-empty">
        No hay avances para graficar. Captura los porcentajes en Actualización
        semanal. Las series importadas se consultan por separado.
      </p>
    );
  return (
    <>
      <svg
        className="progress-chart"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Gráfica de avance planeado y real por fecha"
      >
        <title>
          Avance planeado frente a real. Los datos ausentes no se representan
          como cero.
        </title>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={left}
              x2={w - right}
              y1={y(v)}
              y2={y(v)}
              stroke="#dce5ee"
            />
            <text x={left - 8} y={y(v) + 4} textAnchor="end">
              {v}%
            </text>
          </g>
        ))}
        {(["planned", "actual"] as const).map((key, k) => (
          <g key={key}>
            <path
              d={path(key)}
              fill="none"
              stroke={k ? "#df970a" : "#235c98"}
              strokeWidth="3"
            />
            {points.map(
              (p, i) =>
                p[key] !== null && (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(p[key]!)}
                    r="4"
                    fill={k ? "#df970a" : "#235c98"}
                  >
                    <title>
                      {p.date.slice(0, 10)} · {k ? "Real" : "Planeado"}:{" "}
                      {p[key]}%{p.status ? ` · ${p.status}` : ""}
                    </title>
                  </circle>
                ),
            )}
          </g>
        ))}
        {points.map(
          (p, i) =>
            (i === 0 ||
              i === points.length - 1 ||
              i % Math.max(1, Math.ceil(points.length / 6)) === 0) && (
              <text
                key={i}
                x={compact ? 0 : x(i)}
                y={compact ? 0 : h - 15}
                transform={
                  compact
                    ? `translate(${x(i)},${h - 38}) rotate(-90)`
                    : undefined
                }
                textAnchor={compact ? "end" : "middle"}
              >
                {p.date.slice(5, 10).split("-").reverse().join("/")}/
                {p.date.slice(2, 4)}
              </text>
            ),
        )}
      </svg>
      <div className="chart-legend">
        <span>● Planeado</span>
        <span>● Real</span>
      </div>
      {!compact && (
        <details>
          <summary>Ver datos de la gráfica</summary>
          <table className="report-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Planeado</th>
                <th>Real</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={i}>
                  <td>{p.date.slice(0, 10)}</td>
                  <td>{p.planned === null ? "Sin dato" : p.planned + "%"}</td>
                  <td>{p.actual === null ? "Sin dato" : p.actual + "%"}</td>
                  <td>{p.status ?? "Serie importada"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </>
  );
}
