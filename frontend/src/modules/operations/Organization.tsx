import { useEffect, useState } from "react";
import { api, json } from "../../api";
import { Dialog } from "../../Dialog";
type Person = {
  id: string;
  name: string;
  email: string;
  leader_id: string | null;
  role: string;
  version: number;
};
export function Organization({
  projectId,
  revision,
}: {
  projectId: string;
  revision: string;
}) {
  const [people, setPeople] = useState<Person[]>([]),
    [assigned, setAssigned] = useState<string[]>([]),
    [editing, setEditing] = useState<Person | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    const [all, roster] = await Promise.all([
      api("/people"),
      api(`/projects/${projectId}/people`),
    ]);
    setPeople(all);
    setAssigned(roster.map((p: Person) => p.id));
  }
  useEffect(() => {
    let active = true;
    Promise.all([api("/people"), api(`/projects/${projectId}/people`)])
      .then(([all, roster]) => {
        if (active) {
          setPeople(all);
          setAssigned(roster.map((p: Person) => p.id));
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [projectId, revision]);
  const rows: { person: Person; depth: number }[] = [];
  const seen = new Set<string>();
  const stack = people
    .filter((p) => !p.leader_id || !people.some((x) => x.id === p.leader_id))
    .reverse()
    .map((person) => ({ person, depth: 0 }));
  while (stack.length) {
    const row = stack.pop()!;
    if (seen.has(row.person.id)) continue;
    seen.add(row.person.id);
    rows.push(row);
    people
      .filter((p) => p.leader_id === row.person.id)
      .reverse()
      .forEach((person) => stack.push({ person, depth: row.depth + 1 }));
  }
  people
    .filter((p) => !seen.has(p.id))
    .forEach((person) => rows.push({ person, depth: 0 }));
  return (
    <section className="organization">
      <div className="eyebrow">ESTRUCTURA DEL EQUIPO</div>
      <h3>Organigrama de personas</h3>
      <p>
        Catálogo compartido de todos los proyectos. Cambiar un líder o cargo
        afecta a esta estructura global; los roles y porcentajes por proyecto se
        mantienen en las asignaciones.
      </p>
      {error && (
        <p role="alert" className="message error">
          {error}
        </p>
      )}
      <div className="organization-list">
        {rows.map(({ person, depth }) => (
          <article
            key={person.id}
            style={{ marginLeft: Math.min(depth, 6) * 16 }}
          >
            <span className="org-avatar">
              {person.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{person.name}</strong>
              <small>
                {person.role || "Cargo sin definir"} ·{" "}
                {person.leader_id
                  ? `Reporta a ${people.find((p) => p.id === person.leader_id)?.name || "Líder no disponible"}`
                  : "Sin líder asignado"}
              </small>
            </div>
            {assigned.includes(person.id) && (
              <span className="status-pill">En este proyecto</span>
            )}
            <button
              onClick={() => {
                setEditing({
                  ...person,
                  role: person.role || "",
                  leader_id: person.leader_id || null,
                });
                setError("");
              }}
            >
              Editar estructura
            </button>
          </article>
        ))}
      </div>
      {!people.length && (
        <p>
          Crea personas desde Catálogo y personas para construir el organigrama.
        </p>
      )}
      {editing && (
        <Dialog
          title="Estructura de la persona"
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <p>{editing.name} · Cambio compartido por todos los proyectos.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api(`/people/${editing.id}/organization`, {
                  method: "PUT",
                  ...json({
                    leader_id: editing.leader_id,
                    role: editing.role,
                    version: editing.version,
                  }),
                });
                setEditing(null);
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <fieldset disabled={busy}>
              <label>
                Cargo global
                <input
                  maxLength={200}
                  value={editing.role}
                  onChange={(e) =>
                    setEditing({ ...editing, role: e.target.value })
                  }
                />
              </label>
              <label>
                Líder directo
                <select
                  value={editing.leader_id || ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      leader_id: e.target.value || null,
                    })
                  }
                >
                  <option value="">Sin líder</option>
                  {people
                    .filter((p) => p.id !== editing.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              {error && <p role="alert">{error}</p>}
              <button className="primary">Guardar estructura</button>
            </fieldset>
          </form>
        </Dialog>
      )}
    </section>
  );
}
