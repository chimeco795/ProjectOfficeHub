export const states: Record<string, string> = {
  New: "Nuevo",
  Prepared: "Preparado",
  Active: "En ejecución",
  Resolved: "Resuelto",
  Closed: "Cerrado",
  Blocked: "Bloqueado",
  Removed: "Retirado",
};
export const iterationLabel = (methodology: string) => methodology === 'Agile' ? 'Sprint' : methodology === 'Hybrid' ? 'Iteración / Sprint' : 'Periodo';
export const types: Record<string, string> = {
  Epic: "Épica",
  Feature: "Funcionalidad",
  EnablerFeature: "Habilitador",
  UserStory: "Historia",
  EnablerUserStory: "Historia habilitadora",
  Task: "Tarea",
  Bug: "Defecto",
  Issue: "Incidencia de trabajo",
  Phase: "Fase",
  Deliverable: "Entregable",
  Activity: "Actividad",
  Document: "Documento de trabajo",
  Evidence: "Evidencia",
};

export function allowedTypes(methodology: string): string[] {
  const agile = [
    "Epic",
    "Feature",
    "EnablerFeature",
    "UserStory",
    "Task",
    "Bug",
    "Issue",
  ];
  const waterfall = [
    "Phase",
    "Deliverable",
    "Activity",
    "Document",
    "Evidence",
  ];
  return methodology === "Agile"
    ? agile
    : methodology === "Waterfall"
      ? waterfall
      : [...new Set([...agile, ...waterfall])];
}
export function stateClass(status: string) {
  return Object.hasOwn(states, status)
    ? "state-" + status.toLowerCase()
    : "state-new";
}
export function hierarchy<T extends { id: string; parent_id: string | null }>(
  items: T[],
  all: T[],
): { item: T; depth: number }[] {
  const byId = new Map(all.map((i) => [i.id, i]));
  const path = (i: T) => {
    const ids = [i.id];
    let parent = i.parent_id;
    while (parent && byId.has(parent) && !ids.includes(parent)) {
      ids.unshift(parent);
      parent = byId.get(parent)!.parent_id;
    }
    return ids;
  };
  const order = new Map(all.map((i, n) => [i.id, n]));
  return items
    .map((item) => ({ item, path: path(item) }))
    .sort((a, b) => {
      for (let i = 0; i < Math.min(a.path.length, b.path.length); i++) {
        if (a.path[i] !== b.path[i])
          return (order.get(a.path[i]) ?? 0) - (order.get(b.path[i]) ?? 0);
      }
      return a.path.length - b.path.length;
    })
    .map(({ item, path }) => ({ item, depth: path.length - 1 }));
}
