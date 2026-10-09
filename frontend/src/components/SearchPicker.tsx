import { useState, useId, useRef, useLayoutEffect } from "react";
import { matchingChoices, type Choice } from "./choiceModel";
export { personChoices } from "./choiceModel";
export type { Choice } from "./choiceModel";
export function SearchPicker({
  label,
  value,
  options,
  onChange,
  multiple = false,
  disabled = false,
  autoFocus = false,
  onEscape,
}: {
  label: string;
  value: string | string[];
  options: Choice[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  onEscape?: () => void;
}) {
  const [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(0);
  const id = useId();
  const root=useRef<HTMLDivElement>(null);
  const [popup,setPopup]=useState<{left:number;top:number;width:number;height:number}>({left:8,top:8,width:240,height:240});
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{const r=root.current!.getBoundingClientRect(),height=Math.min(240,Math.max(100,Math.max(r.top,window.innerHeight-r.bottom)-12));setPopup({left:Math.max(8,Math.min(r.left,window.innerWidth-248)),top:r.bottom+height+8<=window.innerHeight?r.bottom+4:Math.max(8,r.top-height-4),width:Math.min(Math.max(240,r.width),window.innerWidth-16),height});};
    place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[open,query]);
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const matches = matchingChoices(options,selected,query);
  const choose = (v: string) => {
    onChange(multiple ? [...selected, v] : v);
    setQuery("");
    setOpen(false);
    setActive(0);
  };
  return (
    <div
      className="search-picker"
      ref={root}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <span className="control-label">{label}</span>
      <div className="picker-control">
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
          autoFocus={autoFocus}
          disabled={disabled}
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={id}
          aria-autocomplete="list"
          aria-activedescendant={
            open && query.trim() && matches[active]
              ? id + "-" + active
              : undefined
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
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              onEscape?.();
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) =>
                Math.max(0, Math.min(a + 1, matches.length - 1)),
              );
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            }
            if (e.key === "Enter" && open && query.trim()) {
              e.preventDefault();
              e.stopPropagation();
              if (matches[active]) choose(matches[active].value);
            }
          }}
        />
      </div>
      {open && (
        <>
          <ul id={id} role="listbox" aria-label={label + " disponibles"} className="floating-choices" style={{position:'fixed',left:popup.left,top:popup.top,width:popup.width,maxHeight:popup.height}}>
            {query.trim() &&
              matches.map((o, n) => (
                <li
                  key={o.value}
                  id={id + "-" + n}
                  role="option"
                  aria-selected={n === active}
                >
                  <button
                    disabled={disabled}
                    type="button"
                    onPointerDown={e=>e.preventDefault()}
                    onClick={() => choose(o.value)}
                  >
                    {o.person && (
                      <span className="picker-avatar" aria-hidden="true">
                        {o.label
                          .split(" ")
                          .slice(0, 2)
                          .map((s) => s[0])
                          .join("")}
                      </span>
                    )}
                    <span>
                      {o.label}
                      {o.detail && <small>{o.detail}</small>}
                    </span>
                  </button>
                </li>
              ))}
            {!query.trim() ? (
              <li>Escribe para buscar</li>
            ) : (
              !matches.length && <li>Sin coincidencias</li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
