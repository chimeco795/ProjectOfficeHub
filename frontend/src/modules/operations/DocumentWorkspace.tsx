import { useEffect, useState } from "react";
import { api, json } from "../../api";
import { Dialog } from "../../Dialog";
import { SearchPicker } from "../../components/SearchPicker";
import { ContextField } from "../../components/ContextField";
import { localPersonId } from "../../components/LocalIdentity";
import { DocumentIcon, fileKind } from "./DocumentIcon";
export function DocumentWorkspace({ projectId }: { projectId: string }) {
  const base = "/projects/" + projectId;
  const [rows, setRows] = useState<any[]>([]),
    [people, setPeople] = useState<any[]>([]),
    [items, setItems] = useState<any[]>([]),
    [projectName, setProjectName] = useState(""),
    [query, setQuery] = useState(""),
    [archived, setArchived] = useState(false),
    [upload, setUpload] = useState(false),
    [description, setDescription] = useState(""),
    [author, setAuthor] = useState(""),
    [related, setRelated] = useState(""),
    [selected, setSelected] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const reload = async () => setRows(await api(base + "/document-library"));
  useEffect(() => {
    Promise.all([
      api(base + "/document-library"),
      api("/people"),
      api(base + "/items"),
      api("/projects"),
    ])
      .then(([r, p, i, projects]) => {
        setRows(r);
        setPeople(p);
        setItems(i);
        setProjectName(
          projects.find((p: any) => p.id === projectId)?.name || "",
        );
      })
      .catch((e) => setError(e.message));
  }, [base]);
  const person = (id: string) =>
    people.find((p) => p.id === id)?.name || "Autor no registrado";
  const relation = (id: string) => {
    const item = items.find((i) => i.id === id);
    return item ? `${item.code} · ${item.name}` : "Sin elemento relacionado";
  };
  const visible = rows.filter(
    (r) =>
      !!r.archived === archived &&
      [
        r.filename,
        r.notes,
        fileKind(r.filename),
        r.created_at,
        person(r.author_id),
        relation(r.related_id),
        projectName,
        ...(r.references || []).map((ref: any) => ref.report_date),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function update(key: string, value: any) {
    setBusy(true);
    try {
      const next = { ...selected, [key]: value };
      await api(base + "/documents/" + next.id, {
        method: "PUT",
        ...json({ ...next, archived: next.document_archived ?? next.archived }),
      });
      setSelected({ ...next, version: next.version + 1 });
      await reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Documentos</h2>
          <p>
            Archivos del proyecto y fuentes de sus reportes, reunidos sin copiar
            el contenido.
          </p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setUpload(true);
            setDescription("");
            setAuthor(localPersonId());
            setRelated("");
            setError("");
          }}
        >
          Cargar documento
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className="pmo-actions">
        <label>
          Buscar documentos
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre, descripción, persona, fecha o trabajo"
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          Archivados
        </label>
      </div>
      <div className="document-list">
        {visible.map((r) => (
          <article className="document-card" key={r.sha256}>
            <DocumentIcon filename={r.filename} />
            <h3>{r.filename}</h3>
            <p>{r.notes || "Sin descripción registrada"}</p>
            <p>
              {fileKind(r.filename)} · {(r.size / 1024).toFixed(1)} KB ·{" "}
              {r.created_at.slice(0, 10)}
            </p>
            <p>
              {person(r.author_id)} · {projectName}
            </p>
            {r.related_id && <p>{relation(r.related_id)}</p>}
            <div className="document-associations">
              {r.references.map((ref: any) => (
                <span className="association-chip" key={ref.id}>
                  {ref.kind === "source"
                    ? `Corte ${ref.report_date} · ${ref.status}`
                    : "Proyecto"}
                </span>
              ))}
            </div>
            <a href={r.download_url}>Descargar original</a>
            {r.origin === "document" && (
              <button onClick={() => setSelected(r)}>Ver detalle</button>
            )}
          </article>
        ))}
      </div>
      {!visible.length && <p>No hay documentos en esta selección.</p>}
      {upload && (
        <Dialog
          title="Cargar documento"
          onClose={() => {
            if (!busy) setUpload(false);
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              data.set("description", description);
              if (author) data.set("author_id", author);
              if (related) data.set("related_id", related);
              setBusy(true);
              setError("");
              try {
                const result = await api(base + "/documents", {
                  method: "POST",
                  body: data,
                });
                await reload();
                setQuery("");
                setArchived(!!result.archived);
                setUpload(false);
                setNotice(
                  result.reused
                    ? "El original ya existe. Revisa y guarda los metadatos para actualizar su descripción."
                    : "Documento guardado.",
                );
                if (result.reused && result.origin === "document") {
                  const existing = (await api(base + "/documents")).find(
                    (d: any) => d.id === result.id,
                  );
                  setSelected({
                    ...existing,
                    document_archived: !!existing.archived,
                  });
                  setNotice(
                    "El archivo ya existe: se conservan sus metadatos. Puedes editar su descripción en el detalle.",
                  );
                }
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <fieldset disabled={busy}>
              <label>
                Archivo (máximo 20 MB)
                <input type="file" name="file" required />
              </label>
              <label>
                Descripción
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <SearchPicker
                label="Autor (usuario local)"
                value={author}
                options={people.map((p) => ({ value: p.id, label: p.name }))}
                onChange={(v) => setAuthor(String(v))}
              />
              <SearchPicker
                label="Elemento relacionado"
                value={related}
                options={items.map((i) => ({
                  value: i.id,
                  label: `${i.code} · ${i.name}`,
                }))}
                onChange={(v) => setRelated(String(v))}
              />
              <p>
                Proyecto: {projectName}. Fecha y tipo se registran al cargar.
              </p>
              {error && <p role="alert">{error}</p>}
              <button className="primary">Guardar documento</button>
            </fieldset>
          </form>
        </Dialog>
      )}
      {selected && (
        <Dialog
          title={selected.filename}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <div className="detail-grid">
            <ContextField
              label="Descripción"
              type="textarea"
              required
              value={selected.notes}
              disabled={busy}
              onSave={(v) => update("notes", v)}
            />
            <ContextField
              label="Autor"
              search
              value={selected.author_id || ""}
              options={people.map((p) => ({ value: p.id, label: p.name }))}
              disabled={busy}
              onSave={(v) => update("author_id", v || null)}
            />
            <ContextField
              label="Elemento relacionado"
              search
              value={selected.related_id || ""}
              options={items.map((i) => ({
                value: i.id,
                label: `${i.code} · ${i.name}`,
              }))}
              disabled={busy}
              onSave={(v) => update("related_id", v || null)}
            />
            <ContextField
              label="Archivo"
              value={String(selected.document_archived ?? selected.archived)}
              options={[
                { value: "false", label: "Activo" },
                { value: "true", label: "Archivado" },
              ]}
              onSave={(v) => update("document_archived", v === "true")}
              disabled={busy}
            />
          </div>
          <p>
            {fileKind(selected.filename)} · {selected.created_at?.slice(0, 10)}{" "}
            · {projectName}
          </p>
        </Dialog>
      )}
    </section>
  );
}
