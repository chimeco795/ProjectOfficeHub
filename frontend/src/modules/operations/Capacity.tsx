import { useEffect, useState } from "react";
import { api } from "../../api";
import { dateKey } from "./calendarModel";
type Segment = {
  start: string;
  end: string;
  allocation: number;
  assignments: {
    id: string;
    project_id: string;
    project_name: string;
    role: string;
    allocation: number;
  }[];
};
type Result = {
  start: string;
  end: string;
  people: {
    id: string;
    name: string;
    peak: number;
    average: number;
    overloaded_days: number;
    segments: Segment[];
  }[];
};
export function Capacity({
  projectId,
  revision,
}: {
  projectId: string;
  revision: string;
}) {
  const today = dateKey(new Date());
  const next = new Date();
  next.setDate(next.getDate() + 29);
  const [start, setStart] = useState(today),
    [end, setEnd] = useState(dateKey(next)),
    [range, setRange] = useState({ start: today, end: dateKey(next) }),
    [data, setData] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    api(`/projects/${projectId}/capacity?start=${range.start}&end=${range.end}`)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setData(null);
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, revision, range]);
  return (
    <section className="capacity">
      <div className="eyebrow">CAPACIDAD POR VIGENCIA</div>
      <h3>Carga del equipo entre proyectos</h3>
      <p>
        Consulta las asignaciones vigentes de las personas de este proyecto,
        incluyendo su participación en otros proyectos. El 100% es la referencia
        de disponibilidad; no calcula horas ni festivos.
      </p>
      <form
        className="pmo-actions"
        onSubmit={(e) => {
          e.preventDefault();
          setRange({ start, end });
        }}
      >
        <label>
          Inicio del análisis
          <input
            type="date"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          Fin del análisis
          <input
            type="date"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <button disabled={busy}>Consultar capacidad</button>
      </form>
      {error && (
        <p role="alert" className="message error">
          {error}
        </p>
      )}
      {busy ? (
        <p role="status">Calculando asignaciones…</p>
      ) : (
        data && (
          <>
            <p className="board-hint">
              Intervalo consultado: {data.start} → {data.end}. Vigencias
              inclusivas; fechas vacías indican asignación sin límite. Se
              excluyen asignaciones archivadas.
            </p>
            <div className="capacity-grid">
              {data.people.map((person) => (
                <article
                  key={person.id}
                  className={person.overloaded_days ? "overloaded" : ""}
                >
                  <div className="section-heading">
                    <h3>{person.name}</h3>
                    <span className="status-pill">
                      {person.overloaded_days
                        ? `${person.overloaded_days} días sobre 100%`
                        : "Sin sobreasignación"}
                    </span>
                  </div>
                  <div className="capacity-numbers">
                    <span>
                      Pico<strong>{person.peak}%</strong>
                    </span>
                    <span>
                      Promedio del intervalo<strong>{person.average}%</strong>
                    </span>
                  </div>
                  <div className="capacity-meter">
                    <span style={{ width: `${Math.min(100, person.peak)}%` }} />
                  </div>
                  <details>
                    <summary>
                      Ver periodos y proyectos ({person.segments.length})
                    </summary>
                    {person.segments.map((segment) => (
                      <div key={segment.start} className="capacity-segment">
                        <strong>
                          {segment.start} → {segment.end} · {segment.allocation}
                          %
                        </strong>
                        {segment.assignments.length ? (
                          <ul>
                            {segment.assignments.map((a) => (
                              <li key={a.id}>
                                {a.project_name}
                                {a.project_id === projectId
                                  ? " (actual)"
                                  : ""}{" "}
                                · {a.role} · {a.allocation}%
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>Sin asignaciones en este periodo.</p>
                        )}
                      </div>
                    ))}
                  </details>
                </article>
              ))}
            </div>
            {!data.people.length && (
              <p>
                Asigna personas desde Catálogo y personas para analizar su
                capacidad.
              </p>
            )}
          </>
        )
      )}
    </section>
  );
}
