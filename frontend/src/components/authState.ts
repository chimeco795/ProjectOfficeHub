import {useSyncExternalStore} from 'react';
export type Account={id:string;email:string;name:string;security_role:'Admin'|'Gestor'|'Miembro'|'Consulta';active:boolean;person_id:string|null;version:number;preferences:{catalog_views?:Record<string,'list'|'cards'>}};
export type Session={account:Account;csrf:string;expires_at:number;idle_seconds:number};
let current:Session|null=null;
const subscribers=new Set<()=>void>();
export const sessionValue=()=>current;
export function setSession(value:Session|null){current=value;subscribers.forEach(fn=>fn());window.dispatchEvent(new Event('pohub-person'));}
export function updateAccount(account:Account){if(current?.account.id===account.id)setSession({...current,account});}
export function expireSession(){if(!current)return;setSession(null);window.dispatchEvent(new Event('pohub-session-expired'));}
export function useSession(){return useSyncExternalStore(fn=>{subscribers.add(fn);return()=>{subscribers.delete(fn);};},sessionValue);}
export function usePreferenceIdentity(){return useSession()?.account.id||'local';}
export function preferenceKeyFor(prefix:string,projectId:string){
  const account=current?.account,key=`pohub.${prefix}.${account?.id||'local'}.${projectId}`;
  if(account?.person_id&&!localStorage.getItem(key)){
    const legacy=localStorage.getItem(`pohub.${prefix}.${account.person_id}.${projectId}`);
    if(legacy)localStorage.setItem(key,legacy);
  }
  return key;
}
