import { dateKey } from "../operations/calendarModel";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  AlertCircle,
  ListTodo,
} from "lucide-react";
import { api } from "../../api";
import type { Project, Cut } from "../../types";
import type { Item } from "../master/ItemEditor";
import "./projects.css";
const closed = (i: Item) =>
  ["closed", "cerrado", "resolved", "resuelto", "removed", "retirado"].includes(
    i.status.toLowerCase(),
  );
export function ProjectSummary({
  project,
  cuts,
  onExecutive,
  onEdit,
  onNavigate,
}: {
  project: Project;
  cuts: Cut[];
  onExecutive: () => void;
  onEdit: () => void;
  onNavigate: (view: string) => void;
}) {
  const [items, setItems] = useState<Item[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api(`/projects/${project.id}/items`)
      .then((v) => {
        if (active) setItems(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [project.id]);
  const today = dateKey(new Date());
  const current = items.filter((i) => !i.archived),
    work = current.filter((i) => i.kind === "Activity"),
    open = current.filter((i) => !closed(i));
  const overdue = open.filter((i) => i.target_date && i.target_date < today),
    blocked = open.filter((i) =>
      ["blocked", "bloqueado"].includes(i.status.toLowerCase()),
    );
  const upcoming = open
    .filter((i) => i.target_date)
    .sort((a, b) => a.target_date!.localeCompare(b.target_date!))
    .slice(0, 5);
  return (
    <div className="overview">
      {error && (
        <p role="alert" className="message error">
          {error}
        </p>
      )}
      <div className="overview-metrics" aria-busy={loading}>
        {[
          {
            label: "Trabajos activos",
            value: work.filter((i) => !closed(i)).length,
            icon: ListTodo,
            view: "backlog",
            tone: "blue",
          },
          {
            label: "Trabajos cerrados o resueltos",
            value: work.filter((i) =>
              ["closed", "cerrado", "resolved", "resuelto"].includes(
                i.status.toLowerCase(),
              ),
            ).length,
            icon: CheckCircle2,
            view: "board",
            tone: "green",
          },
          {
            label: "Compromisos vencidos",
            value: overdue.length,
            icon: Clock3,
            view: "master",
            tone: "amber",
          },
          {
            label: "Elementos bloqueados",
            value: blocked.length,
            icon: AlertCircle,
            view: "master",
            tone: "rose",
          },
        ].map((m) => (
          <button
            className={"overview-metric " + m.tone}
            key={m.label}
            onClick={() => onNavigate(m.view)}
          >
            <span className="metric-icon">
              <m.icon size={21} />
            </span>
            <strong>{loading || error ? "—" : m.value}</strong>
            <span>{m.label}</span>
            <ArrowUpRight className="metric-arrow" size={16} />
          </button>
        ))}
      </div>
      <div className="overview-columns">
        <section className="panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow">PRÓXIMOS PASOS</div>
              <h2>El trabajo que necesita atención</h2>
            </div>
            <button onClick={() => onNavigate("backlog")}>
              Ver planificación <ArrowUpRight size={16} />
            </button>
          </div>
          {!loading && !error && !current.length ? (
            <div className="getting-started">
              <ListTodo size={30} />
              <h3>Construye el plan de tu proyecto</h3>
              <p>
                Empieza por los entregables y las tareas. Después asigna
                responsables y fechas para ver tus próximos compromisos aquí.
              </p>
              <button className="primary" onClick={() => onNavigate("backlog")}>
                Crear el primer trabajo
              </button>
            </div>
          ) : (
            <div className="attention-list">
              {upcoming.map((i) => (
                <button
                  key={i.id}
                  onClick={() =>
                    onNavigate(i.kind === "Activity" ? "backlog" : "master")
                  }
                >
                  <span
                    className={
                      i.target_date! < today ? "due-date overdue" : "due-date"
                    }
                  >
                    {i.target_date?.slice(8)}
                    <small>
                      {new Date(i.target_date + "T12:00:00").toLocaleDateString(
                        "es-MX",
                        { month: "short" },
                      )}
                    </small>
                  </span>
                  <span>
                    <small>
                      {i.code} · {i.owner_name || "Sin responsable"}
                    </small>
                    <strong>{i.name}</strong>
                  </span>
                  <span className="status-pill">
                    {i.target_date! < today
                      ? "Vencido"
                      : (
                          {
                            New: "Nuevo",
                            Active: "En ejecución",
                            Prepared: "Preparado",
                            Blocked: "Bloqueado",
                          } as Record<string, string>
                        )[i.status] || i.status}
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
              {!upcoming.length && !loading && (
                <p>
                  No hay compromisos abiertos con fecha. Completa las fechas en
                  planificación para organizar el siguiente paso.
                </p>
              )}
            </div>
          )}
          <div className="overview-footnote">
            Estado actual del catálogo · Los reportes publicados mantienen sus
            datos históricos.
          </div>
        </section>
        <section className="panel executive-card">
          <div className="eyebrow">SEGUIMIENTO EJECUTIVO</div>
          <h2>Tu siguiente reporte</h2>
          <p>
            {cuts.some((c) => c.status === "borrador")
              ? "Tienes cortes en preparación. Revisa el contenido y concilia los cambios antes de publicar."
              : "Prepara un corte para contar los avances, decisiones y riesgos de esta semana."}
          </p>
          <div className="report-counts">
            <div>
              <strong>
                {cuts.filter((c) => c.status === "borrador").length}
              </strong>
              <span>En preparación</span>
            </div>
            <div>
              <strong>
                {cuts.filter((c) => c.status === "publicado").length}
              </strong>
              <span>Publicados</span>
            </div>
          </div>
          <button className="primary" onClick={onExecutive}>
            Abrir cortes <ArrowUpRight size={16} />
          </button>
        </section>
      </div>
      <div className="overview-columns">
        <section className="panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow">DIRECCIÓN DEL PROYECTO</div>
              <h2>Objetivo y fechas clave</h2>
            </div>
            <button onClick={onEdit}>Editar ficha</button>
          </div>
          <p>
            {project.objective ||
              "Añade el objetivo para que el equipo tenga claro el resultado esperado."}
          </p>
          <dl className="project-facts">
            {[
              ["Metodología", project.methodology],
              ["Prioridad", project.priority],
              ["Estado", project.status],
              ["Inicio", project.start_date],
              ["Fecha objetivo", project.target_date],
              ["Go Live", project.go_live],
              ["Cierre", project.close_date],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "Sin definir"}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="panel">
          <div className="eyebrow">ORGANIZA LA OPERACIÓN</div>
          <h2>Todo en su lugar</h2>
          <div className="module-links">
            {[
              [
                "teams",
                "Personas y equipos",
                "Asigna responsables y capacidad",
              ],
              ["agenda", "Agenda", "Organiza reuniones y compromisos"],
              ["budget", "Presupuesto", "Controla costos por moneda"],
              ["documents", "Documentos", "Conserva los archivos del proyecto"],
            ].map(([id, title, description]) => (
              <button key={id} onClick={() => onNavigate(id)}>
                <span>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
