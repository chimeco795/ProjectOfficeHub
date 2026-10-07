export function visibleHierarchy<
  T extends { id: string; parent_id: string | null },
>(rows: T[], all: T[], collapsed: Set<string>): T[] {
  const parents = new Map(all.map((i) => [i.id, i.parent_id]));
  return rows.filter((item) => {
    const visited = new Set<string>();
    let parent = item.parent_id;
    while (parent && !visited.has(parent)) {
      if (collapsed.has(parent)) return false;
      visited.add(parent);
      parent = parents.get(parent) || null;
    }
    return true;
  });
}
export const ganttPosition = (date: string, start: number, span: number) =>
  ((Date.parse(date) - start) / span) * 100;
