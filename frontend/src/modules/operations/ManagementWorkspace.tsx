import {teamLabel} from './teamIdentity';
import {multiTeamRoles} from './teamRoleModel';
import {useActionFeedback} from '../../components/ActionFeedback';
import {Toolbar,FeedbackState} from '../../components/UiPatterns';
import { useEffect, useState } from "react";
import { api, json } from "../../api";
import { ContextField } from "../../components/ContextField";
import { SearchPicker, personChoices } from "../../components/SearchPicker";
import { Dialog } from "../../Dialog";
import { RecordEditor } from "./Operations";
import { Capacity } from "./Capacity";
import { OrganizationChart } from "./OrganizationChart";
import {ActionMenu} from '../../components/ActionMenu';
import {PersonAssignment} from './PersonAssignment';
import {CatalogView,useCatalogView} from '../../components/CatalogView';
import '../master/catalog.css';
import {dateKey} from './calendarModel';
import {SortHeader} from '../../components/SortHeader';
import {useSession} from '../../components/authState';
export function ManagementWorkspace({
  projectId,
  view,
}: {
  projectId: string;
  view: string;
}) {
  const {notify,feedback}=useActionFeedback();
  const base = "/projects/" + projectId;
  const permission=useSession()?.account.security_role;
  const canManage=permission==='Admin'||permission==='Gestor';
  const [sort,setSort]=useState({key:'name',descending:false}),[scope,setScope]=useState('all');
  const order=(key:string)=>setSort(s=>({key,descending:s.key===key&&!s.descending}));
  const [catalogView,setCatalogView]=useCatalogView(view);
  const [memberships,setMemberships]=useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]),
    [assigned, setAssigned] = useState<any[]>([]),
    [roles, setRoles] = useState<any[]>([]),
    [absences, setAbsences] = useState<any[]>([]),
    [teams, setTeams] = useState<any[]>([]),
    [calendars, setCalendars] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null),
    [adding, setAdding] = useState(""),
    [error, setError] = useState(""),
    [query, setQuery] = useState("");
  async function reload() {
    const [p, a, r, d, t, c, m] = await Promise.all([
      api("/people"),
      api(base + "/people"),
      api("/roles"),
      api(base + "/availability"),
      api(base + "/pmo/teams"),
      api(base + "/working-calendars"),
      api(base + "/pmo/memberships"),
    ]);
    setPeople(p);
    setAssigned(a);
    setRoles(r);
    setAbsences(d);
    setTeams(t);
    setCalendars(c);
    setMemberships(m);
  }
  useEffect(() => {
    void reload().catch((e) => setError(e.message));
  }, [base]);
  const titles: Record<string, string> = {
    people: "Personas",
    roles: "Roles",
    availability: "Capacidad / Disponibilidad",
    organization: "Organigrama",
  };
  async function savePerson(key: string, value: any) {
    try {
      const next = { ...selected, [key]: value };
      const contact = ["phone", "mobile", "location", "contact_notes"].includes(
        key,
      );
      const saved = await api(
        "/people/" + next.id + (contact ? "/contact" : ""),
        { method: "PUT", ...json(next) },
      );
      setSelected(saved);
      await reload();
    } catch (e) {
      throw e;
    }
  }
  function assignmentSummary(record:any) {
    const today=dateKey(new Date());
    const active=memberships.filter(m=>!m.archived&&(!m.valid_from||m.valid_from<=today)&&(!m.valid_to||m.valid_to>=today)&&(view==='people'?m.person_id===record.id:m.role_id===record.id));
    const teamNames=[...new Set(active.map(m=>(teams.find(t=>t.id===m.team_id)?teamLabel(teams.find(t=>t.id===m.team_id)):null)).filter(Boolean))].join(', ');
    const detail=view==='people'?active.map(m=>(roles.find(r=>r.id===m.role_id)?.name||m.role||'Sin rol')+' · '+m.allocation+'%').join(' / '):[...new Set(active.map(m=>people.find(p=>p.id===m.person_id)?.name).filter(Boolean))].join(', ');
    return <><span>{teamNames||'Sin equipo'}</span><span>{detail||'Sin asignación vigente'}</span></>;
  }
  async function saveRecord(record:any,key:string,value:any){
    const saved=await api('/'+view+'/'+record.id,{method:'PUT',...json({...record,[key]:value})});
    (view==='people'?setPeople:setRoles)(old=>old.map(r=>r.id===saved.id?saved:r));
    setSelected((old:any)=>old?.id===saved.id?saved:old);
  }
  async function saveMember(member:any,key:string,value:any){
    const saved=await api(base+'/pmo/memberships/'+member.id,{method:'PUT',...json({...member,[key]:value})});
    setMemberships(old=>old.map(m=>m.id===saved.id?saved:m));
  }
  const today=dateKey(new Date());
  const records=(view==='people'?people:roles).filter(r=>(r.name+' '+(r.email||'')).toLocaleLowerCase().includes(query.toLocaleLowerCase())&&(scope==='all'||(view==='people'?(scope==='assigned')===assigned.some(a=>a.id===r.id):(scope==='archived')===!!r.archived)));
  const sortValue=(r:any)=>sort.key==='reports_to'?roles.find(p=>p.id===r.reports_to)?.name||'':r[sort.key]||'';
  records.sort((a,b)=>String(sortValue(a)).localeCompare(String(sortValue(b)),'es',{numeric:true})*(sort.descending?-1:1));
  const headers=view==='people'?[['Nombre','name'],['Correo','email'],['Equipo',''],['Rol',''],['Dedicación',''],['Líder',''],['Estado',''],['Acciones','']]:[['Rol','name'],['Reporta a','reports_to'],['Personas asignadas',''],['Equipos',''],['Multiequipo',''],['Estado',''],['Acciones','']];
  function memberField(member:any,key:string,record:any){
    const source=key==='team_id'?teams:key==='role_id'?roles:people;
    const label=key==='team_id'?'Equipo':key==='role_id'?'Rol':key==='leader_id'?'Líder':'Dedicación (%)';
    return <ContextField key={member.id} label={label+' de '+record.name} showLabel={false} disabled={!canManage} value={member[key]??''} type={key==='allocation'?'number':'text'} min={0} max={100} search={key!=='allocation'} options={key==='allocation'?undefined:[{value:'',label:'Sin '+label.toLocaleLowerCase()},...source.filter(r=>(!r.archived||r.id===member[key])&&(key!=='leader_id'||r.id!==member.person_id)).map(r=>({value:r.id,label:key==='team_id'?teamLabel(r):r.name}))]} display={key==='allocation'?member.allocation+'%':key==='role_id'&&!member.role_id?member.role||'Sin rol':undefined} onSave={v=>saveMember(member,key,key==='allocation'?Number(v):v||null)}/>;
  }
  return (
    <section className="panel management-workspace">{feedback}
      {view==='availability'&&<div className="section-heading">
        <button className="primary" disabled={!canManage} onClick={() => setAdding(view)}>Registrar ausencia</button>
      </div>}
      {error && <p role="alert">{error}</p>}
      {view === "people" || view === "roles" ? (
        <>
          <Toolbar label="Controles de gestión" className="catalog-toolbar">
            <label className="catalog-search">{view==='people'?'Buscar persona':'Buscar rol'}<input value={query} onChange={e=>setQuery(e.target.value)} placeholder={view==='people'?'Nombre o correo':'Nombre del rol'}/></label>
            <label>{view==='people'?'Asignación':'Estado'}<select value={scope} onChange={e=>setScope(e.target.value)}><option value="all">Todos</option>{view==='people'?<><option value="assigned">En el proyecto</option><option value="unassigned">Sin asignar</option></>:<><option value="active">Activos</option><option value="archived">Archivados</option></>}</select></label>
            <CatalogView value={catalogView} onChange={setCatalogView} label={titles[view]}/>
            <button className="primary" disabled={!canManage} onClick={()=>setAdding(view)}>{view==='people'?'Nueva persona':'Nuevo rol'}</button>
          </Toolbar>
          {catalogView==='list'?<div className="catalog-table-wrap"><table className="catalog-table"><thead><tr>{headers.map(([label,key])=>key?<SortHeader key={label} label={label} column={key} sort={sort} onSort={order}/>:<th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{records.map(record=>{
            const current=memberships.filter(m=>!m.archived&&(!m.valid_from||m.valid_from<=today)&&(!m.valid_to||m.valid_to>=today)&&(view==='people'?m.person_id===record.id:m.role_id===record.id));
            const names=(key:string,source:any[])=>[...new Set(current.map(m=>{const row=source.find(x=>x.id===m[key]);return row?(key==='team_id'?teamLabel(row):row.name):null;}).filter(Boolean))].join(', ')||'—';
            return <tr key={record.id}>
              <td><ContextField label={(view==='people'?'Nombre':'Rol')+' de '+record.name} showLabel={false} value={record.name} required disabled={!canManage} onSave={v=>saveRecord(record,'name',v)}/></td>
              {view==='people'?<>
                <td><ContextField label={'Correo de '+record.name} className="catalog-email" showLabel={false} value={record.email||''} type="email" disabled={!canManage} onSave={v=>saveRecord(record,'email',v)}/></td>
                <td>{current.length?current.map(m=>memberField(m,'team_id',record)):'Sin equipo'}</td>
                <td>{current.length?current.map(m=>memberField(m,'role_id',record)):<button className="catalog-name" disabled={!canManage} onClick={()=>setSelected(record)}>Asignar rol</button>}</td>
                <td>{current.length?current.map(m=>memberField(m,'allocation',record)):'—'}</td>
                <td>{current.length?current.map(m=>memberField(m,'leader_id',record)):'—'}</td>
                <td>{assigned.some(a=>a.id===record.id)?'En el proyecto':'Sin asignar'}</td>
              </>:<>
                <td><ContextField label={'Reporta a de '+record.name} showLabel={false} value={record.reports_to||''} display={roles.find(r=>r.id===record.reports_to)?.name||'Raíz'} search disabled={!canManage} options={[{value:'',label:'Raíz'},...roles.filter(r=>r.id!==record.id&&(!r.archived||r.id===record.reports_to)).map(r=>({value:r.id,label:r.name}))]} onSave={v=>saveRecord(record,'reports_to',v||null)}/></td>
                <td>{names('person_id',people)}</td><td>{names('team_id',teams)}</td><td><ContextField label={'Multiequipo de '+record.name} showLabel={false} value={record.manages_multiple_teams?'yes':'no'} disabled={!canManage} display={record.manages_multiple_teams?'Sí':multiTeamRoles(roles).has(record.id)?'Heredado':'No'} options={[{value:'no',label:'No'},{value:'yes',label:'Sí'}]} onSave={v=>saveRecord(record,'manages_multiple_teams',v==='yes')}/></td><td>{record.archived?'Archivado':'Activo'}</td>
              </>}
              <td><ActionMenu label={'Opciones de '+record.name}><button onClick={()=>setSelected(record)}>Ver ficha</button>{view==='people'&&<button onClick={()=>setSelected(record)}>Asignar rol / equipo</button>}</ActionMenu></td>
            </tr>;
          })}</tbody></table></div>:<div className="catalog-cards">{records.map(record=><article className="catalog-card" key={record.id}><button className="catalog-card-open" onClick={()=>setSelected(record)}><strong>{record.name}</strong>{view==='people'?<><span>{record.email||'Sin correo'}</span><span>{assigned.some(a=>a.id===record.id)?'En este proyecto':'Sin asignar al proyecto'}</span></>:<><span>Reporta a: {roles.find(r=>r.id===record.reports_to)?.name||'Raíz'}</span><span>{record.archived?'Archivado':'Activo'}</span></>}{assignmentSummary(record)}</button><ActionMenu label={'Opciones de '+record.name}><button onClick={()=>setSelected(record)}>Ver ficha</button></ActionMenu></article>)}</div>}
          {!records.length&&<FeedbackState>No hay resultados en esta selección.</FeedbackState>}
        </>
      ) : view === "organization" ? (
        <OrganizationChart projectId={projectId} />
      ) : (
        <>
          <div className="availability-list">
            {absences
              .filter((a) => !a.archived)
              .map((a) => (
                <article className="person-card" key={a.id}>
                  <h3>{people.find((p) => p.id === a.person_id)?.name}</h3>
                  <p>
                    {a.kind} · {a.start_date} → {a.end_date}
                  </p>
                  <p>{a.notes}</p>
                  <button onClick={() => setSelected(a)}>
                    Editar disponibilidad
                  </button>
                </article>
              ))}
          </div>
          <div className="section-heading">
            <h3>Horario laboral</h3>
            <button onClick={() => setAdding("calendar")}>
              Configurar horario
            </button>
          </div>
          {calendars.map((c) => (
            <p key={c.id}>
              {(teams.find(t=>t.id===c.team_id)?teamLabel(teams.find(t=>t.id===c.team_id)):'Proyecto')} ·{" "}
              {c.days
                .map(
                  (d: number) =>
                    ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][d],
                )
                .join(", ")}{" "}
              · {c.start_time.slice(0, 5)}–{c.end_time.slice(0, 5)}{" "}
              <button
                onClick={() => {
                  setSelected(c);
                  setAdding("calendar");
                }}
              >
                Editar horario
              </button>
            </p>
          ))}
          <Capacity projectId={projectId} revision={JSON.stringify(absences)} />
        </>
      )}
      {selected && view === "people" && (
        <Dialog title={selected.name} onClose={() => setSelected(null)}>

          <div className="detail-grid">
            {(["name", "email"] as const).map((key) => (
              <ContextField
                key={key}
                label={key === "name" ? "Nombre" : "Correo"}
                type={key === "email" ? "email" : "text"}
                required={key === "name"}
                value={selected[key]||""}
                onSave={(v) => savePerson(key, v)}
              />
            ))}
          </div>
          <PersonAssignment key={selected.id} projectId={projectId} person={selected} onAssigned={reload}/>
          <details className="person-contact"><summary>Más datos de contacto</summary>
          {(["phone", "mobile", "location", "contact_notes"] as const).map(
            (key, index) =>
              (selected[key] || selected["_show" + key]) ? (
                <ContextField
                  key={key}
                  label={
                    ["Teléfono", "Celular", "Ubicación", "Otros datos"][index]
                  }
                  type={key === "contact_notes" ? "textarea" : "text"}
                  value={selected[key]||""}
                  onSave={(v) => savePerson(key, v)}
                />
              ) : (
                <button
                  key={key}
                  onClick={() =>
                    setSelected({ ...selected, ["_show" + key]: true })
                  }
                >
                  + {["Teléfono", "Celular", "Ubicación", "Otros datos"][index]}
                </button>
              ),
          )}
          </details>
        </Dialog>
      )}
      {adding === "people" && (
        <RecordEditor
          title="Nueva persona"
          initial={{ name: "", email: "" }}
          fields={[
            { key: "name", label: "Nombre", required: true },
            { key: "email", label: "Correo", type: "email" },
          ]}
          onClose={() => setAdding("")}
          onSave={async (v) => {
            const saved=await api(base + "/people", {
              method: "POST",
              ...json({ new_person: v }),
            });
            await reload();
            setSelected(saved);
          }}
        />
      )}
      {selected&&view==='roles'&&!adding&&<Dialog title={selected.name} onClose={()=>setSelected(null)}>
        {error&&<p role="alert">{error}</p>}
        <div className="detail-grid"><ContextField label="Nombre" required value={selected.name} onSave={async v=>{const saved=await api('/roles/'+selected.id,{method:'PUT',...json({...selected,name:v})});setSelected(saved);await reload();}}/>
        <ContextField label="Reporta a" value={selected.reports_to||''} search options={[{value:'',label:'Raíz'},...roles.filter(r=>r.id!==selected.id&&!r.archived).map(r=>({value:r.id,label:r.name}))]} onSave={async v=>{const saved=await api('/roles/'+selected.id,{method:'PUT',...json({...selected,reports_to:v||null})});setSelected(saved);await reload();}}/></div>
        <ContextField label="Gestiona múltiples equipos" value={selected.manages_multiple_teams?'yes':'no'} disabled={!canManage} options={[{value:'no',label:'No'},{value:'yes',label:'Sí'}]} onSave={v=>saveRecord(selected,'manages_multiple_teams',v==='yes')}/><small>Se hereda hacia roles superiores. No concede permisos de acceso al PMO.</small><p>{roles.filter(r=>r.reports_to===selected.id).length} roles subordinados · {selected.archived?'Archivado':'Activo'}</p>
        <ActionMenu disabled={!canManage} label="Opciones del rol"><button onClick={async()=>{try{const saved=await api('/roles/'+selected.id,{method:'PUT',...json({...selected,archived:!selected.archived})});setSelected(saved);await reload();const before=selected;notify(before.archived?'Rol restaurado':'Rol archivado',async()=>{const restored=await api('/roles/'+saved.id,{method:'PUT',...json({...saved,archived:before.archived})});setSelected(restored);await reload();});}catch(e){setError((e as Error).message);}}}>{selected.archived?'Restaurar rol':'Archivar rol'}</button></ActionMenu>
      </Dialog>}
      {adding === "roles" && (
        <RecordEditor
          title="Crear rol"
          initial={
            selected || {
              name: "",
              reports_to: null,
              manages_multiple_teams: false,
              version: 1,
              archived: false,
            }
          }
          fields={[
            { key: "name", label: "Nombre", required: true },
            { key: "manages_multiple_teams", label: "Gestiona múltiples equipos", type: "checkbox" },
            {
              key: "reports_to",
              label: "Reporta a",
              nullable: true,
              options: roles
                .filter((r) => r.id !== selected?.id && !r.archived)
                .map((r) => ({ value: r.id, label: r.name })),
            },
          ]}
          onClose={() => {
            setSelected(null);
            setAdding("");
          }}
          onSave={async (v) => {
            await api("/roles" + (v.id ? "/" + v.id : ""), {
              method: v.id ? "PUT" : "POST",
              ...json(v),
            });
            await reload();
          }}
        />
      )}
      {(adding === "availability" ||
        (selected && view === "availability" && !adding)) && (
        <RecordEditor
          title="Disponibilidad"
          initial={
            selected || {
              person_id: "",
              kind: "Vacaciones",
              start_date: "",
              end_date: "",
              notes: "",
              version: 1,
              archived: false,
            }
          }
          fields={[
            {
              key: "person_id",
              label: "Persona",
              options: personChoices(assigned),
              required: true,
            },
            {
              key: "kind",
              label: "Tipo",
              required: true,
              options: [
                "Vacaciones",
                "Permiso",
                "Enfermedad",
                "Asunto personal",
                "Fuera de oficina",
              ].map((value) => ({ value, label: value })),
            },
            {
              key: "start_date",
              label: "Inicio",
              type: "date",
              required: true,
            },
            { key: "end_date", label: "Fin", type: "date", required: true },
            { key: "notes", label: "Nota", type: "textarea" },
            { key: "archived", label: "Archivado", type: "checkbox" },
          ]}
          onClose={() => {
            setSelected(null);
            setAdding("");
          }}
          onSave={async (v) => {
            await api(base + "/availability" + (v.id ? "/" + v.id : ""), {
              method: v.id ? "PUT" : "POST",
              ...json(v),
            });
            await reload();
          }}
        />
      )}
      {adding === "calendar" && (
        <CalendarEditor
          initial={selected}
          teams={teams}
          onClose={() => {
            setAdding("");
            setSelected(null);
          }}
          onSave={async (v) => {
            await api(base + "/working-calendar", {
              method: "PUT",
              ...json(v),
            });
            await reload();
          }}
        />
      )}
    </section>
  );
}
function CalendarEditor({
  initial,
  teams,
  onClose,
  onSave,
}: {
  initial: any;
  teams: any[];
  onClose: () => void;
  onSave: (v: any) => Promise<void>;
}) {
  const [v, setV] = useState(
      initial || {
        team_id: null,
        days: [0, 1, 2, 3, 4],
        start_time: "09:00",
        end_time: "18:00",
        version: 0,
      },
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Dialog
      title="Horario laboral"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave(v);
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Ámbito
            <select
              disabled={!!initial}
              value={v.team_id || ""}
              onChange={(e) => setV({ ...v, team_id: e.target.value || null })}
            >
              <option value="">Proyecto</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {teamLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <div className="button-row">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day, i) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={v.days.includes(i)}
                  onChange={(e) =>
                    setV({
                      ...v,
                      days: e.target.checked
                        ? [...v.days, i]
                        : v.days.filter((d: number) => d !== i),
                    })
                  }
                />
                {day}
              </label>
            ))}
          </div>
          {["start_time", "end_time"].map((key, index) => (
            <label key={key}>
              {index ? "Fin" : "Inicio"}
              <input
                type="time"
                required
                value={v[key].slice(0, 5)}
                onChange={(e) => setV({ ...v, [key]: e.target.value })}
              />
            </label>
          ))}
          {error && <p role="alert">{error}</p>}
          <button className="primary">Guardar horario</button>
        </fieldset>
      </form>
    </Dialog>
  );
}
