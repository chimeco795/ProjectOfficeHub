import { useEffect, useState } from "react";
import { api } from "../../api";
import { dateKey } from "./calendarModel";
export function OrganizationChart({ projectId }: { projectId: string }) {
  const [roles, setRoles] = useState<any[]>([]),
    [members, setMembers] = useState<any[]>([]),
    [people, setPeople] = useState<any[]>([]),
    [collapsed, setCollapsed] = useState<string[]>([]),
    [zoom, setZoom] = useState(1),
    [error, setError] = useState("");
  const today = dateKey(new Date());
  useEffect(() => {
    Promise.all([
      api("/roles"),
      api(`/projects/${projectId}/pmo/memberships`),
      api(`/projects/${projectId}/people`),
    ])
      .then(([r, m, p]) => {
        setRoles(r);
        setMembers(
          m.filter(
            (x: any) =>
              !x.archived &&
              (!x.valid_from || x.valid_from <= today) &&
              (!x.valid_to || x.valid_to >= today),
          ),
        );
        setPeople(p);
      })
      .catch((e) => setError(e.message));
  }, [projectId, today]);
  function node(role: any, path: string[] = []): React.ReactNode {
    if (path.includes(role.id)) return null;
    const children = roles.filter((r) => r.reports_to === role.id),
      persons = members.filter((m) => m.role_id === role.id);
    return (
      <li key={role.id}>
        <div className="org-node">
          <strong>{role.name}</strong>
          {persons.map((m) => (
            <div className="org-person" key={m.id}>
              <span className="person-avatar">
                {(people.find((p) => p.id === m.person_id)?.name || "?").slice(
                  0,
                  2,
                )}
              </span>
              <span>
                {people.find((p) => p.id === m.person_id)?.name}
                <small>
                  {m.allocation}%
                  {m.leader_id
                    ? " · Líder: " +
                      (people.find((p) => p.id === m.leader_id)?.name ||
                        "Sin asignar")
                    : ""}
                </small>
              </span>
            </div>
          ))}
          {!persons.length && <small>Sin persona asignada</small>}
          {!!children.length && (
            <button
              aria-expanded={!collapsed.includes(role.id)}
              onClick={() =>
                setCollapsed((old) =>
                  old.includes(role.id)
                    ? old.filter((x) => x !== role.id)
                    : [...old, role.id],
                )
              }
            >
              {collapsed.includes(role.id) ? "Expandir" : "Contraer"} ·{" "}
              {children.length}
            </button>
          )}
        </div>
        {!collapsed.includes(role.id) && !!children.length && (
          <ul>{children.map((r) => node(r, [...path, role.id]))}</ul>
        )}
      </li>
    );
  }
  return (
    <section>
      <div className="section-heading">
        <h3>Roles y asignaciones vigentes</h3>
        <div className="button-row">
          <button
            aria-label="Reducir zoom del organigrama"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
          >
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Aumentar zoom del organigrama"
            onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
          >
            +
          </button>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      <div
        className="org-scroll"
        tabIndex={0}
        aria-label="Organigrama por jerarquía de roles"
      >
        <div className="org-tree" style={{ zoom }}>
          <ul>
            {roles
              .filter(
                (r) =>
                  !r.reports_to || !roles.some((x) => x.id === r.reports_to),
              )
              .map((r) => node(r))}
          </ul>
        </div>
      </div>
      {!roles.length && (
        <p>
          Crea roles y define “reporta a” para formar los niveles. Asigna
          después las personas desde Equipos.
        </p>
      )}
      {!!members.filter((m) => !m.role_id).length && (
        <p>
          Asignaciones heredadas sin rol del catálogo:{" "}
          {members.filter((m) => !m.role_id).length}. Vincúlalas explícitamente
          desde Equipos; se conserva su rol anterior.
        </p>
      )}
    </section>
  );
}
