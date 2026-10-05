import { Migration } from "./modules/operations/Migration";
import { Planning } from "./modules/planning/Planning";
import { Operations } from "./modules/operations/Operations";
import { MasterCatalog } from "./modules/master/MasterCatalog";
import { Reconciliation, ProjectAudit } from "./modules/master/Reconciliation";
import { CutHistory, CutTimeline } from "./modules/executive/CutHistory";
import type { Project, Cut, Row, Source, Detail } from "./types";
import { api, json } from "./api";
import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  FolderKanban,
  Plus,
  Upload,
  Files,
  Check,
  Search,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  CalendarDays,
  X,
  FileText,
  AlertTriangle,
} from "lucide-react";
import "./style.css";
import { OriginalValues } from "./OriginalValues";
import { ExecutiveReport } from "./ExecutiveReport";
import { Workbench } from "./Workbench";
import { WeeklyEditor, ProjectEditor } from "./WeeklyEditor";
import { ProjectSummary } from "./modules/projects/ProjectSummary";
import { ProjectFields } from "./modules/projects/ProjectFields";

const operationViews = ["backlog","board","gantt","roadmap","teams","budget","agenda","documents"];
const sections: Record<string, string> = {
  general: "Datos generales",
  avance: "Avance",
  logros: "Logros",
  problemas: "Problemas",
  actividades: "Actividades",
  riesgos: "Riesgos",
  hitos: "Hitos",
  bloqueos: "Bloqueos",
  dependencias: "Dependencias",
  proximos_pasos: "Próximos pasos",
  decisiones: "Decisiones",
  alertas: "Alertas",
  acciones: "Acciones de mitigación",
};
const labels: Record<string, string> = {
  percentage: "Avance (%)",
  executive_priority: "Prioridad ejecutiva",
  description: "Descripción",
  executive_title: "Título ejecutivo (opcional)",
  owner: "Responsable",
  status: "Estado",
  start_date: "Fecha inicio",
  end_date: "Fecha fin / compromiso",
  probability: "Probabilidad",
  impact: "Impacto",
  mitigation: "Mitigación",
  code: "Código",
  consequence: "Consecuencia",
  justification: "Justificación",
  category: "Categoría",
  weight: "Ponderación",
  milestone: "Hito asociado",
  dependencies: "Dependencias / notas",
  planned: "Planeado (%)",
  actual: "Real (%)",
  source_variation: "Variación declarada (%)",
  date: "Fecha corte",
  critical: "Ruta crítica",
};
const fmt = (s: string | null) =>
  s
    ? new Date(s.slice(0, 10) + "T12:00:00").toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Sin definir";

function App() {
  const [tableSection, setTableSection] = useState("actividades");
  const [dirty, setDirty] = useState(false);
  const [routeReady, setRouteReady] = useState(false);
  const selection = useRef(0);
  const [editingProject, setEditingProject] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]),
    [project, setProject] = useState<Project | null>(null),
    [cuts, setCuts] = useState<Cut[]>([]),
    [cutId, setCutId] = useState(""),
    [detail, setDetail] = useState<Detail | null>(null);
  const [view, setView] = useState("review"),
    [section, setSection] = useState("all"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [sort, setSort] = useState("source");
  const [modal, setModal] = useState(""),
    [edit, setEdit] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [mapping, setMapping] = useState("{}");
  const navigate = (next: string) => {
    if (busy) return;
    if (dirty) {
      setError("Guarda o descarta los cambios antes de cambiar de pantalla.");
      return;
    }
    setView(next);
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const load = async (id = cutId, projectId = project?.id) => {
    if (id && projectId) {
      const token = selection.current;
      const [loaded, list] = await Promise.all([
        api(`/projects/${projectId}/cuts/${id}`), api(`/projects/${projectId}/cuts`),
      ]);
      if (token !== selection.current) return;
      setDetail(loaded);
      setCutId(id);
      setCuts(list);
    }
  };
  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const list: Project[] = await api("/projects");
        if (!active) return;
        setProjects(list);
        const route = new URLSearchParams(location.hash.slice(1));
        const id = route.get("project");
        if (!id && route.get("view") === "migration") setView("migration");
        if (id) {
          const found = list.find(p => p.id === id);
          if (!found) throw Error("El proyecto del enlace no existe.");
          await selectProject(found, route.get("view") || "summary", route.get("cut") || "");
        }
      } catch (e) { if (active) setError((e as Error).message); }
      finally { if (active) setRouteReady(true); }
    }
    void restore();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!routeReady) return;
    const route = new URLSearchParams();
    if (project) {
      route.set("project", project.id);
      route.set("view", view);
      if (cutId) route.set("cut", cutId);
    }
    if (view === "migration") route.set("view", view);
    history.replaceState(null, "", location.pathname + location.search + (route.size ? "#" + route : ""));
  }, [project?.id, view, cutId, routeReady]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (dirty) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);
  async function selectProject(p: Project, nextView = "summary", requestedCut = "") {
    const token = ++selection.current;
    setProject(p);
    setDetail(null);
    setCuts([]);
    setCutId("");
    setSection("all");
    setQuery("");
    setStatus("all");
    setView("summary");
    const result: Cut[] = await api("/projects/" + p.id + "/cuts");
    if (token !== selection.current) return;
    setCuts(result);
    const target = requestedCut || result[0]?.id;
    if (requestedCut && !result.some(c => c.id === requestedCut)) {
      throw Error("El corte del enlace no pertenece a este proyecto.");
    }
    if (target) {
      const loaded = await api(`/projects/${p.id}/cuts/${target}`);
      if (token !== selection.current) return;
      setCutId(target);
      setDetail(loaded);
    }
    setView(["migration", "backlog", "board", "gantt", "roadmap", "teams", "budget", "agenda", "documents", "master", "audit", "reconcile", "summary", "report", "weekly", "data", "review", "import", "history", "timeline"].includes(nextView) ? nextView : "summary");
  }
  async function save(row: Row, review: string) {
    for (const [key, value] of Object.entries(row.current)) {
      if (typeof value === "number" && !Number.isFinite(value)) {
        throw Error(`Introduce un número válido en ${labels[key] ?? key}.`);
      }
    }
    await api("/records/" + row.id, {
      method: "PATCH",
      ...json({
        version: row.version,
        current: row.current,
        section: row.section,
        review,
      }),
    });
    await load();
    setEdit(null);
    setNotice("Revisión guardada. El original se conserva.");
  }
  const rows = (detail?.records ?? []).filter(
    (r) =>
      (section === "all" || r.section === section) &&
      (status === "all" ? r.review !== "eliminado" : r.review === status) &&
      JSON.stringify(r.current).toLowerCase().includes(query.toLowerCase()),
  );
  if (sort === "description")
    rows.sort((a, b) =>
      String(a.current.description ?? a.current.date ?? "").localeCompare(
        String(b.current.description ?? b.current.date ?? ""),
      ),
    );
  const stats = {
    total: detail?.records.filter((r) => r.review !== "eliminado").length ?? 0,
    accepted:
      detail?.records.filter((r) => r.review === "aceptado").length ?? 0,
    doubt: detail?.records.filter((r) => r.review === "dudoso").length ?? 0,
  };
  return (
    <div
      className={"shell " + (project && view === "report" ? "report-mode" : "")}
    >
      <aside>
        <div className="brand">
          <span className="brand-icon">
            <FolderKanban />
          </span>
          <div>
            Project Office Hub<span>GESTIÓN DE PROYECTOS</span>
          </div>
        </div>
        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <button
          className={!project && view !== "migration" ? "nav active" : "nav"}
          onClick={() => {
            if (dirty) {
              setError("Guarda o descarta los cambios antes de salir.");
              return;
            }
            ++selection.current;
            setView("summary");
            setProject(null);
            setDetail(null);
            setCutId("");
            api("/projects").then(setProjects).catch(e => setError(e.message));
          }}
        >
          <FolderKanban size={19} /> Portafolio
        </button>
        <button className={"nav "+(view==="migration"?"active":"")} onClick={()=>navigate("migration")}><Files size={19}/>Migrar archivo .pohub</button>
        {project && (
          <>
            <div className="workspace-label">PROYECTO ACTUAL</div>
            <button className={"nav " + (view === "summary" ? "active" : "")} onClick={() => navigate("summary")}>
              <FolderKanban size={19} /> Resumen del proyecto
            </button>
            {[["master","Catálogo y responsables"],["audit","Auditoría del proyecto"],["reconcile","Conciliar con el catálogo"]].map(([id,label]) => <button key={id} className={"nav " + (view===id?"active":"")} onClick={()=>navigate(id)}><Files size={19}/>{label}</button>)}
            <div className="workspace-label">PLANIFICACIÓN Y OPERACIÓN</div>
            {[["backlog","Backlog"],["board","Board"],["gantt","Gantt"],["roadmap","Roadmap"],["teams","Equipos y asignaciones"],["budget","Presupuesto"],["agenda","Agenda"],["documents","Documentos"]].map(([id,label])=><button key={id} className={"nav "+(view===id?"active":"")} onClick={()=>navigate(id)}><Files size={19}/>{label}</button>)}
            <div className="workspace-label">SEGUIMIENTO EJECUTIVO</div>
            <button className={"nav " + (view === "timeline" ? "active" : "")} onClick={() => navigate("timeline")}><ShieldCheck size={19} /> Trazabilidad del corte</button>
            <button
              className={"nav " + (view === "report" ? "active" : "")}
              onClick={() => navigate("report")}
            >
              <FolderKanban size={19} /> Reporte ejecutivo
            </button>
            <button
              className={"nav " + (view === "weekly" ? "active" : "")}
              onClick={() => navigate("weekly")}
            >
              <CalendarDays size={19} /> Actualización semanal
            </button>
            <button
              className={"nav " + (view === "data" ? "active" : "")}
              onClick={() => navigate("data")}
            >
              <Files size={19} /> Tablas y contenido
            </button>
            <p className="side-project">{project.name}</p>
            <button
              className={"nav " + (view === "review" ? "active" : "")}
              onClick={() => navigate("review")}
            >
              <Files size={19} /> Información detectada
            </button>
            <button
              className={"nav " + (view === "import" ? "active" : "")}
              onClick={() => navigate("import")}
            >
              <Upload size={19} /> Importar archivos
            </button>
            <button
              className={"nav " + (view === "history" ? "active" : "")}
              onClick={() => navigate("history")}
            >
              <CalendarDays size={19} /> Cortes del proyecto
            </button>
          </>
        )}
        <div className="side-bottom">
          <ShieldCheck size={19} />
          <div>
            Espacio local<span>Datos guardados en este equipo</span>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            Gestión de proyectos <ChevronRight size={14} />{" "}
            {view === "migration" ? "Migración .pohub" : operationViews.includes(view) && project ? "Planificación y operación" : project ? (view === "master" ? "Catálogo y responsables" : view === "audit" ? "Auditoría del proyecto" : view === "summary" ? "Resumen del proyecto" : "Seguimiento Ejecutivo") : "Portafolio"}
          </span>
          <span className="phase">Project Office Hub</span>
        </header>
        <div className="content">
          {error && (
            <div role="alert" className="message error">
              {error}
              <button onClick={() => setError("")} aria-label="Cerrar error">
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="message success">
              {notice}
            </div>
          )}
          {view === "migration" ? (
            <Migration projects={projects} onApplied={async()=>{setProjects(await api("/projects"));}}/>
          ) : !project ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">PORTAFOLIO</div>
                  <h1>Proyectos</h1>
                  <p>Organiza tus proyectos y consulta su seguimiento ejecutivo.</p>
                </div>
                <button className="primary" onClick={() => setModal("project")}>
                  <Plus size={18} /> Crear proyecto
                </button>
              </div>
              <div className="portfolio-stats">
                <div>
                  <b>{projects.length}</b>
                  <span>Proyectos</span>
                </div>
                <div>
                  <b>{projects.reduce((n, p) => n + p.cut_count, 0)}</b>
                  <span>Cortes guardados</span>
                </div>
                <div>
                  <b>Word + Excel</b>
                  <span>Fuentes de información</span>
                </div>
              </div>
              <div className="project-grid">
                {projects.map((p) => (
                  <button
                    disabled={busy || !routeReady}
                    className="project-card"
                    key={p.id}
                    onClick={() => run(() => selectProject(p))}
                  >
                    <span className="project-symbol">
                      <FolderKanban />
                    </span>
                    <span className="project-title">{p.name}</span>
                    <p>{p.description || "Sin descripción"}</p>
                    <div className="project-meta">
                      <span>{p.methodology} · {p.status}</span>
                      <span>Go Live · {fmt(p.go_live)}</span>
                    </div>
                    <span className="open-project">
                      Abrir proyecto <ChevronRight size={17} />
                    </span>
                  </button>
                ))}
              </div>
              {!projects.length && (
                <div className="empty">
                  <FolderKanban size={42} />
                  <h2>Tu portafolio empieza aquí</h2>
                  <p>Crea un proyecto para definir sus objetivos, fechas y metodología.</p>
                  <button
                    className="primary"
                    onClick={() => setModal("project")}
                  >
                    Crear proyecto
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <button
                className="back"
                onClick={() => {
                  if (dirty) {
                    setError("Guarda o descarta los cambios antes de salir.");
                    return;
                  }
                  ++selection.current;
                  setProject(null);
                  setDetail(null);
                  setCutId("");
                  api("/projects").then(setProjects).catch(e => setError(e.message));
                }}
              >
                <ArrowLeft size={15} /> Todos los proyectos
              </button>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {["summary","master","audit"].includes(view) ? "PROYECTO" : view === "import"
                      ? "FUENTES DEL REPORTE"
                      : view === "history"
                        ? "ARCHIVO DEL PROYECTO"
                        : ["backlog","board","gantt","roadmap","teams","budget","agenda","documents"].includes(view) ? "PLANIFICACIÓN Y OPERACIÓN" : "REVISIÓN DEL CORTE"}
                  </div>
                  <h1>
                    {!["summary", "history", "master", "audit", "migration", "backlog", "board", "gantt", "roadmap", "teams", "budget", "agenda", "documents"].includes(view) && detail?.cut.status === "publicado"
                      ? (detail.cut.project_snapshot.name ?? "Nombre histórico no disponible")
                      : project.name}
                  </h1>
                  <p>
                    {(!["summary", "history", "master", "audit", "migration", "backlog", "board", "gantt", "roadmap", "teams", "budget", "agenda", "documents"].includes(view) && detail?.cut.status === "publicado"
                      ? detail.cut.project_snapshot.description
                      : project.description) ||
                      ([...operationViews,"summary","master","audit"].includes(view) ? "Administra el estado actual y el historial de tu proyecto." : "Prepara la información de tu reporte semanal.")}
                  </p>
                </div>
                <div className="button-row">
                  <button
                    disabled={dirty}
                    onClick={() => setEditingProject(true)}
                  >
                    Editar proyecto
                  </button>
                  <button disabled={dirty} onClick={() => setModal("cut")}>
                    <Plus size={17} /> Nuevo corte
                  </button>
                </div>
              </div>
              {!["summary", "history", "master", "audit", "migration", "backlog", "board", "gantt", "roadmap", "teams", "budget", "agenda", "documents"].includes(view) && <div className="cutbar">
                <label>
                  Corte de reporte{" "}
                  <select
                    aria-label="Corte de reporte"
                    disabled={dirty || busy}
                    value={cutId}
                    onChange={(e) =>
                      run(async () => {
                        await load(e.target.value);
                      })
                    }
                  >
                    <option value="" disabled>
                      Seleccionar corte
                    </option>
                    {cuts.map((c) => (
                      <option value={c.id} key={c.id}>
                        {fmt(c.report_date)} · {c.status}
                      </option>
                    ))}
                  </select>
                </label>
                <span>
                  Go Live objetivo{" "}
                  <strong>
                    {fmt(
                      detail?.cut.status === "publicado"
                        ? (detail.cut.project_snapshot.go_live ?? null)
                        : project.go_live,
                    )}
                  </strong>
                </span>
                <button disabled={dirty || busy} onClick={() => run(() => load())}>Recargar corte</button>
                <span className="saved">
                  <ShieldCheck size={15} /> Persistencia local
                </span>
              </div>
              }
              {!["summary", "history", "master", "audit", "migration", "backlog", "board", "gantt", "roadmap", "teams", "budget", "agenda", "documents"].includes(view) && detail?.cut.status === "publicado" && (
                <div className="message success">
                  Este corte está publicado. Los datos son de solo lectura.
                </div>
              )}
              {view === "summary" ? (
                <ProjectSummary project={project} cuts={cuts} onExecutive={() => navigate("history")} onEdit={() => setEditingProject(true)} />

              ) : ["backlog","board","gantt","roadmap"].includes(view) ? (
                <Planning key={project.id} project={project} view={view}/>
              ) : ["teams","budget","agenda","documents"].includes(view) ? (
                <Operations key={project.id+view} projectId={project.id} view={view}/>
              ) : view === "master" ? (
                <MasterCatalog key={project.id} projectId={project.id} />
              ) : view === "audit" ? (
                <ProjectAudit key={project.id} projectId={project.id} />
              ) : view === "reconcile" && detail ? (
                <Reconciliation key={cutId + detail.cut.version} projectId={project.id} detail={detail} reload={()=>load()} />
              ) : view === "history" && !cutId ? (
                <CutHistory cuts={cuts} busy={busy} onCreate={() => setModal("cut")} onOpen={() => {}} />
              ) : !cutId ? (
                <div className="empty">
                  <CalendarDays size={40} />
                  <h2>Crea el primer corte</h2>
                  <p>Cada semana se guarda de forma independiente.</p>
                  <button className="primary" onClick={() => setModal("cut")}>
                    Crear corte
                  </button>
                </div>
              ) : view === "report" && detail ? (
                <ExecutiveReport
                  key={cutId}
                  detail={detail}
                  project={project}
                  onEdit={(r) => setEdit(structuredClone(r))}
                  onWeekly={() => navigate("weekly")}
                  onData={(target = "actividades") => { setTableSection(target); navigate("data"); }}
                  onProject={() => navigate("summary")}
                />
              ) : view === "data" && detail ? (
                <Workbench
                  initialSection={tableSection}
                  key={cutId}
                  detail={detail}
                  reload={() => load()}
                  onDirty={setDirty}
                />
              ) : view === "weekly" && detail ? (
                <WeeklyEditor
                  key={cutId + detail.cut.version}
                  detail={detail}
                  reload={async () => {
                    await load();
                    setCuts(await api("/projects/" + project.id + "/cuts"));
                  }}
                  onDirty={setDirty}
                />
              ) : view === "history" ? (
                <CutHistory cuts={cuts} busy={busy} onCreate={() => setModal("cut")} onOpen={id => run(async () => {
                  await load(id);
                  setView(cuts.find(c => c.id === id)?.status === "publicado" ? "report" : "review");
                })} />
              ) : view === "timeline" && detail ? (
                <CutTimeline cutId={cutId} version={detail.cut.version} />
              ) : view === "import" ? (
                <>
                  <section className="panel import-panel">
                    <div className="eyebrow">01 / CARGA DE FUENTES</div>
                    <h2>Importar Word y Excel</h2>
                    <p>
                      Selecciona uno o varios archivos. Los originales y los
                      datos detectados se guardan en este corte.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const input = form.elements.namedItem(
                          "files",
                        ) as HTMLInputElement;
                        const files = Array.from(input.files ?? []);
                        run(async () => {
                          let successes = 0;
                          const failures: string[] = [];
                          for (const file of files) {
                            const fd = new FormData();
                            fd.append("file", file);
                            fd.append("mapping", mapping);
                            try {
                              await api("/cuts/" + cutId + "/imports", {
                                method: "POST",
                                body: fd,
                              });
                              successes++;
                            } catch (e) {
                              failures.push(
                                file.name + ": " + (e as Error).message,
                              );
                            }
                          }
                          await load();
                          if (failures.length) setError(failures.join("\n"));
                          setNotice(
                            `${successes} archivo(s) importado(s). Revisa los registros detectados.`,
                          );
                          if (successes && !failures.length) setView("review");
                        });
                      }}
                    >
                      <label className="file-drop">
                        <Upload size={32} />
                        <strong>Archivos del corte</strong>
                        <span>
                          Word (.docx) y Excel (.xlsx) · Hasta 15 MB por archivo
                        </span>
                        <input
                          name="files"
                          type="file"
                          accept=".docx,.xlsx"
                          multiple
                          required
                        />
                      </label>
                      <details>
                        <summary>Mapeo de Excel configurable</summary>
                        <p>
                          Opcional. Indica hoja, fila de encabezados, sección y
                          columnas. Los nombres de hoja no están predefinidos.
                        </p>
                        <pre>
                          {
                            '{"Mi hoja":{"header_row":1,"section":"actividades","columns":{"description":"Tarea","owner":"Responsable"}}}'
                          }
                        </pre>
                        <textarea
                          aria-label="Mapeo Excel en JSON"
                          value={mapping}
                          onChange={(e) => setMapping(e.target.value)}
                          rows={6}
                        />
                      </details>
                      <button
                        className="primary"
                        disabled={busy || detail?.cut.status === "publicado"}
                      >
                        <Upload size={17} />
                        {busy ? "Procesando…" : "Procesar archivos"}
                      </button>
                    </form>
                  </section>
                  <SourceList sources={detail?.sources ?? []} />
                </>
              ) : (
                <>
                  <div className="review-stats">
                    <div>
                      <span>Registros detectados</span>
                      <b>{stats.total}</b>
                    </div>
                    <div>
                      <span>Aceptados</span>
                      <b className="green">{stats.accepted}</b>
                    </div>
                    <div>
                      <span>Marcados como dudosos</span>
                      <b className="amber">{stats.doubt}</b>
                    </div>
                    <div>
                      <span>Archivos de origen</span>
                      <b>{detail?.sources.length ?? 0}</b>
                    </div>
                  </div>
                  <div className="section-heading">
                    <div>
                      <h2>Información detectada</h2>
                      <p>
                        Revisa los datos y compáralos con su fuente antes de
                        aceptarlos.
                      </p>
                    </div>
                    <button
                      className="primary"
                      onClick={() => navigate("import")}
                    >
                      <Upload size={16} /> Importar archivos
                    </button>
                  </div>
                  {!!detail?.sources.some((s) => s.warnings.length) && (
                    <details className="warnings">
                      <summary>
                        <AlertTriangle size={16} /> Observaciones de la
                        importación
                      </summary>
                      {detail.sources.map((s) =>
                        s.warnings.map((w, i) => (
                          <p key={s.id + i}>
                            {s.filename}: {w}
                          </p>
                        )),
                      )}
                    </details>
                  )}
                  <div className="tabs">
                    <button
                      className={section === "all" ? "selected" : ""}
                      onClick={() => setSection("all")}
                    >
                      Todo <span>{stats.total}</span>
                    </button>
                    {Object.entries(sections).map(([key, label]) => (
                      <button
                        key={key}
                        className={section === key ? "selected" : ""}
                        onClick={() => setSection(key)}
                      >
                        {label}{" "}
                        <span>
                          {detail?.records.filter(
                            (r) =>
                              r.section === key && r.review !== "eliminado",
                          ).length ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="toolbar">
                    <label className="search">
                      <Search size={17} />
                      <input
                        aria-label="Buscar registros"
                        placeholder="Buscar descripción, responsable, código…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Filtrar revisión"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="all">Todos los activos</option>
                      <option value="pendiente">Pendientes</option>
                      <option value="aceptado">Aceptados</option>
                      <option value="dudoso">Dudosos</option>
                      <option value="eliminado">Eliminados</option>
                    </select>
                    <select
                      aria-label="Ordenar"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="source">Orden de origen</option>
                      <option value="description">Descripción A–Z</option>
                    </select>
                  </div>
                  <div className="records">
                    {rows.map((r) => {
                      const source = detail?.sources.find(
                        (s) => s.id === r.source_id,
                      );
                      return (
                        <article key={r.id} className="record">
                          <div className="record-top">
                            <span className={"badge " + r.review}>
                              {r.review}
                            </span>
                            <span className="record-section">
                              {sections[r.section]}
                            </span>
                            {!!r.modified && (
                              <span className="edited">
                                Modificado manualmente
                              </span>
                            )}
                          </div>
                          <h3>
                            {String(
                              r.current.description ??
                                (r.current.date
                                  ? "Corte " + fmt(String(r.current.date))
                                  : r.section === "avance"
                                    ? "Indicadores de avance"
                                    : "Registro sin descripción"),
                            )}
                          </h3>
                          <div className="fields">
                            {Object.entries(r.current)
                              .filter(([k]) => k !== "description")
                              .map(([k, v]) => (
                                <div key={k}>
                                  <span>{labels[k] ?? k}</span>
                                  <strong>
                                    {v === null ? "Sin dato" : String(v)}
                                  </strong>
                                </div>
                              ))}
                          </div>
                          {Object.keys(r.generated).length > 0 && (
                            <p className="calculated">
                              Calculado por el sistema: variación{" "}
                              {String(r.generated.variation)} puntos
                              porcentuales
                            </p>
                          )}
                          <div className="record-bottom">
                            <span>
                              <FileText size={14} />{" "}
                              {!r.source_id
                                ? "Agregado manualmente"
                                : source?.kind === "docx"
                                  ? "Word"
                                  : "Excel"}{" "}
                              · {r.location}
                            </span>
                            <div>
                              <button
                                disabled={
                                  busy || detail?.cut.status === "publicado"
                                }
                                onClick={() => run(() => save(r, "aceptado"))}
                              >
                                <Check size={14} /> Aceptar
                              </button>
                              <button
                                onClick={() => setEdit(structuredClone(r))}
                              >
                                Editar y ver fuente
                              </button>
                              <button
                                disabled={
                                  busy || detail?.cut.status === "publicado"
                                }
                                onClick={() => run(() => save(r, "dudoso"))}
                              >
                                Dudoso
                              </button>
                              <button
                                disabled={
                                  busy || detail?.cut.status === "publicado"
                                }
                                className="danger"
                                onClick={() =>
                                  run(() =>
                                    save(
                                      r,
                                      r.review === "eliminado"
                                        ? "pendiente"
                                        : "eliminado",
                                    ),
                                  )
                                }
                              >
                                {r.review === "eliminado"
                                  ? "Restaurar"
                                  : "Eliminar"}
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {!rows.length && (
                    <div className="empty">
                      <Files size={35} />
                      <h2>
                        {stats.total
                          ? "No hay registros con este filtro"
                          : "Aún no hay información importada"}
                      </h2>
                      <p>
                        {stats.total
                          ? "Prueba otra sección o búsqueda."
                          : "Carga el Word semanal y el Excel del proyecto para comenzar."}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
      {editingProject && project && (
        <ProjectEditor
          project={project}
          onClose={() => setEditingProject(false)}
          onSaved={async (p) => {
            setProject(p);
            setProjects(await api("/projects"));
          }}
        />
      )}
      {modal && (
        <div className="overlay">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label={modal === "project" ? "Crear proyecto" : "Crear corte"}
          >
            <button
              className="close"
              aria-label="Cerrar"
              onClick={() => setModal("")}
            >
              <X />
            </button>
            <h2>
              {modal === "project" ? "Crear proyecto" : "Nuevo corte semanal"}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const values = Object.fromEntries(
                  new FormData(e.currentTarget),
                );
                run(async () => {
                  if (modal === "project") {
                    const p = await api("/projects", {
                      method: "POST",
                      ...json({ ...values, start_date: values.start_date || null, target_date: values.target_date || null, go_live: values.go_live || null, close_date: values.close_date || null }),
                    });
                    setProjects(await api("/projects"));
                    await selectProject(p);
                  } else {
                    const c = await api("/projects/" + project!.id + "/cuts", {
                      method: "POST",
                      ...json({
                        ...values,
                        copy_from: values.copy_from === "__master__" ? null : values.copy_from || null,
                        from_master: values.copy_from === "__master__",
                        start_date: values.start_date || null,
                        end_date: values.end_date || null,
                      }),
                    });
                    setCuts(await api("/projects/" + project!.id + "/cuts"));
                    setCutId(c.id);
                    await load(c.id);
                    setView(values.copy_from ? "data" : "import");
                  }
                  setModal("");
                });
              }}
            >
              {modal === "project" ? (
                <>
                  <label>
                    Nombre del proyecto
                    <input name="name" required maxLength={200} autoFocus />
                  </label>
                  <label>
                    Descripción
                    <textarea name="description" rows={3} />
                  </label>
                  <label>
                    Objetivo
                    <textarea name="objective" rows={2} />
                  </label>
                  <ProjectFields />
                </>
              ) : (
                <>
                  <p>
                    Los archivos se asociarán a esta fecha. Los cortes
                    anteriores se conservan.
                  </p>
                  <label>
                    Fecha del reporte
                    <input name="report_date" type="date" required autoFocus />
                  </label>
                  <div className="form-grid">
                    <label>Inicio del periodo<input name="start_date" type="date" /></label>
                    <label>Fin del periodo<input name="end_date" type="date" /></label>
                  </div>
                  <label>
                    Origen del nuevo corte
                    <select name="copy_from" defaultValue="">
                      <option value="">Comenzar vacío</option><option value="__master__">Estado actual del catálogo (elementos seleccionados)</option>
                      {cuts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {fmt(c.report_date)} · {c.status}
                        </option>
                      ))}
                    </select>
                    <small>
                      Se copian los registros activos para revisión. El avance y
                      el resumen semanal empiezan vacíos.
                    </small>
                  </label>
                </>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary" disabled={busy}>
                {busy ? "Guardando…" : "Crear"}
              </button>
            </form>
          </section>
        </div>
      )}
      {edit && (
        <div className="overlay">
          <section
            className="dialog editor"
            role="dialog"
            aria-modal="true"
            aria-label="Revisar registro"
          >
            <button
              className="close"
              aria-label="Cerrar editor"
              onClick={() => setEdit(null)}
            >
              <X />
            </button>
            <div className="eyebrow">TRAZABILIDAD DEL REGISTRO</div>
            <h2>Revisar información</h2>
            <p>
              {detail?.sources.find((s) => s.id === edit.source_id)?.filename} ·{" "}
              {edit.location}
            </p>
            <div className="editor-grid">
              <div>
                <h3>Valor actual</h3>
                <label>
                  Sección
                  <select
                    disabled={busy || detail?.cut.status === "publicado"}
                    value={edit.section}
                    onChange={(e) =>
                      setEdit({ ...edit, section: e.target.value })
                    }
                  >
                    {Object.entries(sections).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                {Array.from(
                  new Set([
                    ...Object.keys(edit.current),
                    "description",
                    "executive_title",
                    "owner",
                  ]),
                ).map((k) => (
                  <label key={k}>
                    {labels[k] ?? k}
                    {typeof edit.current[k] === "boolean" || k === "executive_priority" ? (
                      <input type="checkbox" checked={edit.current[k] === true} disabled={busy || detail?.cut.status === "publicado"}
                        onChange={e => setEdit({...edit,current:{...edit.current,[k]:e.target.checked}})} />
                    ) : <textarea
                      disabled={busy || detail?.cut.status === "publicado"}
                      rows={k === "description" ? 5 : 2}
                      value={
                        edit.current[k] === null
                          ? ""
                          : String(edit.current[k] ?? "")
                      }
                      onChange={(e) => {
                        const numeric = [
                          "planned",
                          "actual",
                          "weight",
                          "source_variation", "percentage", "confidence_percent",
                        ].includes(k);
                        setEdit({
                          ...edit,
                          current: {
                            ...edit.current,
                            [k]: numeric
                              ? e.target.value === ""
                                ? null
                                : Number(e.target.value)
                              : e.target.value,
                          },
                        });
                      }}
                    />}
                  </label>
                ))}
              </div>
              <div className="original">
                <h3>Original importado</h3>
                <p>Esta referencia permanece intacta.</p>
                <OriginalValues value={edit.original} />
                <h3>Información generada</h3>
                <p>
                  {edit.generated.variation !== undefined
                    ? `Variación: ${edit.generated.variation} puntos porcentuales`
                    : "Sin cálculos generados"}
                </p>
              </div>
            </div>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button onClick={() => setEdit(null)}>Cancelar</button>
              <button
                disabled={busy || detail?.cut.status === "publicado"}
                onClick={() => run(() => save(edit, "dudoso"))}
              >
                Guardar como dudoso
              </button>
              <button
                className="primary"
                disabled={busy || detail?.cut.status === "publicado"}
                onClick={() => run(() => save(edit, "aceptado"))}
              >
                Guardar y aceptar
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function SourceList({ sources }: { sources: Source[] }) {
  return (
    <section className="panel">
      <h2>Archivos importados</h2>
      {!sources.length ? (
        <p>Aún no hay archivos en este corte.</p>
      ) : (
        sources.map((s) => (
          <div className="source" key={s.id}>
            <FileText size={20} />
            <div>
              <strong>{s.filename}</strong>
              <small>SHA-256: {s.sha256}</small>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
