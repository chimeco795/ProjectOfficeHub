export const teamShapes:Record<string,string>={circle:'●',diamond:'◆',square:'■',triangle:'▲',hexagon:'⬟'};
export function teamLabel(team:{code?:string;shape?:string;name?:string}){return `${team.code||'Sin código'} ${teamShapes[team.shape||'circle']||'●'} · ${team.name||'Equipo'}`;}
