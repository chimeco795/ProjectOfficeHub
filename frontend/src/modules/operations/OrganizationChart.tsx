import { useEffect, useState, useRef } from "react";
import { api,json } from "../../api";
import { dateKey } from "./calendarModel";
import {Dialog} from '../../Dialog';
import {SearchPicker,personChoices} from '../../components/SearchPicker';
import {PersonAssignment} from './PersonAssignment';
import {RecordEditor} from './Operations';
import {multiTeamRoles} from './teamRoleModel';
export function OrganizationChart({ projectId }: { projectId: string }) {
  const [selected,setSelected]=useState<any>(null);
  const [teams,setTeams]=useState<any[]>([]),[teamFilter,setTeamFilter]=useState('');
  const [showMembers,setShowMembers]=useState(true);
  const [assignRole,setAssignRole]=useState<any>(null),[assignPerson,setAssignPerson]=useState<any>(null),[allPeople,setAllPeople]=useState<any[]>([]),[createPerson,setCreatePerson]=useState(false),[revision,setRevision]=useState(0);
  const pan=useRef<{x:number;y:number;left:number;top:number}|null>(null);
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
      api(`/projects/${projectId}/pmo/teams`),
      api('/people'),
    ])
      .then(([r, m, p, t, all]) => {
        setAllPeople(all);
        setTeams(t.filter((x:any)=>!x.archived).sort((a:any,b:any)=>a.id.localeCompare(b.id)));
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
  }, [projectId, today,revision]);
  const multiRoles=multiTeamRoles(roles);
  function cell(teamId:string){const index=teams.findIndex(t=>t.id===teamId);if(index<0)return null;return <span className="org-cell" style={{color:['#246b58','#365baa','#9a5a17','#82378b','#9e3946'][index%5]}} title={teams[index].name}>{['●','◆','■','▲','⬟'][index%5]} E{index+1} · {teams[index].name}</span>;}
  function node(role: any, path: string[] = []): React.ReactNode {
    if (path.includes(role.id)) return null;
    const children = roles.filter((r) => r.reports_to === role.id),
      persons = members.filter((m) => m.role_id === role.id&&(!teamFilter||m.team_id===teamFilter));
    const roleTeams=[...new Set([...persons.map(m=>m.team_id).filter(Boolean),...teams.filter(t=>(!teamFilter||t.id===teamFilter)&&members.some(m=>m.role_id===role.id&&m.person_id===t.lead_id)).map(t=>t.id)])];
    return (
      <li key={role.id}>
        <div className="org-node">
          <button className="org-select" onClick={()=>setSelected({role})}><strong>{role.name}</strong></button>
          {multiRoles.has(role.id)&&<small>Gestión de múltiples equipos</small>}
          {!showMembers&&roleTeams.map(id=><div key={String(id)}>{cell(String(id))}</div>)}
          {showMembers&&persons.map((m) => (
            <button className="org-person" key={m.id} onClick={()=>setSelected({role,member:m})}>
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
                {cell(m.team_id)}
              </span>
            </button>
          ))}
          {showMembers&&!persons.length && <><small>{teamFilter?'Sin persona en este equipo':'Sin persona asignada'}</small><button onClick={()=>{setAssignRole(role);setAssignPerson(null);}}>+ Asignar persona</button></>}
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
        <label className="check-control"><input type="checkbox" checked={showMembers} onChange={e=>{setShowMembers(e.target.checked);setSelected(null);}}/>Mostrar integrantes</label>
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
      {!!teams.length&&<div className="catalog-toolbar"><label>Equipo<select value={teamFilter} onChange={e=>setTeamFilter(e.target.value)}><option value="">Todos los equipos</option>{teams.map((t,index)=><option key={t.id} value={t.id}>E{index+1} · {t.name}</option>)}</select></label><div className="org-cell-legend" aria-label="Leyenda de equipos">{teams.map(t=><span key={t.id}>{cell(t.id)}</span>)}</div></div>}
      <div
        className="org-scroll"
        tabIndex={0}
        aria-label="Organigrama por jerarquía de roles"
        onPointerDown={e=>{if((e.target as HTMLElement).closest('button'))return;pan.current={x:e.clientX,y:e.clientY,left:e.currentTarget.scrollLeft,top:e.currentTarget.scrollTop};e.currentTarget.setPointerCapture(e.pointerId);}}
        onPointerMove={e=>{if(pan.current){e.currentTarget.scrollLeft=pan.current.left+pan.current.x-e.clientX;e.currentTarget.scrollTop=pan.current.top+pan.current.y-e.clientY;}}}
        onPointerUp={()=>{pan.current=null;}} onPointerCancel={()=>{pan.current=null;}}
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
      {selected&&<article className="org-context"><div className="section-heading"><h3>{selected.member?people.find(p=>p.id===selected.member.person_id)?.name:selected.role.name}</h3><button aria-label="Cerrar detalle del nodo" onClick={()=>setSelected(null)}>×</button></div><p>{selected.role.name} · Reporta a {roles.find(r=>r.id===selected.role.reports_to)?.name||'Raíz'}</p>{selected.member&&<p>Dedicación {selected.member.allocation}% · Vigencia {selected.member.valid_from||'Sin inicio'} → {selected.member.valid_to||'Sin fin'}</p>}<small>La estructura se configura desde Roles y Equipos.</small></article>}
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
      {assignRole&&!createPerson&&<Dialog title={'Asignar persona · '+assignRole.name} onClose={()=>{setAssignRole(null);setAssignPerson(null);}}><p>Selecciona una persona existente. El equipo es opcional; el rol y la dedicación se asignan al proyecto.</p><SearchPicker label="Persona existente" value={assignPerson?.id||''} options={personChoices(allPeople)} onChange={v=>setAssignPerson(allPeople.find(p=>p.id===v)||null)}/>{assignPerson&&<PersonAssignment key={assignPerson.id} projectId={projectId} person={assignPerson} initialRoleId={assignRole.id} onAssigned={async()=>setRevision(r=>r+1)}/>}<button onClick={()=>setCreatePerson(true)}>+ Crear nueva persona</button></Dialog>}
      {assignRole&&createPerson&&<RecordEditor title="Nueva persona" initial={{name:'',email:''}} fields={[{key:'name',label:'Nombre',required:true},{key:'email',label:'Correo',type:'email'}]} onClose={()=>setCreatePerson(false)} onSave={async value=>{const person=await api(`/projects/${projectId}/people`,{method:'POST',...json({new_person:value})});setAllPeople(old=>[...old.filter(p=>p.id!==person.id),person]);setAssignPerson(person);setCreatePerson(false);setRevision(r=>r+1);}}/>}
    </section>
  );
}
