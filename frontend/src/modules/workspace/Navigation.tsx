import { planningViews, roadmapLabel } from "../planning/methodology";
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  CalendarDays,
  FileBarChart2,
  History,
} from "lucide-react";
export const groups = [
  {
    label: "Vista general",
    icon: LayoutDashboard,
    views: [["summary", "Vista general"]],
  },
  {
    label: "Planificación",
    icon: KanbanSquare,
    views: [
      ["board", "Tablero"],
      ["backlog", "Lista de trabajo"],
      ["gantt", "Cronograma"],
      ["roadmap", "Iteraciones y entregas"],
    ],
  },
  {
    label: "Gestión",
    icon: Users,
    views: [
      ["master", "RAID e hitos"],
      ["teams", "Equipo y roles"],
      ["budget", "Presupuesto"],
    ],
  },
  {
    label: "Operación",
    icon: CalendarDays,
    views: [
      ["agenda", "Agenda"],
      ["documents", "Documentos"],
    ],
  },
  {
    label: "Seguimiento ejecutivo",
    icon: FileBarChart2,
    views: [
      ["history", "Cortes"],
      ["weekly", "Actualización"],
      ["report", "Reporte"],
      ["data", "Contenido"],
      ["import", "Importar"],
      ["review", "Revisar"],
      ["reconcile", "Conciliar"],
      ["timeline", "Trazabilidad"],
    ],
  },
  { label: "Auditoría", icon: History, views: [["audit", "Auditoría"]] },
];
export function WorkspaceNav({
  view,
  onNavigate,
  methodology = "Hybrid",
}: {
  methodology?: string;
  view: string;
  onNavigate: (view: string) => void;
}) {
  return (
    <nav aria-label="Módulos del proyecto">
      {groups.map((g) => {
        const selected = g.views.some(([id]) => id === view);
        return (
          <button
            key={g.label}
            className={"nav " + (selected ? "active" : "")}
            aria-current={selected ? "page" : undefined}
            onClick={() =>
              onNavigate(
                g.label === "Planificación" && methodology === "Waterfall"
                  ? "gantt"
                  : g.views[0][0],
              )
            }
          >
            <g.icon size={18} />
            {g.label}
          </button>
        );
      })}
    </nav>
  );
}
export function WorkspaceTabs({
  methodology = "Hybrid",
  view,
  onNavigate,
}: {
  view: string;
  onNavigate: (view: string) => void;
  methodology?: string;
}) {
  const group = groups.find((g) => g.views.some(([id]) => id === view));
  if (!group || group.views.length < 2) return null;
  return (
    <nav className="workspace-tabs" aria-label={group.label}>
      {(group.label === "Planificación"
        ? planningViews(methodology)
        : group.views
      ).map(([id, label]) => (
        <button
          key={id}
          aria-current={
            id === view || (id === "board" && view === "backlog")
              ? "page"
              : undefined
          }
          className={
            id === view || (id === "board" && view === "backlog")
              ? "selected"
              : ""
          }
          onClick={() => onNavigate(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
export const viewLabel = (view: string, methodology = "Hybrid") =>
  view === "roadmap"
    ? roadmapLabel(methodology)
    : groups.flatMap((g) => g.views).find(([id]) => id === view)?.[1] ||
      "Portafolio";
