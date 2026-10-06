import { useEffect, useRef, useState } from "react";
import { api, json } from "../../api";
type Comment = { id: number; text: string; created_at: string; author: string };
export function WorkComments({
  projectId,
  itemId,
  onBusy,
}: {
  projectId: string;
  itemId: string;
  onBusy: (busy: boolean) => void;
}) {
  const [rows, setRows] = useState<Comment[]>([]),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef({ id: crypto.randomUUID(), text: "" });
  const path = `/projects/${projectId}/items/${itemId}/comments`;
  useEffect(() => {
    let active = true;
    api(path)
      .then((value) => {
        if (active) setRows(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [path]);
  async function submit() {
    setBusy(true);
    onBusy(true);
    setError("");
    if (request.current.text !== text)
      request.current = { id: crypto.randomUUID(), text };
    try {
      const saved = await api(path, {
        method: "POST",
        ...json({ text, request_id: request.current.id }),
      });
      setRows((previous) =>
        previous.some((r) => r.id === saved.id)
          ? previous
          : [...previous, saved],
      );
      setText("");
      request.current = { id: crypto.randomUUID(), text: "" };
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <section className="work-comments">
      <h3>Conversación del trabajo</h3>
      <p>
        Notas del usuario local, guardadas por separado del formulario. Para
        corregir una nota, añade un comentario nuevo; los reportes publicados
        conservan su contenido.
      </p>
      <div className="comment-list">
        {rows.map((comment) => (
          <article key={comment.id}>
            <div>
              <strong>{comment.author}</strong>
              <time>
                {new Date(comment.created_at).toLocaleString("es-MX")}
              </time>
            </div>
            <p>{comment.text}</p>
          </article>
        ))}
      </div>
      {!rows.length && <p>Todavía no hay comentarios.</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label>
          Nuevo comentario
          <textarea
            required
            maxLength={5000}
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button disabled={busy || !text.trim()}>
          {busy ? "Guardando…" : "Añadir comentario"}
        </button>
      </form>
    </section>
  );
}
