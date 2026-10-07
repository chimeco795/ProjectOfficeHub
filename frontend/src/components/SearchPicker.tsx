import { useState, useId } from "react";
export type Choice = { value: string; label: string };
export function SearchPicker({
  label,
  value,
  options,
  onChange,
  multiple = false,
  disabled = false,
}: {
  label: string;
  value: string | string[];
  options: Choice[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(0);
  const id = useId();
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const matches = options
    .filter(
      (o) =>
        !selected.includes(o.value) &&
        o.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .slice(0, 30);
  const choose = (v: string) => {
    onChange(multiple ? [...selected, v] : v);
    setQuery("");
    setOpen(false);
    setActive(0);
  };
  return (
    <div className="search-picker">
      <span className="control-label">{label}</span>
      <div className="dependency-chips">
        {selected.map((v) => (
          <button
            disabled={disabled}
            type="button"
            key={v}
            title={options.find((o) => o.value === v)?.label || v}
            onClick={() =>
              onChange(multiple ? selected.filter((x) => x !== v) : "")
            }
            aria-label={
              "Quitar " + (options.find((o) => o.value === v)?.label || v)
            }
          >
            {options.find((o) => o.value === v)?.label || v} ×
          </button>
        ))}
      </div>
      <input
        disabled={disabled}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        aria-autocomplete="list"
        aria-activedescendant={
          open && matches[active] ? id + "-" + active : undefined
        }
        value={query}
        placeholder="Buscar…"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            setOpen(false);
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, matches.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          }
          if (e.key === "Enter" && open) {
            e.preventDefault();
            if (matches[active]) choose(matches[active].value);
          }
        }}
      />
      {open && (
        <>
          <ul id={id} role="listbox" aria-label={label + " disponibles"}>
            {matches.map((o, n) => (
              <li
                key={o.value}
                id={id + "-" + n}
                role="option"
                aria-selected={n === active}
              >
                <button
                  disabled={disabled}
                  type="button"
                  onClick={() => choose(o.value)}
                >
                  {o.label}
                </button>
              </li>
            ))}
            {!matches.length && <li>Sin coincidencias</li>}
          </ul>
          <button type="button" onClick={() => setOpen(false)}>
            Cerrar sugerencias
          </button>
        </>
      )}
    </div>
  );
}
