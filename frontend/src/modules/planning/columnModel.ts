import { states } from './workPresentation';
export const defaultColumns = ['New', 'Prepared', 'Active', 'Blocked'];
export function restoreColumns(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...defaultColumns];
  const columns = [...new Set(raw.filter((x): x is string => typeof x === 'string' && (Object.hasOwn(states, x) || x === 'Otros')))];
  return columns.length ? columns.slice(0, 4) : [...defaultColumns];
}
export function reorderColumn(columns: string[], state: string, offset: number): string[] {
  const from = columns.indexOf(state), to = from + offset;
  if (from < 0 || to < 0 || to >= columns.length) return columns;
  const next = [...columns];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
