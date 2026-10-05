export type ScheduledWork = {
  id: string;
  code: string;
  name: string;
  start_date: string | null;
  target_date: string | null;
  dependencies: string[];
  archived: boolean | number;
  status: string;
};
const day = 86400000;
export function analyzeSchedule(items: ScheduledWork[], today: string) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const closed = (status: string) =>
    [
      "closed",
      "resolved",
      "removed",
      "cerrado",
      "resuelto",
      "retirado",
    ].includes(status.toLowerCase());
  return items
    .filter((i) => !i.archived)
    .map((item) => {
      const warnings: string[] = [];
      if (!item.start_date || !item.target_date)
        warnings.push("Fechas incompletas");
      if (!closed(item.status) && item.target_date && item.target_date < today)
        warnings.push("Compromiso vencido");
      let earliest: string | null = null;
      for (const id of item.dependencies) {
        const predecessor = byId.get(id);
        if (!predecessor) {
          warnings.push("Predecesor no disponible");
          continue;
        }
        if (predecessor.archived)
          warnings.push(`Predecesor archivado: ${predecessor.code}`);
        if (!predecessor.target_date) {
          warnings.push(`Predecesor sin compromiso: ${predecessor.code}`);
          continue;
        }
        const next = new Date(
          Date.parse(predecessor.target_date + "T00:00:00Z") + day,
        )
          .toISOString()
          .slice(0, 10);
        if (!earliest || next > earliest) earliest = next;
        if (item.start_date && item.start_date < next)
          warnings.push(`Inicio anterior al fin de ${predecessor.code}`);
      }
      return { item, warnings, earliest };
    });
}
