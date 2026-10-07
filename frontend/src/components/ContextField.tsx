import { useState } from "react";
import { SearchPicker, type Choice } from "./SearchPicker";
export function ContextField({
  label,
  value,
  display,
  options,
  type = "text",
  search = false,
  multiple = false,
  required = false,
  min,
  max,
  disabled = false,
  className = "",
  onSave,
  onEditing,
}: {
  label: string;
  value: any;
  display?: string;
  options?: Choice[];
  type?: string;
  search?: boolean;
  multiple?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  onSave: (value: any) => Promise<void>;
  onEditing?: (editing: boolean) => void;
}) {
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState(value),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const close = () => {
    setOpen(false);
    onEditing?.(false);
  };
  const text =
    display ??
    (options
      ? Array.isArray(value)
        ? value
            .map((v) => options.find((o) => o.value === v)?.label || v)
            .join(", ")
        : options.find((o) => o.value === String(value ?? ""))?.label
      : null) ??
    String(value ?? "");
  return (
    <div className="context-field">
      <span className="control-label">{label}</span>
      {!open ? (
        <button
          type="button"
          disabled={disabled}
          className={"field-chip " + className}
          title={text || "Sin definir"}
          aria-label={"Editar " + label + ": " + (text || "Sin definir")}
          onClick={() => {
            setDraft(value);
            setError("");
            setOpen(true);
            onEditing?.(true);
          }}
        >
          {text || "Sin definir"} <span aria-hidden="true">✎</span>
        </button>
      ) : (
        <form
          className="context-editor"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) {
              e.stopPropagation();
              e.preventDefault();
              close();
            }
          }}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await onSave(draft);
              close();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {search && options ? (
            <SearchPicker
              disabled={busy}
              label={label}
              value={draft ?? (multiple ? [] : "")}
              options={options}
              multiple={multiple}
              onChange={setDraft}
            />
          ) : options ? (
            <select
              autoFocus
              disabled={busy}
              aria-label={label}
              value={draft ?? ""}
              onChange={(e) => setDraft(e.target.value)}
            >
              {options.map((o) => (
                <option value={o.value} key={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : type === "textarea" ? (
            <textarea
              autoFocus
              aria-label={label}
              disabled={busy}
              value={draft ?? ""}
              required={required}
              onChange={(e) => setDraft(e.target.value)}
            />
          ) : (
            <input
              autoFocus
              aria-label={label}
              disabled={busy}
              type={type}
              min={min}
              max={max}
              step={type === "number" ? "any" : undefined}
              required={required}
              value={draft ?? ""}
              onChange={(e) => setDraft(e.target.value)}
            />
          )}
          <div className="inline-actions">
            <button disabled={busy} className="primary">
              Guardar
            </button>
            <button disabled={busy} type="button" onClick={close}>
              Cancelar
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
    </div>
  );
}
