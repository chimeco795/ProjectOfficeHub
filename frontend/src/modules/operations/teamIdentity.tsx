import '../../components/ui-patterns.css';
import {teamShapes} from './teamIdentityModel';
export {teamShapes,teamLabel} from './teamIdentityModel';
export function TeamBadge({team}:{team:any}){
  return <span className="team-identity" title={team.name}><span className="team-symbol" style={{color:team.color||'#246b58'}} aria-hidden="true">{teamShapes[team.shape]||'●'}</span><span className="team-code">{team.code||'Sin código'}</span><span>· {team.name}</span></span>;
}
