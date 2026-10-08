import {useEffect,useState} from 'react';
import {api} from '../../api';
import {useLocalPersonId} from '../../components/LocalIdentity';
export function useOperationScope(projectId:string) {
 const person=useLocalPersonId(),[all,setAll]=useState(false),[projects,setProjects]=useState<{id:string;name:string}[]>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;setError('');setProjects([]);if(person)api(`/people/${person}/projects`).then(p=>{if(active)setProjects(p);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[person]);
 return {all,setAll,person,projects,error,ids:all?(person?projects.map(p=>p.id):[]):[projectId]};
}
export function ScopeToggle({scope}:{scope:ReturnType<typeof useOperationScope>}) {
 return <div className="operation-scope"><div className="view-switch"><button aria-pressed={!scope.all} onClick={()=>scope.setAll(false)}>Proyecto actual</button><button aria-pressed={scope.all} disabled={!scope.person} onClick={()=>scope.setAll(true)}>Todos mis proyectos</button></div>{!scope.person&&<small>Selecciona usuario local para consultar sus proyectos.</small>}{scope.error&&<small role="alert">{scope.error}</small>}</div>;
}
export function projectColor(id:string) {let hash=0;for(const c of id)hash=(hash*31+c.charCodeAt(0))>>>0;return `hsl(${hash%360} 48% 43%)`;}
