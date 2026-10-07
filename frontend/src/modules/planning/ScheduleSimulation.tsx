import { useEffect, useState } from "react";
import { api, json } from "../../api";
import { dateKey } from "../operations/calendarModel";
export type Proposal = {
  fingerprint: string;
  errors: string[];
  finish: string | null;
  changes: number;
  rows: {
    id: string;
    code: string;
    name: string;
    old_start: string;
    old_end: string;
    start: string;
    end: string;
    duration: number;
    slack: number;
    critical: boolean;
    fixed: boolean;
    changed: boolean;
  }[];
};
export function ScheduleSimulation({
  projectId,
  revision,
  onApplied,
  onPreview,
}: {
  projectId: string;
  revision: string;
  onApplied: () => Promise<void>;
  onPreview: (proposal: Proposal | null) => void;
}) {
  const [anchor, setAnchor] = useState(dateKey(new Date())),
    [proposal, setProposal] = useState<Proposal | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    setProposal(null);
  }, [revision, projectId]);
  useEffect(() => { onPreview(proposal); }, [proposal, onPreview]);
  async function preview() {
    setBusy(true);
    setError("");
    setMessage("");
    setProposal(null);
    try {
      setProposal(
        await api(`/projects/${projectId}/schedule/preview`, {
          method: "POST",
          ...json({ anchor }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    if (!proposal) return;
    setBusy(true);
    setError("");
    try {
      const saved = await api(`/projects/${projectId}/schedule/apply`, {
        method: "POST",
        ...json({ anchor, fingerprint: proposal.fingerprint }),
      });
      setProposal(null);
      setMessage(
        `${saved.applied} trabajos actualizados. Los cortes semanales conservan sus datos.`,
      );
      await onApplied();
    } catch (e) {
      setError((e as Error).message);
      setProposal(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="simulation">
      <div className="section-heading">
        <div>
          <div className="eyebrow">PLANIFICACIÓN DE FECHAS</div>
          <h3>Simular antes de reprogramar</h3>
          <p>
            Conserva la duración de cada trabajo y retrasa los que lo necesiten
            según sus dependencias.
          </p>
        </div>
      </div>
      <p className="board-hint">
        Incluye todos los trabajos no archivados, aunque estén ocultos por
        filtros. Relaciones fin-inicio, días naturales y sin límites de
        capacidad. Las fechas existentes son límites mínimos; no se adelantan
        tareas. Los trabajos cerrados, resueltos y retirados quedan fijos. La jerarquía no agrega
        duraciones ni crea dependencias.
      </p>
      <div className="pmo-actions">
        <label>
          No iniciar trabajos pendientes antes de
          <input
            type="date"
            required
            value={anchor}
            disabled={busy}
            onChange={(e) => {
              setAnchor(e.target.value);
              setProposal(null);
              setMessage("");
            }}
          />
        </label>
        <button disabled={busy || !anchor} onClick={() => void preview()}>
          {busy ? "Procesando…" : "Simular fechas"}
        </button>
      </div>
      {error && (
        <p role="alert" className="message error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="message success">
          {message}
        </p>
      )}
      {proposal && (
        <>
          <div className="pmo-metrics">
            <span>
              Final simulado<strong>{proposal.errors.length ? "No calculable" : proposal.finish || "Sin trabajos"}</strong>
            </span>
            <span>
              Trabajos con cambios<strong>{proposal.errors.length ? "—" : proposal.changes}</strong>
            </span>
            <span>
              Trabajos sin holgura
              <strong>{proposal.errors.length ? "—" : proposal.rows.filter((r) => r.critical).length}</strong>
            </span>
          </div>
          {!!proposal.errors.length && (
            <div role="alert" className="message error">
              <div>
                <strong>Resuelve estos problemas antes de aplicar</strong>
                <ul>
                  {proposal.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <p className="board-hint">
            La holgura indica cuántos días puede retrasarse una tarea sin mover
            el final simulado. Los trabajos sin holgura forman las rutas
            críticas de este modelo; no consideran festivos, recursos ni avance
            parcial.
          </p>
          <div className="planning-table">
            <table>
              <thead>
                <tr>
                  <th>Trabajo</th>
                  <th>Fechas actuales</th>
                  <th>Fechas propuestas</th>
                  <th>Duración</th>
                  <th>Holgura</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {proposal.rows.map((row) => (
                  <tr
                    key={row.id}
                    className={row.critical ? "critical-row" : ""}
                  >
                    <td>
                      <strong>{row.code}</strong>
                      <br />
                      {row.name}
                    </td>
                    <td>
                      {row.old_start}
                      <br />
                      {row.old_end}
                    </td>
                    <td>
                      {row.start}
                      <br />
                      {row.end}
                    </td>
                    <td>{row.duration} días</td>
                    <td>{row.fixed ? "Fijo" : `${row.slack} días`}</td>
                    <td>
                      {row.fixed
                        ? "Terminado"
                        : row.critical
                          ? "Sin holgura"
                          : row.changed
                            ? "Reprogramado"
                            : "Sin cambio"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="simulation-footer">
            <span>
              Aplicar actualiza las fechas del catálogo y registra cada cambio
              en la auditoría.
            </span>
            <button
              className="primary"
              disabled={busy || !!proposal.errors.length || !proposal.changes}
              onClick={() => void apply()}
            >
              Aplicar {proposal.changes} cambios al plan
            </button>
            <button disabled={busy} onClick={() => setProposal(null)}>
              Descartar simulación
            </button>
          </div>
        </>
      )}
    </section>
  );
}
