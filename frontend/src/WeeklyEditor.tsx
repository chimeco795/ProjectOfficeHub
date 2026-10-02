import { ProjectFields } from "./modules/projects/ProjectFields";
import { pmpLabels } from "./ExecutiveReport";
import { useEffect, useState } from "react";
import { api, json } from "./api";
import type { Detail, Project } from "./types";
import { Dialog } from "./Dialog";

export function WeeklyEditor({
  detail,
  reload,
  onDirty,
}: {
  detail: Detail;
  reload: () => Promise<void>;
  onDirty: (v: boolean) => void;
}) {
  const [value, setValue] = useState<Record<string, unknown>>({
      ...detail.cut.metadata,
    }),
    [start, setStart] = useState(detail.cut.start_date ?? ""),
    [end, setEnd] = useState(detail.cut.end_date ?? ""),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const locked = detail.cut.status === "publicado";
  const pending = detail.records.filter(r => ["pendiente", "dudoso"].includes(r.review)).length;
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const change = (k: string, v: unknown) => {
    setValue({ ...value, [k]: v });
    setDirty(true);
  };
  const work = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const variation =
    typeof value.actual === "number" && typeof value.planned === "number"
      ? Math.round((value.actual - value.planned) * 100) / 100
      : null;
  return (
    <section className="panel weekly">
      <div className="section-heading">
        <div>
          <div className="eyebrow">ACTUALIZACIÓN SEMANAL</div>
          <h2>Resumen del corte</h2>
          <p>
            Define las cifras de esta semana después de revisar las fuentes. No
            se eligen automáticamente entre Word y Excel.
          </p>
        </div>
        <span className={"badge " + (locked ? "aceptado" : "pendiente")}>
          {locked ? "Publicado · solo lectura" : "Borrador"}
        </span>
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          work(async () => {
            await api("/cuts/" + detail.cut.id, {
              method: "PUT",
              ...json({
                version: detail.cut.version,
                metadata: value,
                start_date: start || null,
                end_date: end || null,
              }),
            });
            setDirty(false);
            onDirty(false);
            await reload();
            setNotice("Resumen semanal guardado.");
          });
        }}
      >
        <fieldset disabled={locked || busy}>
          <details className="report-settings">
            <summary>
              Diseño del reporte: marca, encabezado y comentarios ejecutivos
            </summary>
            <div className="form-grid" style={{ marginTop: 20 }}>
              {[
                ["report_brand", "Nombre de marca / organización"],
                ["report_title", "Título del proyecto en la lámina"],
                ["report_subtitle", "Subtítulo del reporte"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    maxLength={key === "report_brand" ? 80 : 200}
                    value={String(value[key] ?? "")}
                    onChange={(e) => change(key, e.target.value)}
                  />
                </label>
              ))}
              <label>
                Logotipo (PNG, JPG o WebP; hasta 300 KB)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (
                      file.size > 300 * 1024 ||
                      !["image/png", "image/jpeg", "image/webp"].includes(
                        file.type,
                      )
                    ) {
                      setError(
                        "Usa un logotipo PNG, JPG o WebP de hasta 300 KB.",
                      );
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () =>
                      change("brand_logo", String(reader.result));
                    reader.onerror = () =>
                      setError("No se pudo leer el logotipo.");
                    reader.readAsDataURL(file);
                  }}
                />
                {value.brand_logo ? (
                  <>
                    <img
                      src={String(value.brand_logo)}
                      alt="Logotipo actual"
                      style={{
                        maxWidth: 160,
                        maxHeight: 70,
                        objectFit: "contain",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => change("brand_logo", "")}
                    >
                      Quitar logotipo
                    </button>
                  </>
                ) : null}
              </label>
            </div>
            <div className="form-grid">
              {[
                ["scope_comment", "Estado del alcance"],
                ["risks_comment", "Estado de riesgos"],
                ["budget_comment", "Estado del presupuesto"],
                ["pmp_comment", "Comentario Dashboard PMP"],
                ["exposure_comment", "Exposición global del proyecto"],
                ["milestones_comment", "Comentario de cumplimiento de hitos"],
                ["deviation_comment", "Causa de la desviación principal"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <textarea
                    rows={3}
                    value={String(value[key] ?? "")}
                    onChange={(e) => change(key, e.target.value)}
                  />
                </label>
              ))}
              <label>
                Semáforo de presupuesto
                <select
                  value={String(value.budget_status ?? "Sin definir")}
                  onChange={(e) => change("budget_status", e.target.value)}
                >
                  {["Sin definir", "Verde", "Amarillo", "Rojo"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
          </details>

          <div className="form-grid">
            <label>
              Inicio de semana
              <input
                type="date"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
            <label>
              Fin de semana
              <input
                type="date"
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
          </div>
          <div className="form-grid metrics-form">
            {[
              ["planned", "Avance planeado (%)"],
              ["actual", "Avance real (%)"],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={String(value[key] ?? "")}
                  onChange={(e) =>
                    change(
                      key,
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </label>
            ))}
            <div className="metric-readonly">
              <span>Variación calculada</span>
              <strong>
                {variation === null
                  ? "Sin datos"
                  : `${variation > 0 ? "+" : ""}${variation} pp`}
              </strong>
            </div>
          </div>
          <label>
            Resumen ejecutivo
            <textarea
              rows={6}
              value={String(value.executive_comment ?? "")}
              onChange={(e) => change("executive_comment", e.target.value)}
            />
          </label>
          <div className="form-grid">
            <label>
              Semáforo general
              <select
                value={String(value.semaphore ?? "Sin definir")}
                onChange={(e) => change("semaphore", e.target.value)}
              >
                {["Sin definir", "Verde", "Amarillo", "Rojo"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Confianza Go Live
              <select
                value={String(value.confidence_level ?? "Sin definir")}
                onChange={(e) => change("confidence_level", e.target.value)}
              >
                {[
                  "Sin definir",
                  "Alta",
                  "Media-Alta",
                  "Media",
                  "Media-Baja",
                  "Baja",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Confianza porcentual (opcional)
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={String(value.confidence_percent ?? "")}
                onChange={(e) =>
                  change(
                    "confidence_percent",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </label>
            <label>
              Fecha estimada Go Live
              <input
                type="date"
                value={String(value.forecast_date ?? "")}
                onChange={(e) =>
                  change("forecast_date", e.target.value || null)
                }
              />
            </label>
          </div>
          <label>
            Comentario Go Live
            <textarea
              rows={4}
              value={String(value.go_live_comment ?? "")}
              onChange={(e) => change("go_live_comment", e.target.value)}
            />
          </label>
          <div className="button-row">
            <button className="primary" disabled={!dirty}>
              Guardar resumen
            </button>
            <button
              type="button"
              disabled={!dirty}
              onClick={() => {
                setValue({ ...detail.cut.metadata });
                setStart(detail.cut.start_date ?? "");
                setEnd(detail.cut.end_date ?? "");
                setDirty(false);
                onDirty(false);
              }}
            >
              Descartar cambios
            </button>
          </div>
        </fieldset>
      </form>
      <div className="panel">
        <h3>Semáforos PMP</h3>
        <div className="form-grid">
          {Object.entries(pmpLabels).map(([key, label]) => (
            <label key={key}>
              {label}
              <select
                disabled={locked || busy}
                value={String(
                  ((value.pmp ?? {}) as Record<string, unknown>)[key] ??
                    "Sin definir",
                )}
                onChange={(e) =>
                  change("pmp", {
                    ...((value.pmp ?? {}) as Record<string, unknown>),
                    [key]: e.target.value,
                  })
                }
              >
                {["Sin definir", "Verde", "Amarillo", "Rojo"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p>Guarda el resumen para conservar estos semáforos.</p>
      </div>
      <div className="publish-panel">
        <h3>{locked ? "Corte publicado" : "Publicar corte"}</h3>
        <p>
          {locked
            ? `Guardado como solo lectura el ${new Date(detail.cut.published_at!).toLocaleString("es-MX")}. Puedes crear la siguiente semana desde este corte.`
            : "Publicar conserva una versión de solo lectura de los datos y del proyecto. Revisa los registros pendientes o dudosos y vincula riesgos, dependencias, hitos y actividades en Conciliar con el catálogo antes de publicar. Después continúa en un nuevo corte."}
        </p>
        {!locked && pending > 0 && <p role="status">Quedan {pending} registros por revisar antes de publicar.</p>}
        {!locked && (
          <button
            disabled={busy || dirty || pending > 0}
            onClick={() =>
              work(async () => {
                await api("/cuts/" + detail.cut.id + "/publish", {
                  method: "POST",
                  ...json({ version: detail.cut.version }),
                });
                await reload();
              })
            }
          >
            Publicar como solo lectura
          </button>
        )}
      </div>
      <div className="roadmap-note">
        <strong>Reporte ejecutivo disponible</strong>
        <p>
          Abre Reporte ejecutivo en el menú para ver la gráfica y el tablero con
          los datos guardados de este corte.
        </p>
      </div>
    </section>
  );
}

export function ProjectEditor({
  project,
  onClose,
  onSaved,
}: {
  project: Project;
  onClose: () => void;
  onSaved: (p: Project) => Promise<void>;
}) {
  const [value, setValue] = useState(project),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog
      title="Editar proyecto"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="project-edit"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const saved = await api("/projects/" + project.id, {
              method: "PUT",
              ...json(value),
            });
            await onSaved(saved);
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Nombre
          <input
            required
            maxLength={200}
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
          />
        </label>
        <label>
          Descripción
          <textarea
            rows={3}
            value={value.description}
            onChange={(e) =>
              setValue({ ...value, description: e.target.value })
            }
          />
        </label>
        <label>
          Objetivo
          <textarea
            rows={3}
            value={value.objective}
            onChange={(e) => setValue({ ...value, objective: e.target.value })}
          />
        </label>
        <ProjectFields value={value} onChange={setValue} />
        <p>
          Los cortes publicados conservan los datos del proyecto tal como
          estaban al publicarse.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          Guardar proyecto
        </button>
      </form>
    </Dialog>
  );
}
