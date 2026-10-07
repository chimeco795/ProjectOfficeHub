import { PmoEvidence } from "./modules/executive/PmoEvidence";
import {exportReport} from "./modules/executive/exportReport";
import {
  reportModel,
  percentage as num,
  validDate,
} from "./modules/executive/reportModel";
import {
  ClipboardList,
  CalendarDays,
  Target,
  TriangleAlert,
  CircleDollarSign,
  Gauge,
  Award,
  Users,
  Link,
  CircleCheck,
  Settings,
  Clock,
  PackageCheck,
} from "lucide-react";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { api } from "./api";
import type { Detail, Project, Row } from "./types";
import { ProgressChart, type Point } from "./ProgressChart";
import "./report.css";
export const pmpLabels: Record<string, string> = {
  schedule: "Cronograma",
  scope: "Alcance",
  quality: "Calidad",
  risks: "Riesgos",
  resources: "Recursos",
  dependencies: "Dependencias",
};
const text = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? "Sin definir"
    : String(value);
const normalize = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
function Light({
  value,
  dotOnly = false,
}: {
  value: unknown;
  dotOnly?: boolean;
}) {
  const state = text(value);
  return (
    <span className="traffic-label" title={state} aria-label={state}>
      <i
        className={
          "traffic " +
          ({ Verde: "green", Amarillo: "yellow", Rojo: "red" }[state] ??
            "unknown")
        }
      />
      {!dotOnly && state}
    </span>
  );
}
export function ExecutiveReport({
  detail,
  project,
  onEdit,
  onWeekly,
  onData,
  onProject,
}: {
  detail: Detail;
  project: Project;
  onEdit: (r: Row) => void;
  onWeekly: () => void;
  onData: (section?: string) => void;
  onProject: () => void;
}) {
  const [history, setHistory] = useState<Point[]>([]),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(false),
    [series, setSeries] = useState("history"),
    [indicator, setIndicator] = useState("");
  useEffect(() => {
    let active = true;
    setHistory([]);
    setError("");
    api(`/projects/${project.id}/cuts/${detail.cut.id}/report-history`)
      .then((rows) => {
        if (active) setHistory(rows);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [project.id, detail.cut.id, detail.cut.version]);
  const locked = detail.cut.status === "publicado",
    meta = detail.cut.metadata;
  const { shown, rows, planned, actual, variance, official } = reportModel(
    detail,
    project,
    history,
    preview,
  );
  const section = (name: string) => rows.filter((r) => r.section === name);
  const imported = section("avance").filter((r) => validDate(r.current.date));
  const sourceIds = [...new Set(imported.map((r) => r.source_id ?? "manual"))];
  const selectedSeries =
    series === "history" || sourceIds.includes(series) ? series : "history";
  const points: Point[] =
    selectedSeries === "history"
      ? official
      : imported
          .filter((r) => (r.source_id ?? "manual") === selectedSeries)
          .map((r) => ({
            date: String(r.current.date),
            planned: num(r.current.planned),
            actual: num(r.current.actual),
            status: r.review,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
  const selected = rows.find((r) => r.id === indicator);
  const activities = section("actividades");
  const done = activities.filter((r) =>
    [
      "completo",
      "completado",
      "completada",
      "finalizado",
      "terminado",
      "closed", "resolved", "cerrado", "resuelto",
    ].includes(normalize(r.current.status)),
  );
  const inProgress = activities.filter((r) =>
    ["en progreso", "en proceso", "en ejecucion", "active"].includes(
      normalize(r.current.status),
    ),
  );
  const upcomingActivities=activities.filter(r=>['new','prepared','nuevo','preparado'].includes(normalize(r.current.status)));
  const blockedActivities=activities.filter(r=>['blocked','bloqueado'].includes(normalize(r.current.status)));
  const risks = section("riesgos").sort(
    (a, b) =>
      Number(b.current.executive_priority === true) -
      Number(a.current.executive_priority === true),
  );
  const pmp = (meta.pmp ?? {}) as Record<string, unknown>;
  const pending = detail.records.filter((r) =>
    ["pendiente", "dudoso"].includes(r.review),
  ).length;
  const mitigations = [
    ...section("acciones"),
    ...risks
      .filter((r) => r.current.mitigation)
      .map((r) => ({
        ...r,
        current: { ...r.current, description: r.current.mitigation },
      })),
  ];
  const sheetRef = useRef<HTMLDivElement>(null);
  const reportNode = useRef<HTMLDivElement>(null);
  const [fullScreen,setFullScreen]=useState(false),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
  useEffect(()=>{const handler=(event:KeyboardEvent)=>{if(event.key==='Escape')setFullScreen(false)};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[]);
  async function download(format:'png'|'pdf'){if(!reportNode.current)return;setExporting(true);setExportError('');try{await exportReport(reportNode.current,format,'reporte-'+detail.cut.report_date)}catch(e){setExportError('No se pudo exportar: '+(e as Error).message)}finally{setExporting(false)}}
  const [fit, setFit] = useState(true),
    [scale, setScale] = useState(1);
  useEffect(() => {
    const node = sheetRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) =>
      setScale(Math.min(1, entries[0].contentRect.width / 1536)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const summary = String(
    meta.executive_comment ||
      section("general").find((r) =>
        normalize(r.current.description).startsWith("conclusion"),
      )?.current.description ||
      "Sin resumen capturado.",
  );
  const milestoneRows = section("hitos");
  const associated = milestoneRows.length === 0;
  const milestones = associated
    ? activities
        .filter((r) => r.current.milestone)
        .map((r) => ({
          ...r,
          current: {
            ...r.current,
            description: r.current.milestone,
            comment: "Asociado a actividad",
          },
        }))
    : milestoneRows;
  const blocked = [...section("bloqueos"), ...section("problemas"), ...blockedActivities];
  const originalEdit = (r: Row) =>
    onEdit(detail.records.find((original) => original.id === r.id) ?? r);
  const short = (v: unknown) =>
    String(v ?? "")
      .split("\n")[0]
      .replace(/^\d+[.)]\s*/, "");
  const date = (v: unknown) =>
    validDate(v)
      ? new Date(v + "T12:00:00").toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Sin definir";
  const reportRows = [
    {
      icon: ClipboardList,
      title: "Estado General del Proyecto",
      body: summary,
      state: meta.semaphore,
    },
    {
      icon: CalendarDays,
      title: "Estado Cronograma",
      body:
        planned === null || actual === null
          ? "Avance pendiente de captura en el resumen semanal."
          : `Avance planeado ${planned}% vs avance real ${actual}%. Variación ${variance} pp.`,
      state: pmp.schedule,
    },
    {
      icon: Target,
      title: "Estado Alcance",
      body: meta.scope_comment || "Sin comentario de alcance.",
      state: pmp.scope,
    },
    {
      icon: TriangleAlert,
      title: "Estado Riesgos",
      body:
        meta.risks_comment ||
        `${risks.length} riesgos en la selección. ${risks.filter((r) => r.current.executive_priority === true).length} marcados como prioritarios.`,
      state: pmp.risks,
    },
    {
      icon: CircleDollarSign,
      title: "Estado Presupuesto",
      body: meta.budget_comment || "Sin evaluación presupuestal.",
      state: meta.budget_status,
    },
  ];
  const pmpIcons = [CalendarDays, Target, Award, TriangleAlert, Users, Link];
  return (
    <div className={"executive-report reference-report "+(fullScreen?"report-fullscreen":"")}>
      <div className="report-controls">
        <div>
          <strong>Reporte ejecutivo semanal</strong>
          <span>
            {locked
              ? "Publicado · solo lectura"
              : `Borrador · ${pending} registros sin validar`}
          </span>
        </div>
        <div className="button-row">
          <button onClick={()=>setFullScreen(!fullScreen)}>{fullScreen?'Salir de pantalla completa':'Pantalla completa'}</button>
          <button disabled={exporting} onClick={()=>void download('pdf')}>Exportar PDF</button>
          <button disabled={exporting} onClick={()=>void download('png')}>Exportar imagen</button>
          <button onClick={() => setFit(!fit)}>
            {fit ? "Tamaño real" : "Ajustar a pantalla"}
          </button>
          <button onClick={onWeekly}>
            {locked ? "Consultar resumen y marca" : "Editar reporte y marca"}
          </button>
          <button onClick={() => onData()}>Volver a tablas</button>
          <button onClick={onProject}>Volver al proyecto</button>
        </div>
      </div>
      {exporting&&<p role="status">Preparando exportación…</p>}{exportError&&<p role="alert">{exportError}</p>}
      {!locked && (
        <p role="status" className="report-notice">
          {preview
            ? "Vista de revisión: incluye registros pendientes y dudosos. No es una publicación."
            : "Borrador: se muestran registros aceptados y cifras guardadas del resumen semanal."}
        </p>
      )}
      <details className="report-options">
        <summary>Fuentes, indicadores y opciones de revisión</summary>
        <div className="report-options-grid">
          {!locked && (
            <label>
              <input
                type="checkbox"
                checked={preview}
                onChange={(e) => setPreview(e.target.checked)}
              />{" "}
              Incluir información pendiente de revisión
            </label>
          )}
          <label>
            Observación importada para comparar
            <select
              value={indicator}
              onChange={(e) => setIndicator(e.target.value)}
            >
              <option value="">Sin observación seleccionada</option>
              {section("avance")
                .filter(
                  (r) =>
                    num(r.current.planned) !== null ||
                    num(r.current.actual) !== null,
                )
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.location} · {text(r.current.planned)} /{" "}
                    {text(r.current.actual)}% · {r.review}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Serie de consulta
            <select
              value={selectedSeries}
              onChange={(e) => setSeries(e.target.value)}
            >
              <option value="history">Avance oficial del proyecto</option>
              {sourceIds.map((id) => (
                <option key={id} value={id}>
                  Serie importada ·{" "}
                  {detail.sources.find((s) => s.id === id)?.filename ??
                    "Manual"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p>
          Los datos importados son una vista previa y no reemplazan los
          indicadores guardados. Los campos sin información permanecen sin
          definir.
        </p>
        {selected && (
          <p role="status">
            Observación de consulta: planeado{" "}
            {num(selected.current.planned) === null
              ? "Sin dato"
              : `${num(selected.current.planned)}%`}{" "}
            · real{" "}
            {num(selected.current.actual) === null
              ? "Sin dato"
              : `${num(selected.current.actual)}%`}
            . El reporte conserva el resumen semanal guardado.
          </p>
        )}
        {selectedSeries !== "history" && (
          <p className="message">
            Serie importada de consulta; puede incluir proyecciones. No modifica
            la gráfica oficial del reporte.
          </p>
        )}
        {error && selectedSeries === "history" ? (
          <p role="alert">{error}</p>
        ) : (
          <ProgressChart points={points} />
        )}
      </details>
      <div
        ref={sheetRef}
        className={"sheet-viewport " + (fit ? "fit" : "actual")}
        style={fit ? { height: (detail.cut.project_snapshot.pmo ? 1072 : 1024) * scale } : undefined}
      >
        <div
          ref={reportNode}
          className={"report-sheet" + (detail.cut.project_snapshot.pmo ? " has-pmo" : "")}
          style={fit ? { transform: `scale(${scale})` } : undefined}
        >
          <header className="sheet-header">
            <div className="sheet-brand">
              {meta.brand_logo ? (
                <img
                  src={String(meta.brand_logo)}
                  alt={String(meta.report_brand || "Marca del proyecto")}
                />
              ) : (
                <strong>{String(meta.report_brand || "PMO")}</strong>
              )}
            </div>
            <div className="sheet-title">
              <div>
                REPORTE EJECUTIVO SEMANAL –{" "}
                {String(
                  meta.report_title ||
                    shown.name ||
                    "Proyecto sin nombre histórico",
                )}
              </div>
              <h1>
                {String(
                  meta.report_subtitle ||
                    shown.description ||
                    shown.name ||
                    "Sin descripción",
                )}
              </h1>
            </div>
            <div className="sheet-date">
              <CalendarDays />
              <div>
                <span>Fecha de reporte:</span>
                <strong>{date(detail.cut.report_date)}</strong>
              </div>
            </div>
            <div className="sheet-date">
              <Target />
              <div>
                <span>Go Live Objetivo:</span>
                <strong>{date(shown.go_live)}</strong>
              </div>
            </div>
          </header>
          <div className="sheet-content">
            <PmoEvidence value={detail.cut.project_snapshot.pmo} compact/>
            <div className="sheet-top">
              <SheetPanel title="1. RESUMEN EJECUTIVO" name="summary">
                <div className="summary-rows">
                  {reportRows.map(({ icon: Icon, title, body, state }) => (
                    <button
                      className="summary-row"
                      key={title}
                      onClick={onWeekly}
                      title={String(body)}
                    >
                      <Icon />
                      <div>
                        <strong>{title}</strong>
                        <p>{String(body)}</p>
                      </div>
                      <Light value={state} dotOnly />
                    </button>
                  ))}
                  <button
                    className="summary-row confidence-row"
                    onClick={onWeekly}
                  >
                    <Gauge />
                    <div>
                      <strong>Probabilidad de Cumplir Go Live</strong>
                      <p>
                        {text(meta.confidence_level)}.{" "}
                        {String(
                          meta.go_live_comment || "Sin evaluación registrada.",
                        )}
                      </p>
                    </div>
                    <div className="confidence-gauge">
                      <svg
                        viewBox="0 0 100 60"
                        role="img"
                        aria-label={`Confianza ${num(meta.confidence_percent) === null ? "sin definir" : meta.confidence_percent + "%"}`}
                      >
                        <path
                          d="M 10 50 A 40 40 0 0 1 90 50"
                          fill="none"
                          stroke="#e2e6eb"
                          strokeWidth="11"
                        />
                        {num(meta.confidence_percent) !== null && (
                          <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="#70a441"
                            strokeWidth="11"
                            pathLength="100"
                            strokeDasharray={`${meta.confidence_percent} 100`}
                          />
                        )}
                        <text x="50" y="48" textAnchor="middle">
                          {num(meta.confidence_percent) === null
                            ? "—"
                            : meta.confidence_percent + "%"}
                        </text>
                      </svg>
                      <small>{text(meta.confidence_level)}</small>
                    </div>
                  </button>
                </div>
              </SheetPanel>
              <SheetPanel title="2. DASHBOARD PMP" name="pmp">
                <div className="pmp-status-grid">
                  {Object.entries(pmpLabels).map(([key, label], i) => {
                    const Icon = pmpIcons[i];
                    return (
                      <button key={key} onClick={onWeekly}>
                        <div>
                          <Icon />
                          <strong>{label}</strong>
                        </div>
                        <Light value={pmp[key]} dotOnly />
                      </button>
                    );
                  })}
                </div>
                <button
                  className={"sheet-semaphore " + normalize(meta.semaphore)}
                  onClick={onWeekly}
                >
                  SEMÁFORO GENERAL:{" "}
                  <strong>{text(meta.semaphore).toUpperCase()}</strong>
                </button>
                <p className="sheet-pmp-note">
                  {String(
                    meta.pmp_comment ||
                      "Semáforos manuales. Completa la evaluación en el editor del reporte.",
                  )}
                </p>
              </SheetPanel>
              <SheetPanel title="3. AVANCE DE LA SEMANA" name="progress">
                <div className="sheet-metrics">
                  <div>
                    <span>Avance Planeado</span>
                    <b>{planned === null ? "—" : planned + "%"}</b>
                  </div>
                  <div>
                    <span>Avance Real</span>
                    <b>{actual === null ? "—" : actual + "%"}</b>
                  </div>
                  <div>
                    <span>Variación</span>
                    <b
                      className={
                        variance !== null && variance < 0 ? "negative" : ""
                      }
                    >
                      {variance === null ? "—" : variance + " pp"}
                    </b>
                    <small>
                      {variance === null
                        ? "Sin datos"
                        : variance < 0
                          ? "(Atraso)"
                          : variance > 0
                            ? "(Adelanto)"
                            : "(En plan)"}
                    </small>
                  </div>
                </div>
                <div className="sheet-chart">
                  {error ? (
                    <p role="alert">{error}</p>
                  ) : (
                    <ProgressChart points={official} compact />
                  )}
                </div>
                <div className="sheet-weekly">
                  {[
                    { label: detail.cut.project_snapshot.pmo ? "Terminadas al corte" : "Completadas", icon: CircleCheck, items: done },
                    {
                      label: "En ejecución",
                      icon: Settings,
                      items: inProgress,
                    },
                    {
                      label: "Próximos pasos",
                      icon: Clock,
                      items: [...section("proximos_pasos"), ...upcomingActivities],
                    },
                    {
                      label: "Logros / entregables",
                      icon: PackageCheck,
                      items: section("logros"),
                    },
                  ].map(({ label, icon: Icon, items }) => (
                    <div key={label}>
                      <h3>
                        <Icon />
                        {label}
                      </h3>
                      <ul>
                        {items.slice(0, 7).map((r) => (
                          <li key={r.id}>
                            <button
                              title={String(r.current.description)}
                              onClick={() => originalEdit(r)}
                            >
                              {short(
                                r.current.executive_title ||
                                  r.current.description,
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                      {!items.length && <p>Sin registros</p>}
                      {items.length > 7 && (
                        <button
                          className="sheet-more"
                          onClick={() => onData(items[0]?.section)}
                        >
                          Ver {items.length} registros
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </SheetPanel>
            </div>
            <div className="sheet-middle">
              <SheetPanel
                title="4. MONITOREO DE RIESGOS (Principales)"
                name="risks"
              >
                <SheetTable
                  rows={risks.slice(0, 5)}
                  columns={[
                    ["description", "Riesgo"],
                    ["impact", "Impacto"],
                    ["probability", "Probabilidad"],
                    ["trend", "Tendencia"],
                    ["mitigation", "Acción"],
                  ]}
                  onEdit={originalEdit}
                />
                <button className="sheet-strip warm" onClick={onWeekly}>
                  Exposición global del proyecto:{" "}
                  <strong>{text(meta.exposure_comment)}</strong>
                </button>
                {risks.length > 5 && (
                  <button
                    className="sheet-more"
                    onClick={() => onData("riesgos")}
                  >
                    Ver los {risks.length} riesgos
                  </button>
                )}
              </SheetPanel>
              <SheetPanel title="5. HITOS DEL PROYECTO" name="milestones">
                <SheetTable
                  rows={milestones.slice(0, 6)}
                  columns={[
                    ["description", "Hito"],
                    ["end_date", associated ? "Fin actividad" : "Fecha plan"],
                    ["status", "Estado"],
                    ["comment", "Comentario"],
                  ]}
                  onEdit={originalEdit}
                />
                <button
                  className="sheet-strip neutral"
                  onClick={() => onData(associated ? "actividades" : "hitos")}
                >
                  {associated
                    ? "Hitos asociados al plan · pendientes de consolidar"
                    : String(
                        meta.milestones_comment ||
                          `${milestones.length} hitos registrados`,
                      )}
                </button>
              </SheetPanel>
              <SheetPanel
                title="6. DESVIACIONES Y BLOQUEOS (Principales)"
                name="blockers"
              >
                <SheetTable
                  rows={blocked.slice(0, 2)}
                  columns={[
                    ["description", "Bloqueo / desviación"],
                    ["root_cause", "Causa raíz"],
                    ["impact", "Impacto"],
                    ["end_date", "Compromiso"],
                    ["owner", "Responsable"],
                  ]}
                  onEdit={originalEdit}
                />
                <button className="sheet-deviation" onClick={onWeekly}>
                  <TriangleAlert />
                  <div>
                    <strong>Desviación principal</strong>
                    <p>
                      Variación acumulada:{" "}
                      {variance === null ? "Sin definir" : variance + " pp"}
                    </p>
                    <p>
                      {String(
                        meta.deviation_comment ||
                          "Sin comentario de desviación.",
                      )}
                    </p>
                  </div>
                </button>
                {blocked.length > 2 && (
                  <div className="button-row">
                    <button
                      className="sheet-more"
                      onClick={() => onData("bloqueos")}
                    >
                      Ver bloqueos
                    </button>
                    <button
                      className="sheet-more"
                      onClick={() => onData("problemas")}
                    >
                      Ver problemas
                    </button>
                  </div>
                )}
              </SheetPanel>
            </div>
            <div className="sheet-bottom">
              <SheetPanel title="7. ACCIONES DE MITIGACIÓN" name="actions">
                <SheetTable
                  rows={mitigations.slice(0, 6)}
                  columns={[
                    ["description", "Acción"],
                    ["owner", "Responsable"],
                    ["end_date", "Fecha compromiso"],
                  ]}
                  onEdit={originalEdit}
                />
                {mitigations.length > 6 && (
                  <div className="button-row">
                    <button
                      className="sheet-more"
                      onClick={() => onData("acciones")}
                    >
                      Ver acciones
                    </button>
                    <button
                      className="sheet-more"
                      onClick={() => onData("riesgos")}
                    >
                      Ver mitigaciones de riesgos
                    </button>
                  </div>
                )}
              </SheetPanel>
              <SheetPanel title="⚠ 8. ALERTAS EJECUTIVAS (Top 5)" name="alerts">
                <Numbered
                  rows={section("alertas").slice(0, 5)}
                  onEdit={originalEdit}
                />
                {section("alertas").length > 5 && (
                  <button
                    className="sheet-more"
                    onClick={() => onData("alertas")}
                  >
                    Ver todas las alertas
                  </button>
                )}
              </SheetPanel>
              <SheetPanel
                title="♟ 9. DECISIONES REQUERIDAS DEL COMITÉ"
                name="decisions"
              >
                <Numbered
                  rows={section("decisiones").slice(0, 5)}
                  onEdit={originalEdit}
                />
                {section("decisiones").length > 5 && (
                  <button
                    className="sheet-more"
                    onClick={() => onData("decisiones")}
                  >
                    Ver todas las decisiones
                  </button>
                )}
              </SheetPanel>
              <SheetPanel title="🚀 PRONÓSTICO DEL GO LIVE" name="forecast">
                <button className="forecast-content" onClick={onWeekly}>
                  <div>
                    Nivel de confianza:{" "}
                    <strong>{text(meta.confidence_level).toUpperCase()}</strong>
                  </div>
                  <h3>Fecha estimada Go Live:</h3>
                  <b>{date(meta.forecast_date)}</b>
                  <p>
                    {String(
                      meta.go_live_comment ||
                        "Sin pronóstico registrado. Completa la evaluación en el editor del reporte.",
                    )}
                  </p>
                </button>
              </SheetPanel>
            </div>
          </div>
          <footer className="sheet-footer">
            {locked
              ? "Corte publicado"
              : "Vista previa · incluye sólo la selección de revisión"}{" "}
            · Gráfica: avance oficial · Indicadores: resumen semanal guardado ·
            Textos abreviados: haz clic para ver el registro completo.
          </footer>
        </div>
      </div>
    </div>
  );
}

function SheetPanel({
  title,
  name,
  children,
}: {
  title: string;
  name: string;
  children: ReactNode;
}) {
  return (
    <section className={"sheet-panel sheet-" + name}>
      <h2>{title}</h2>
      <div className="sheet-panel-body">{children}</div>
    </section>
  );
}
function SheetTable({
  rows,
  columns,
  onEdit,
}: {
  rows: Row[];
  columns: [string, string][];
  onEdit: (r: Row) => void;
}) {
  return rows.length ? (
    <table className="sheet-table">
      <thead>
        <tr>
          {columns.map(([key, label]) => (
            <th key={key}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            {columns.map(([key], i) => {
              const raw =
                key === "description"
                  ? r.current.executive_title || r.current[key]
                  : r.current[key];
              const value =
                key.includes("date") && raw
                  ? String(raw).slice(0, 10)
                  : text(raw);
              return (
                <td key={key}>
                  <button onClick={() => onEdit(r)} title={value}>
                    {i === 0 && r.current.code ? `${r.current.code} ` : ""}
                    {key === "trend"
                      ? ({ Mejora: "↓", Estable: "↔", Empeora: "↑" }[value] ??
                        value)
                      : value}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <p className="sheet-empty">Sin registros en esta selección.</p>
  );
}
function Numbered({ rows, onEdit }: { rows: Row[]; onEdit: (r: Row) => void }) {
  return rows.length ? (
    <ol className="sheet-numbered">
      {rows.map((r) => (
        <li key={r.id}>
          <button
            onClick={() => onEdit(r)}
            title={String(r.current.description)}
          >
            {text(r.current.executive_title || r.current.description)}
          </button>
        </li>
      ))}
    </ol>
  ) : (
    <p className="sheet-empty">Sin registros en esta selección.</p>
  );
}
