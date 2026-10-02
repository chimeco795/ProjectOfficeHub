type Cell = { header?: unknown; value?: unknown; cached?: unknown };
export function OriginalValues({ value }: { value: Record<string, unknown> }) {
  if (typeof value.text === "string")
    return <div className="original-text">{value.text}</div>;
  if (Array.isArray(value.cells))
    return (
      <dl>
        {value.cells.map((text, index) => (
          <div key={index}>
            <dt>
              {String(
                (value.headers as unknown[])?.[index] ?? `Columna ${index + 1}`,
              )}
            </dt>
            <dd>{String(text)}</dd>
          </div>
        ))}
      </dl>
    );
  return (
    <dl>
      {Object.entries(value).map(([coordinate, raw]) => {
        const cell = raw as Cell;
        return (
          <div key={coordinate}>
            <dt>
              {String(cell.header ?? "Celda")} · {coordinate}
            </dt>
            <dd>
              {String(cell.value ?? "Sin dato")}
              {typeof cell.value === "string" && cell.value.startsWith("=") && (
                <p>
                  Valor almacenado: {String(cell.cached ?? "No disponible")}
                </p>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
