import { ScopeToggle, useOperationScope } from "./OperationScope";
import { Fragment, useEffect, useRef, useState } from "react";
import { api, json } from "../../api";
import { Dialog } from "../../Dialog";
import { SearchPicker, personChoices } from "../../components/SearchPicker";
import { ContextField } from "../../components/ContextField";
import { localPersonId } from "../../components/LocalIdentity";
import { DocumentIcon, fileKind } from "./DocumentIcon";
import {CatalogView,useCatalogView} from '../../components/CatalogView';
import {ActionMenu} from '../../components/ActionMenu';
import '../master/catalog.css';
export function DocumentWorkspace({ projectId }: { projectId: string }) {
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [catalogView,setCatalogView]=useCatalogView('documents');
  const [order,setOrder]=useState('filename'),[group,setGroup]=useState(''),[relationFilter,setRelationFilter]=useState('');
  const scope = useOperationScope(projectId);
  const scopeKey = scope.ids.join(",");
  const [targets, setTargets] = useState<any[]>([]),
    [projectFilter, setProjectFilter] = useState(""),
    [typeFilter, setTypeFilter] = useState(""),
    [dateFrom, setDateFrom] = useState(""),
    [authorFilter, setAuthorFilter] = useState(""),
    [itemFilter, setItemFilter] = useState("");
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
  const generation = useRef(0);
  const reload = async (token = generation.current) => {
    const result = await Promise.all(
      scope.ids.map(async (id) => {
        const [r, i, e, c] = await Promise.all([
          api("/projects/" + id + "/document-library"),
          api("/projects/" + id + "/items"),
          api("/projects/" + id + "/pmo/events"),
          api("/projects/" + id + "/cuts"),
        ]);
        return {
          rows: r.map((d: any) => ({ ...d, project_id: id })),
          items: i.map((x: any) => ({ ...x, project_id: id })),
          targets: [
            ...i.map((x: any) => ({
              value: "item:" + x.id,
              label: x.code + " · " + x.name,
              project_id: id,
            })),
            ...e.map((x: any) => ({
              value: "event:" + x.id,
              label: "Evento · " + x.title,
              project_id: id,
            })),
            ...c.map((x: any) => ({
              value: "cut:" + x.id,
              label: "Corte · " + x.report_date,
              project_id: id,
            })),
          ],
        };
      }),
    );
    if (token !== generation.current) return;
    setRows(result.flatMap((r) => r.rows));
    setItems(result.flatMap((r) => r.items));
    setTargets(result.flatMap((r) => r.targets));
  };
  useEffect(() => {
    const token = ++generation.current;
    setRows([]);
    setItems([]);
    setTargets([]);
    setSelected(null);
    setProjectFilter("");
    setItemFilter("");
    setError("");
    void Promise.all([reload(token), api("/people"), api("/projects")])
      .then(([, p, projects]) => {
        if (token !== generation.current) return;
        setPeople(p);
        setProjectName(
          projects.find((p: any) => p.id === projectId)?.name || "",
        );
      })
      .catch((e) => {
        if (token === generation.current) setError(e.message);
      });
    return () => {
      generation.current++;
    };
  }, [base, scopeKey]);
  const person = (id: string) =>
    people.find((p) => p.id === id)?.name || "Autor no registrado";
  const relation = (id: string) => {
    const item = items.find((i) => i.id === id);
    return item ? `${item.code} · ${item.name}` : "Sin elemento relacionado";
  };
  const projectLabel=(id:string)=>scope.projects.find(p=>p.id===id)?.name||(id===projectId?projectName:'Proyecto');
  const visible = rows.filter(
    (r) =>
      !!r.archived === archived &&
      (!projectFilter || r.project_id === projectFilter) &&
      (!relationFilter || r.links?.some((l:any)=>l.target_kind+":"+l.target_id===relationFilter)) &&
      (!typeFilter || fileKind(r.filename) === typeFilter) &&
      (!dateFrom || r.created_at.slice(0, 10) >= dateFrom) &&
      (!authorFilter || r.author_id === authorFilter) &&
      (!itemFilter ||
        r.related_id === itemFilter ||
        r.links?.some(
          (l: any) => l.target_kind === "item" && l.target_id === itemFilter,
        )) &&
      [
        r.filename,
        r.notes,
        fileKind(r.filename),
        r.created_at,
        person(r.author_id),
        relation(r.related_id),
        projectLabel(r.project_id),
        ...(r.links||[]).map((l:any)=>targets.find(t=>t.value===l.target_kind+":"+l.target_id)?.label||""),
        ...(r.references || []).map((ref: any) => ref.report_date),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  ).sort((a,b)=>String(a[order]||'').localeCompare(String(b[order]||''),'es',{numeric:true}));
  const associations=(r:any)=><div className="document-associations"><span className="association-chip">{projectLabel(r.project_id)}</span>{(r.links||[]).map((l:any)=><span className="association-chip" key={l.target_kind+':'+l.target_id}>{targets.find(t=>t.value===l.target_kind+':'+l.target_id)?.label||l.target_kind}</span>)}{(r.references||[]).filter((ref:any)=>ref.kind==='source').map((ref:any)=><span className="association-chip" key={ref.id}>Corte {ref.report_date}</span>)}</div>;
  const groupLabel=(r:any)=>group==='project'?projectLabel(r.project_id):group==='type'?fileKind(r.filename):group==='date'?r.created_at.slice(0,10):'';
  const ordered=group?[...visible].sort((a,b)=>groupLabel(a).localeCompare(groupLabel(b),'es')):visible;
  const menu=(r:any)=><ActionMenu label={'Opciones de '+r.filename}><button onClick={()=>setSelected(r)}>Ver ficha</button><a href={r.download_url}>Descargar original</a></ActionMenu>;
  async function update(key: string, value: any) {
    setBusy(true);
    try {
      const next = { ...selected, [key]: value };
      await api(
        "/projects/" + (next.project_id || projectId) + "/documents/" + next.id,
        {
          method: "PUT",
          ...json({
            ...next,
            archived: next.document_archived ?? next.archived,
          }),
        },
      );
      setSelected({ ...next, version: next.version + 1 });
      await reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel operation-workspace">
      <div className="section-heading">
        <div>
          <h2>Documentos</h2>
          <p>
            Archivos del proyecto y fuentes de sus reportes, reunidos sin copiar
            el contenido.
          </p>
        </div>

      </div>

      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className="catalog-toolbar"><ScopeToggle scope={scope}/><CatalogView value={catalogView} onChange={setCatalogView} label="Documentos"/><label className="catalog-search">Buscar documentos<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre, descripción, autor o fecha"/></label><button aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(!filtersOpen)}>Filtros</button><label>Agrupar<select value={group} onChange={e=>setGroup(e.target.value)}><option value="">Sin agrupación</option><option value="project">Proyecto</option><option value="type">Tipo</option><option value="date">Fecha</option></select></label><label>Ordenar<select value={order} onChange={e=>setOrder(e.target.value)}><option value="filename">Nombre</option><option value="created_at">Fecha</option><option value="size">Tamaño</option></select></label>        <button
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
        </button></div>
      {filtersOpen&&<><div className="pmo-actions">

        <label>
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          Archivados
        </label>
      </div>
      <div className="document-filter-row"><SearchPicker label="Relación" value={relationFilter} options={targets} onChange={v=>setRelationFilter(String(v))}/>
        {scope.all && (
          <label>
            Proyecto
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="">Todos mis proyectos</option>
              {scope.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Tipo
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {[...new Set(rows.map((r) => fileKind(r.filename)))].map((kind) => (
              <option key={kind}>{kind}</option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <SearchPicker
          label="Autor"
          value={authorFilter}
          options={personChoices(people)}
          onChange={(v) => setAuthorFilter(String(v))}
        />
        <SearchPicker
          label="Trabajo / Hito"
          value={itemFilter}
          options={items.map((i) => ({
            value: i.id,
            label: i.code + " · " + i.name,
          }))}
          onChange={(v) => setItemFilter(String(v))}
        />
      </div>
      <button onClick={()=>{setQuery('');setArchived(false);setProjectFilter('');setTypeFilter('');setDateFrom('');setAuthorFilter('');setItemFilter('');setRelationFilter('');}}>Limpiar filtros</button></>}
      {catalogView==='list'?<div className="catalog-table-wrap"><table className="catalog-table"><thead><tr>{['Nombre','Tipo','Proyecto','Relaciones','Autor','Fecha','Tamaño','Acciones'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{ordered.map((r,index)=><Fragment key={r.project_id+':'+r.sha256}>{group&&(index===0||groupLabel(ordered[index-1])!==groupLabel(r))&&<tr><th colSpan={8} scope="rowgroup">{groupLabel(r)}</th></tr>}<tr><td><button className="catalog-name" onClick={()=>setSelected(r)}>{r.filename}</button></td><td>{fileKind(r.filename)}</td><td>{projectLabel(r.project_id)}</td><td>{associations(r)}</td><td>{person(r.author_id)}</td><td>{r.created_at.slice(0,10)}</td><td>{(r.size/1024).toFixed(1)} KB</td><td>{menu(r)}</td></tr></Fragment>)}</tbody></table></div>:<div className="catalog-cards">{ordered.map(r=><article className="catalog-card" key={r.project_id+':'+r.sha256}><button className="catalog-card-open" onClick={()=>setSelected(r)}><DocumentIcon filename={r.filename}/><strong>{r.filename}</strong><span>{fileKind(r.filename)} · {(r.size/1024).toFixed(1)} KB · {r.created_at.slice(0,10)}</span><span>{person(r.author_id)}</span><span>{r.notes||'Sin descripción'}</span></button>{associations(r)}{menu(r)}</article>)}</div>}
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
                  const existing = (await api(base + "/document-library")).find(
                    (d: any) => d.id === result.id,
                  );
                  setSelected({
                    ...existing,
                    project_id: projectId,
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
            <fieldset disabled={busy || (selected && selected.origin !== 'document')}>
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
                options={personChoices(people)}
                onChange={(v) => setAuthor(String(v))}
              />
              <SearchPicker
                label="Elemento relacionado"
                value={related}
                options={items
                  .filter((i) => i.project_id === projectId)
                  .map((i) => ({
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
          <p>{fileKind(selected.filename)} · {(selected.size/1024).toFixed(1)} KB · {selected.created_at?.slice(0,10)}</p>{associations(selected)}<a href={selected.download_url}>Descargar original</a>{selected.origin!=='document'&&<p>Fuente ejecutiva: metadatos y original conservados en lectura.</p>}
          <div className="detail-grid">
            <ContextField
              label="Descripción"
              type="textarea"
              required
              value={selected.notes}
              disabled={busy || (selected && selected.origin !== 'document')}
              onSave={(v) => update("notes", v)}
            />
            <ContextField
              label="Autor"
              search
              value={selected.author_id || ""}
              options={personChoices(people)}
              disabled={busy || (selected && selected.origin !== 'document')}
              onSave={(v) => update("author_id", v || null)}
            />
            <ContextField
              label="Elemento relacionado"
              search
              value={selected.related_id || ""}
              options={items
                .filter(
                  (i) => i.project_id === (selected.project_id || projectId),
                )
                .map((i) => ({
                  value: i.id,
                  label: `${i.code} · ${i.name}`,
                }))}
              disabled={busy || (selected && selected.origin !== 'document')}
              onSave={(v) => update("related_id", v || null)}
            />
            <ContextField
              label="Archivo"
              value={String(
                !!(selected.document_archived ?? selected.archived),
              )}
              options={[
                { value: "false", label: "Activo" },
                { value: "true", label: "Archivado" },
              ]}
              onSave={(v) => update("document_archived", v === "true")}
              disabled={busy || (selected && selected.origin !== 'document')}
            />
          </div>
          <ContextField
            label="Relaciones adicionales"
            search
            multiple
            value={(selected.links || []).map(
              (l: any) => l.target_kind + ":" + l.target_id,
            )}
            options={targets.filter(
              (t) => t.project_id === (selected.project_id || projectId),
            )}
            disabled={busy || (selected && selected.origin !== 'document')}
            onSave={async (values) => {
              setBusy(true);
              try {
                const saved = await api(
                  "/projects/" +
                    (selected.project_id || projectId) +
                    "/documents/" +
                    selected.id +
                    "/links",
                  {
                    method: "PUT",
                    ...json({
                      version: selected.version,
                      links: values.map((v: string) => {
                        const [target_kind, target_id] = v.split(":");
                        return { target_kind, target_id };
                      }),
                    }),
                  },
                );
                setSelected({ ...selected, ...saved });
                await reload();
              } finally {
                setBusy(false);
              }
            }}
          />
          <p>
            {fileKind(selected.filename)} · {selected.created_at?.slice(0, 10)}{" "}
            · {projectName}
          </p>
        </Dialog>
      )}
    </section>
  );
}
