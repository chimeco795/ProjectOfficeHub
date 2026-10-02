import type { Project, Cut } from "../../types";
import "./projects.css";

export function ProjectSummary({ project, cuts, onExecutive, onEdit }: {
  project: Project;
  cuts: Cut[];
  onExecutive: () => void;
  onEdit: () => void;
}) {
  return <div className="project-summary">
    <section className="panel">
      <div className="eyebrow">FICHA DEL PROYECTO</div>
      <h2>Objetivo y planificación</h2>
      <p>{project.objective || "Define el objetivo del proyecto desde Editar proyecto."}</p>
      <dl className="project-facts">
        {[
          ["Metodología", project.methodology], ["Prioridad", project.priority],
          ["Estado", project.status], ["Inicio", project.start_date],
          ["Fecha objetivo", project.target_date], ["Go Live", project.go_live],
          ["Cierre", project.close_date],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Sin definir"}</dd></div>)}
      </dl>
      <button onClick={onEdit}>Editar ficha del proyecto</button>
    </section>
    <section className="panel">
      <div className="eyebrow">SEGUIMIENTO EJECUTIVO</div>
      <h2>Una historia por semana</h2>
      <p>Consulta los cortes, revisa las fuentes y prepara el reporte ejecutivo de este proyecto.</p>
      <div className="portfolio-stats">
        <div><b>{cuts.length}</b><span>Cortes</span></div>
        <div><b>{cuts.filter(c => c.status === "publicado").length}</b><span>Publicados</span></div>
        <div><b>{cuts.filter(c => c.status === "borrador").length}</b><span>Borradores</span></div>
      </div>
      <button className="primary" onClick={onExecutive}>Abrir Seguimiento Ejecutivo</button>
    </section>
  </div>;
}
