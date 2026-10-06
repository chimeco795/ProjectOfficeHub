import { useState } from "react";
export function InlineField({
  label,
  value,
  display,
  options,
  className = "",
  onSave,
}: {
  label: string;
  value: string;
  display?: string;
  options?: Record<string, string>;
  className?: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(value),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <span className="inline-field">
      {!open ? (
        <button
          className={"field-chip " + className}
          aria-label={
            "Editar " +
            label +
            ": " +
            (display || options?.[value] || value || "Sin fecha")
          }
          onClick={() => {
            setDraft(value);
            setError("");
            setOpen(true);
          }}
        >
          {display || options?.[value] || value || "Sin fecha"}
          <span aria-hidden="true">⌄</span>
        </button>
      ) : (
        <form
          className="inline-popover"
          aria-label={label}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) {
              e.stopPropagation();
              setOpen(false);
            }
          }}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              if (draft !== value) await onSave(draft);
              setOpen(false);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {label}
            {options ? (
              <select
                autoFocus
                disabled={busy}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              >
                {Object.entries(options).map(([v, t]) => (
                  <option value={v} key={v}>
                    {t}
                  </option>
                ))}
              </select>
            ) : (
              <input
                autoFocus
                disabled={busy}
                type="date"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            )}
          </label>
          <div className="inline-actions">
            <button className="primary" disabled={busy}>
              Guardar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
          </div>
          {error && <span role="alert">{error}</span>}
        </form>
      )}
    </span>
  );
}
