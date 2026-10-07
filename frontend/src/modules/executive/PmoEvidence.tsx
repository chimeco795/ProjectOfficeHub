export type PmoEvidenceData = {
  as_of: string;
  progress: {
    proposed: number | null;
    covered: number;
    total: number;
    rule: string;
  };
  overdue: any[];
  blocked: any[];
  risks: any[];
  upcoming_milestones: any[];
  dependencies: any[];
  memberships: any[];
  meeting_proposals: any[];
  budget: { totals: Record<string, Record<string, string>>; baseline: any };
  schedule: {
    anchor: string;
    errors: string[];
    finish: string | null;
    critical: any[];
    changes: number;
    label: string;
  };
};
export function PmoEvidence({
  value,
  compact = false,
}: {
  value?: PmoEvidenceData;
  compact?: boolean;
}) {
  if (!value) return null;
  return (
    <section className={compact ? "pmo-evidence compact" : "pmo-evidence"}>
      <strong>AUTO · Captura PMO al {value.as_of}</strong>
      <div className="pmo-evidence-facts">
        <span>Vencidos: {value.overdue.length}</span>
        <span>Bloqueados: {value.blocked.length}</span>
        <span>Riesgos abiertos: {value.risks.length}</span>
        <span>Hitos en 30 días: {value.upcoming_milestones.length}</span>
        <span>Asignaciones vigentes: {value.memberships.length}</span>
      </div>
      {!compact && (
        <>
          <p>
            <b>PROPUESTO · Avance:</b>{" "}
            {value.progress.proposed == null
              ? "Sin cobertura completa"
              : value.progress.proposed + "%"}
            . {value.progress.covered}/{value.progress.total} trabajos con dato.{" "}
            {value.progress.rule}
          </p>
          <p>
            <b>MANUAL:</b> avance planeado, narrativa, decisiones, semáforos y
            confianza Go Live requieren revisión. Las cifras capturadas no se
            actualizan al cambiar el PMO.
          </p>
          <details>
            <summary>Consultar evidencia y origen</summary>
            {(
              [
                ["Vencidos", value.overdue],
                ["Bloqueados", value.blocked],
                ["Riesgos", value.risks],
                ["Hitos próximos", value.upcoming_milestones],
              ] as [string, any[]][]
            ).map(([label, items]) => (
              <div key={label}>
                <strong>{label}</strong>
                <ul>
                  {items.map((i) => (
                    <li key={i.id}>
                      {i.code} · {i.name} · {i.owner_name || "Sin responsable"}{" "}
                      · {i.target_date || "Sin fecha"}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <strong>Presupuesto registrado por moneda (AUTO)</strong>
            {Object.entries(value.budget.totals).map(([currency, totals]) => (
              <p key={currency}>
                {currency}:{" "}
                {Object.entries(totals)
                  .map(([kind, amount]) => kind + " " + amount)
                  .join(" · ")}
              </p>
            ))}
            {!Object.keys(value.budget.totals).length && (
              <p>Sin movimientos registrados.</p>
            )}
            <strong>Equipo / asignaciones de este proyecto</strong>
            {value.memberships.map((m) => (
              <p key={m.id}>
                {m.name} · {m.role} · {m.allocation}%
              </p>
            ))}
            <strong>Ruta crítica del modelo simulado</strong>
            <p>
              {value.schedule.label} · ancla {value.schedule.anchor}
            </p>
            {value.schedule.errors.length ? (
              <ul>
                {value.schedule.errors.map((e, n) => (
                  <li key={n}>{e}</li>
                ))}
              </ul>
            ) : (
              <p>
                {value.schedule.critical.map((i) => i.code).join(", ") ||
                  "Sin trabajos críticos"}{" "}
                · final {value.schedule.finish || "Sin dato"}
              </p>
            )}
            <strong>Propuestas de reuniones</strong>
            {value.meeting_proposals.map((e) => (
              <p key={e.id}>
                {e.date} · {e.title} · elemento vinculado, pendiente de
                revisión.
              </p>
            ))}
          </details>
        </>
      )}
    </section>
  );
}
