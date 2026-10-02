export const sectionNames: Record<string, string> = {
  general: "Datos generales",
  avance: "Avance importado",
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
export type Field = {
  key: string;
  label: string;
  type?: "date" | "number" | "boolean";
  options?: string[];
};
const names: Record<string, string> = {
  description: "Descripción",
  code: "Código",
  owner: "Responsable",
  status: "Estado",
  category: "Categoría",
  date: "Fecha",
  start_date: "Fecha inicio",
  end_date: "Fecha fin / compromiso",
  actual_date: "Fecha real",
  impact: "Impacto",
  probability: "Probabilidad",
  trend: "Tendencia",
  mitigation: "Acción de mitigación",
  executive_priority: "Prioridad ejecutiva",
  percentage: "Avance (%)",
  priority: "Prioridad",
  root_cause: "Causa raíz",
  provider: "Proveedor",
  comment: "Comentario",
  severity: "Severidad",
  planned: "Planeado (%)",
  actual: "Real (%)",
  milestone: "Hito asociado",
  dependencies: "Dependencias / notas",
  consequence: "Consecuencia",
  justification: "Justificación",
};
const keys: Record<string, string[]> = {
  general: ["description", "owner", "comment"],
  avance: ["date", "planned", "actual", "description"],
  logros: ["description", "category", "owner", "date"],
  problemas: ["description", "impact", "owner", "end_date", "status"],
  actividades: [
    "description",
    "status",
    "owner",
    "start_date",
    "end_date",
    "category",
    "percentage",
    "milestone",
    "dependencies",
  ],
  riesgos: [
    "code",
    "description",
    "impact",
    "probability",
    "trend",
    "status",
    "owner",
    "mitigation",
    "end_date",
    "executive_priority",
    "consequence",
    "justification",
  ],
  hitos: ["description", "end_date", "actual_date", "status", "comment"],
  bloqueos: [
    "description",
    "root_cause",
    "impact",
    "owner",
    "end_date",
    "status",
  ],
  dependencias: ["description", "owner", "provider", "status", "end_date"],
  proximos_pasos: ["description", "owner", "end_date", "priority"],
  decisiones: ["description", "owner", "end_date", "status"],
  alertas: ["description", "severity"],
  acciones: ["description", "owner", "end_date", "status", "priority"],
};
export function fieldsFor(section: string): Field[] {
  return (keys[section] ?? keys.general).map((key) => ({
    key,
    label: names[key] ?? key,
    type: key.includes("date")
      ? "date"
      : ["planned", "actual", "percentage"].includes(key)
        ? "number"
        : key === "executive_priority"
          ? "boolean"
          : undefined,
    options:
      key === "status"
        ? ["Pendiente", "En progreso", "Completada", "Bloqueada", "Cancelada"]
        : key === "trend"
          ? ["Mejora", "Estable", "Empeora"]
          : ["impact", "probability", "priority", "severity"].includes(key)
            ? ["Baja", "Media", "Alta", "Crítica"]
            : undefined,
  }));
}
