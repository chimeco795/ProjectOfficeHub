type Role = {id:string;name:string;reports_to:string|null;archived?:boolean;manages_multiple_teams?:boolean|number;effective_manages_multiple_teams?:boolean};
// The configured hierarchy, rather than a guessed title ranking, defines senior roles.
export function multiTeamRoles(roles:Role[]): Set<string> {
  const allowed=new Set<string>();
  for(const lead of roles.filter(r=>r.manages_multiple_teams||r.effective_manages_multiple_teams)) {
    let role:Role|undefined=lead;
    const seen=new Set<string>();
    while(role&&!seen.has(role.id)) {
      seen.add(role.id);
      if(!role.archived)allowed.add(role.id);
      role=roles.find(r=>r.id===role?.reports_to);
    }
  }
  return allowed;
}
