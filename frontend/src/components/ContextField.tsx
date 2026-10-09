import { useState, useRef, useEffect } from "react";
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
  showLabel = true,
  confirm = false,
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
  showLabel?: boolean;
  confirm?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [saved,setSaved]=useState(false),
    [draft, setDraft] = useState(value),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const form = useRef<HTMLFormElement>(null),
    saving = useRef(false);
  useEffect(()=>{if(!saved)return;const timer=setTimeout(()=>setSaved(false),2500);return()=>clearTimeout(timer);},[saved]);
  const explicit = confirm || multiple || type === "textarea";
  const close = () => {
    setOpen(false);
    onEditing?.(false);
  };
  async function commit(next = draft) {
    if (saving.current) return;
    if (form.current && !form.current.checkValidity()) {
      setError("Revisa el valor antes de guardar.");
      return;
    }
    if (required && (next == null || String(next).trim() === "")) {
      setError("Este campo es obligatorio.");
      return;
    }
    if (JSON.stringify(next) === JSON.stringify(value)) {
      close();
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await onSave(next);
      setSaved(true);
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
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
      {showLabel && <span className="control-label">{label}{saved&&<small role="status" className="saved-feedback"> · Guardado</small>}</span>}
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
          {text || "Sin definir"}
        </button>
      ) : (
        <form
          ref={form}
          className="context-editor"
          onBlur={(e) => {
            if (!explicit && !e.currentTarget.contains(e.relatedTarget as Node))
              void commit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !busy) {
              e.stopPropagation();
              e.preventDefault();
              close();
            }
            if (e.key === "Enter" && !explicit && !e.defaultPrevented) {
              e.preventDefault();
              void commit();
            }
          }}
          onSubmit={async (e) => {
            e.preventDefault();
            void commit();
          }}
        >
          {search && options ? (
            <SearchPicker
              autoFocus
              onEscape={() => {
                if (!busy) close();
              }}
              disabled={busy}
              label={label}
              value={draft ?? (multiple ? [] : "")}
              options={options}
              multiple={multiple}
              onChange={(next) => {
                setDraft(next);
                if (!explicit) void commit(next);
              }}
            />
          ) : options ? (
            <select
              autoFocus
              disabled={busy}
              aria-label={label}
              value={draft ?? ""}
              onChange={(e) => {setDraft(e.target.value); if (!explicit) void commit(e.target.value);}}
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
          {explicit && (
            <div className="inline-actions">
              <button disabled={busy} className="primary">
                Guardar
              </button>
              <button disabled={busy} type="button" onClick={close}>
                Cancelar
              </button>
            </div>
          )}
          {busy && <small role="status">Guardando…</small>}
          {error && <p role="alert">{error}</p>}
        </form>
      )}
    </div>
  );
}
