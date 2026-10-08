import { useEffect, useState } from "react";
import { api, json } from "../../api";
import { Dialog } from "../../Dialog";
import { SearchPicker, personChoices } from "../../components/SearchPicker";
import { localPersonId } from "../../components/LocalIdentity";
import { ItemEditor, emptyItem } from "../master/ItemEditor";
const labels: Record<string, string> = {
  decision: "Decisión",
  agreement: "Acuerdo",
  action: "Acción",
  risk: "Riesgo",
  blocker: "Bloqueo",
  next_step: "Próximo paso",
  achievement: "Logro",
  change: "Cambio relevante",
};
export function MeetingMinutes({
  projectId,
  eventId,
  eventTitle,
  people,
  items,
  onChange,
}: {
  projectId: string;
  eventId: string;
  eventTitle: string;
  people: any[];
  items: any[];
  onChange?: () => Promise<void>;
}) {
  const base = "/projects/" + projectId,
    [minutes, setMinutes] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [adding, setAdding] = useState(""),
    [review, setReview] = useState<any>(null),
    [existing, setExisting] = useState(""),
    [candidate, setCandidate] = useState(false),
    [create, setCreate] = useState(false);
  const reload = async () => {
    setMinutes(await api(base + "/events/" + eventId + "/minutes"));
    await onChange?.();
  };
  useEffect(() => {
    let active = true;
    setMinutes([]);
    setError("");
    setReview(null);
    setAdding("");
    api(base + "/events/" + eventId + "/minutes")
      .then((r) => {
        if (active) setMinutes(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [base, eventId]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function accept(action: string, newItem?: any) {
    await api(base + "/minute-proposals/" + review.id + "/review", {
      method: "POST",
      ...json({
        version: review.version,
        action,
        item_id: action === "link" ? existing : null,
        new_item: newItem || null,
        executive_candidate: action === "ignore" ? false : candidate,
        reviewer_id: people.some((p) => p.id === localPersonId())
          ? localPersonId()
          : null,
      }),
    });
    setReview(null);
    setCreate(false);
    await reload();
  }
  return (
    <section className="meeting-minutes">
      <h4>Minutas y revisión humana</h4>
      <p>
        Adjunta el original TXT o DOCX generado externamente. Las propuestas se
        registran manualmente; no hay extracción IA configurada.
      </p>
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget),
            form = e.currentTarget;
          void run(async () => {
            data.set("description", "Minuta · " + eventTitle);
            if(localPersonId())data.set("author_id",localPersonId());
            const uploaded = await api(base + "/documents", {
              method: "POST",
              body: data,
            });
            await api(base + "/events/" + eventId + "/minutes", {
              method: "POST",
              ...json({ document_id: uploaded.id }),
            });
            form.reset();
          });
        }}
      >
        <label>
          Minuta original
          <input
            name="file"
            type="file"
            accept=".txt,.docx"
            required
            disabled={busy}
          />
        </label>
        <button disabled={busy}>Adjuntar minuta</button>
      </form>
      {minutes.map((m) => (
        <article className="minute-card" key={m.id}>
          <div className="section-heading">
            <strong>
              <a
                href={
                  "/api" + base + "/documents/" + m.document_id + "/download"
                }
              >
                {m.document.filename}
              </a>
            </strong>
            <button disabled={busy} onClick={() => setAdding(m.id)}>
              Registrar propuesta
            </button>
          </div>
          <small>
            Reunión: {m.meeting_date} · Participantes al adjuntar:{" "}
            {m.participants
              .map(
                (id: string) =>
                  people.find((p) => p.id === id)?.name || "Persona registrada",
              )
              .join(", ") || "Sin participantes"}
          </small>
          {m.proposals.map((p: any) => (
            <div className="minute-proposal" key={p.id}>
              <strong>{labels[p.kind]}</strong>
              <p>{p.text}</p>
              {p.evidence && <blockquote>{p.evidence}</blockquote>}
              <small>
                {people.find((x) => x.id === p.owner_id)?.name ||
                  "Sin responsable"}{" "}
                · {p.target_date || "Sin fecha"} ·{" "}
                {p.status === "pending"
                  ? "Pendiente"
                  : p.status === "ignored"
                    ? "Ignorada"
                    : "Aceptada"}
                {p.executive_candidate ? " · Candidata a futuro reporte" : ""}
              </small>
              {p.item_id && (
                <p>
                  Vinculada:{" "}
                  {items.find((i) => i.id === p.item_id)?.code ||
                    "Elemento PMO creado"}{" "}
                  · {items.find((i) => i.id === p.item_id)?.name || ""}
                </p>
              )}
              {p.decision_id && <p>Decisión registrada</p>}
              {p.status === "pending" && (
                <button
                  disabled={busy}
                  onClick={() => {
                    setReview(p);
                    setExisting("");
                    setCandidate(false);
                    setCreate(false);
                  }}
                >
                  Revisar propuesta
                </button>
              )}
            </div>
          ))}
          {!m.proposals.length && <p>Sin propuestas registradas.</p>}
        </article>
      ))}
      {adding && (
        <ProposalForm
          minuteId={adding}
          people={people}
          onClose={() => setAdding("")}
          onSave={async (v) => {
            await api(base + "/minutes/" + adding + "/proposals", {
              method: "POST",
              ...json(v),
            });
            await reload();
            setAdding("");
          }}
        />
      )}
      {review && !create && (
        <Dialog
          title="Revisar propuesta de minuta"
          onClose={() => {
            if (!busy) setReview(null);
          }}
        >
          <p>{review.text}</p>
          <SearchPicker
            label="Vincular elemento existente"
            value={existing}
            options={items
              .filter((i) => !i.archived)
              .map((i) => ({ value: i.id, label: i.code + " · " + i.name }))}
            onChange={(v) => setExisting(String(v))}
          />
          <label>
            <input
              type="checkbox"
              checked={candidate}
              onChange={(e) => setCandidate(e.target.checked)}
            />{" "}
            Candidato a Seguimiento Ejecutivo
          </label>
          <p>
            Se conservará la minuta y la decisión de revisión. Una candidatura
            no publica ni modifica cortes anteriores.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="button-row">
            <button
              disabled={busy || !existing}
              onClick={() => void run(() => accept("link"))}
            >
              Vincular y aceptar
            </button>
            <button disabled={busy} onClick={() => setCreate(true)}>
              Crear trabajo / Risk / Issue
            </button>
            <button
              disabled={busy}
              onClick={() => void run(() => accept("decision"))}
            >
              Registrar decisión
            </button>
            <button
              disabled={busy}
              onClick={() => void run(() => accept("ignore"))}
            >
              Ignorar
            </button>
          </div>
        </Dialog>
      )}
      {review && create && (
        <ItemEditor
          title="Crear elemento desde propuesta revisada"
          initial={{
            ...emptyItem(
              review.kind === "risk"
                ? "Risk"
                : review.kind === "blocker"
                  ? "Issue"
                  : "Activity",
            ),
            name: review.text.slice(0, 300),
            description: review.text,
            owner_id: review.owner_id,
            target_date: review.target_date,
            include_in_report: candidate,
          }}
          people={people}
          items={items}
          onClose={() => setCreate(false)}
          onSave={async (v) => {
            await accept("create", v);
          }}
        />
      )}
    </section>
  );
}
function ProposalForm({
  minuteId,
  people,
  onSave,
  onClose,
}: {
  minuteId: string;
  people: any[];
  onSave: (v: any) => Promise<void>;
  onClose: () => void;
}) {
  const [value, setValue] = useState({
      kind: "action",
      text: "",
      evidence: "",
      owner_id: null as string | null,
      target_date: null as string | null,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog
      title="Propuesta manual de minuta"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        key={minuteId}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave(value);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Tipo
            <select
              value={value.kind}
              onChange={(e) => setValue({ ...value, kind: e.target.value })}
            >
              {Object.entries(labels).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Propuesta
            <textarea
              required
              maxLength={10000}
              value={value.text}
              onChange={(e) => setValue({ ...value, text: e.target.value })}
            />
          </label>
          <label>
            Fragmento / referencia de la minuta
            <textarea
              value={value.evidence}
              onChange={(e) => setValue({ ...value, evidence: e.target.value })}
            />
          </label>
          <SearchPicker
            label="Responsable propuesto"
            value={value.owner_id || ""}
            options={personChoices(people)}
            onChange={(v) =>
              setValue({ ...value, owner_id: String(v) || null })
            }
          />
          <label>
            Fecha compromiso propuesta
            <input
              type="date"
              value={value.target_date || ""}
              onChange={(e) =>
                setValue({ ...value, target_date: e.target.value || null })
              }
            />
          </label>
          <p>Guardar esta propuesta no crea ni modifica trabajo o RAID.</p>
          {error && <p role="alert">{error}</p>}
          <button className="primary">Guardar propuesta pendiente</button>
        </fieldset>
      </form>
    </Dialog>
  );
}
