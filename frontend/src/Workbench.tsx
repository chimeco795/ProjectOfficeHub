import { useEffect, useState, useId } from "react";
import { Plus, Save, Search, ArrowDownUp, FileText } from "lucide-react";
import type { Detail, Row } from "./types";
import { api, json } from "./api";
import { fieldsFor, sectionNames, type Field } from "./fields";
import { Dialog } from "./Dialog";
import { OriginalValues } from "./OriginalValues";

function Cell({
  field,
  value,
  onChange,
  disabled,
}: {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
}) {
  const label = field.label,
    id = useId();
  if (field.type === "boolean")
    return (
      <input
        aria-label={label}
        type="checkbox"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    );
  if (field.type === "date")
    return (
      <input
        aria-label={label}
        type="date"
        value={String(value ?? "").slice(0, 10)}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
      />
    );
  if (field.type === "number")
    return (
      <input
        aria-label={label}
        type="number"
        min="0"
        max="100"
        step="any"
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        disabled={disabled}
      />
    );
  if (field.options)
    return (
      <>
        <input
          aria-label={label}
          list={id}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        <datalist id={id}>
          {field.options.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </datalist>
      </>
    );
  return (
    <textarea
      aria-label={label}
      rows={field.key === "description" ? 3 : 2}
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

export function Workbench({
  detail,
  reload,
  onDirty,
}: {
  detail: Detail;
  reload: () => Promise<void>;
  onDirty: (v: boolean) => void;
}) {
  const [section, setSection] = useState("actividades"),
    [drafts, setDrafts] = useState<Record<string, Row>>({}),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("active"),
    [page, setPage] = useState(0),
    [sort, setSort] = useState({ key: "", asc: true });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [adding, setAdding] = useState(false),
    [newValue, setNewValue] = useState<Record<string, unknown>>({}),
    [source, setSource] = useState<Row | null>(null),
    [history, setHistory] = useState<
      { changed_at: string; next: string; previous: string }[]
    >([]);
  const dirty = Object.keys(drafts).length > 0,
    locked = detail.cut.status === "publicado";
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const work = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const patch = (row: Row, updates: Partial<Row>) =>
    setDrafts((prev) => ({ ...prev, [row.id]: { ...row, ...updates } }));
  const rows = detail.records
    .map((r) => drafts[r.id] ?? r)
    .filter(
      (r) =>
        r.section === section &&
        (filter === "deleted"
          ? r.review === "eliminado"
          : filter === "active"
            ? r.review !== "eliminado"
            : r.review === filter) &&
        JSON.stringify(r.current).toLowerCase().includes(query.toLowerCase()),
    );
  if (sort.key)
    rows.sort((a, b) => {
      const av = a.current[sort.key],
        bv = b.current[sort.key];
      return (
        (typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""), "es", {
              numeric: true,
            })) * (sort.asc ? 1 : -1)
      );
    });
  const last = Math.max(0, Math.ceil(rows.length / 15) - 1),
    currentPage = Math.min(page, last),
    visible = rows.slice(currentPage * 15, currentPage * 15 + 15),
    fields = fieldsFor(section);
  async function save() {
    await work(async () => {
      await api("/cuts/" + detail.cut.id + "/records", {
        method: "PATCH",
        ...json({
          records: Object.values(drafts).map((r) => ({
            id: r.id,
            version: r.version,
            current: r.current,
            section: r.section,
            review: r.review,
          })),
        }),
      });
      setDrafts({});
      onDirty(false);
      await reload();
      setNotice("Cambios guardados con trazabilidad.");
    });
  }
  return (
    <section className="workbench">
      <div className="section-heading">
        <div>
          <div className="eyebrow">EDITOR DEL CORTE</div>
          <h2>Datos del proyecto</h2>
          <p>
            {locked
              ? "Corte publicado · consulta de solo lectura."
              : "Edita las celdas y guarda el lote de cambios. El original siempre se conserva."}
          </p>
        </div>
        <div className="button-row">
          <button
            disabled={busy || locked || dirty}
            onClick={() => {
              setNewValue({ description: "" });
              setAdding(true);
            }}
          >
            <Plus size={16} /> Agregar registro
          </button>
          <button
            className="primary"
            disabled={!dirty || busy || locked}
            onClick={save}
          >
            <Save size={16} /> Guardar {Object.keys(drafts).length || ""}{" "}
            cambios
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="message error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="message success">
          {notice}
        </p>
      )}
      {dirty && (
        <div className="draft-banner">
          <span>
            {Object.keys(drafts).length} registros con cambios sin guardar.
            Guarda o descarta antes de cambiar de corte o pantalla.
          </span>
          <button
            disabled={busy}
            onClick={() => {
              setDrafts({});
              onDirty(false);
            }}
          >
            Descartar cambios
          </button>
        </div>
      )}
      <div className="tabs">
        {Object.entries(sectionNames).map(([key, name]) => (
          <button
            key={key}
            className={section === key ? "selected" : ""}
            onClick={() => {
              setSection(key);
              setPage(0);
            }}
          >
            {name}
            <span>
              {
                detail.records.filter(
                  (r) => r.section === key && r.review !== "eliminado",
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="toolbar">
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Buscar en tabla"
            placeholder="Buscar en esta sección…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <select
          aria-label="Estado de revisión en tabla"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="active">Todos los activos</option>
          <option value="pendiente">Pendientes</option>
          <option value="aceptado">Aceptados</option>
          <option value="dudoso">Dudosos</option>
          <option value="deleted">Eliminados</option>
        </select>
        <span className="row-count">{rows.length} registros</span>
      </div>
      <div
        className="table-scroll"
        role="region"
        aria-label={"Tabla editable de " + sectionNames[section]}
        tabIndex={0}
      >
        <table className="data-grid">
          <thead>
            <tr>
              <th>Revisión / fuente</th>
              {fields.map((f) => (
                <th key={f.key}>
                  <button
                    onClick={() =>
                      setSort({
                        key: f.key,
                        asc: sort.key === f.key ? !sort.asc : true,
                      })
                    }
                  >
                    {f.label}
                    <ArrowDownUp size={13} />
                  </button>
                </th>
              ))}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className={drafts[r.id] ? "unsaved" : ""}>
                <td>
                  <select
                    aria-label="Revisión del registro"
                    disabled={busy || locked}
                    value={r.review}
                    onChange={(e) => patch(r, { review: e.target.value })}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="aceptado">Aceptado</option>
                    <option value="dudoso">Dudoso</option>
                    <option value="eliminado">Eliminado</option>
                  </select>
                  <button
                    className="source-button"
                    onClick={() =>
                      work(async () => {
                        setHistory(await api("/records/" + r.id + "/audit"));
                        setSource(r);
                      })
                    }
                  >
                    <FileText size={13} />
                    {r.source_id ? "Ver fuente" : "Manual"}
                  </button>
                  {r.parent_record_id && <small>Heredado de otro corte</small>}
                </td>
                {fields.map((f) => (
                  <td
                    key={f.key}
                    className={
                      f.key === "description" ? "description-cell" : ""
                    }
                  >
                    <Cell
                      field={f}
                      value={r.current[f.key]}
                      disabled={busy || locked || r.review === "eliminado"}
                      onChange={(v) =>
                        patch(r, { current: { ...r.current, [f.key]: v } })
                      }
                    />
                  </td>
                ))}
                <td>
                  <button
                    className="danger"
                    disabled={busy || locked}
                    onClick={() =>
                      patch(r, {
                        review:
                          r.review === "eliminado" ? "pendiente" : "eliminado",
                      })
                    }
                  >
                    {r.review === "eliminado" ? "Restaurar" : "Eliminar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <div className="empty">
          <h3>No hay registros en esta selección</h3>
          <p>Agrega un registro o ajusta los filtros.</p>
        </div>
      )}
      <div className="pagination">
        <button
          disabled={currentPage === 0}
          onClick={() => setPage(currentPage - 1)}
        >
          Anterior
        </button>
        <span>
          Página {currentPage + 1} de {last + 1}
        </span>
        <button
          disabled={currentPage >= last}
          onClick={() => setPage(currentPage + 1)}
        >
          Siguiente
        </button>
      </div>
      {adding && (
        <Dialog
          title={"Agregar · " + sectionNames[section]}
          onClose={() => {
            if (!busy) setAdding(false);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              work(async () => {
                await api("/cuts/" + detail.cut.id + "/records", {
                  method: "POST",
                  ...json({ section, current: newValue, review: "aceptado" }),
                });
                await reload();
                setAdding(false);
                setNotice("Registro manual guardado.");
              });
            }}
          >
            <div className="manual-form">
              {fields.map((f) => (
                <label key={f.key}>
                  {f.label}
                  {f.key === "description" ? " *" : ""}
                  <Cell
                    field={f}
                    value={newValue[f.key]}
                    onChange={(v) => setNewValue({ ...newValue, [f.key]: v })}
                    disabled={busy}
                  />
                </label>
              ))}
            </div>
            {!fields.some((f) => f.key === "description") && (
              <label>
                Descripción
                <input
                  required
                  value={String(newValue.description ?? "")}
                  onChange={(e) =>
                    setNewValue({ ...newValue, description: e.target.value })
                  }
                />
              </label>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              Guardar registro
            </button>
          </form>
        </Dialog>
      )}
      {source && (
        <Dialog
          title="Fuente e historial de cambios"
          onClose={() => setSource(null)}
        >
          <p>
            {detail.sources.find((s) => s.id === source.source_id)?.filename ??
              "Agregado manualmente"}{" "}
            · {source.location}
          </p>
          <div className="original">
            {source.source_id ? (
              <OriginalValues value={source.original} />
            ) : (
              <p>
                Registro creado dentro de la aplicación. No existe archivo de
                origen.
              </p>
            )}
          </div>
          <h3>Historial de cambios</h3>
          {!history.length ? (
            <p>Sin modificaciones guardadas.</p>
          ) : (
            history.map((entry, i) => (
              <details key={i}>
                <summary>
                  {new Date(entry.changed_at).toLocaleString("es-MX")}
                </summary>
                <AuditChange value={entry.next} />
              </details>
            ))
          )}
        </Dialog>
      )}
    </section>
  );
}
function AuditChange({ value }: { value: string }) {
  const change = JSON.parse(value);
  return (
    <div>
      <p>Revisión: {change.review ?? "Guardado"}</p>
      <dl>
        {Object.entries(change.current ?? {}).map(([key, v]) => (
          <div key={key}>
            <dt>
              {fieldsFor(change.section ?? "general").find((f) => f.key === key)
                ?.label ?? key}
            </dt>
            <dd>{String(v ?? "Sin dato")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
