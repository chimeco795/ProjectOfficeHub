import {useEffect, useState} from 'react';
import {useSession,sessionValue,updateAccount} from './authState';
import {api,json} from '../api';
import {List,LayoutGrid} from 'lucide-react';
let pending=Promise.resolve();

export function useCatalogView(catalog:string, initial:'list'|'cards'='list') {
  const account=useSession()?.account;
  const key=`pohub.catalog-view.account.${account?.id||'local'}.${catalog}`;
  const stored=account?.preferences.catalog_views?.[catalog];
  const read=(): 'list'|'cards'=>stored|| (localStorage.getItem(key)==='cards'?'cards':localStorage.getItem(key)==='list'?'list':initial);
  const [value,setValue]=useState<'list'|'cards'>(read);
  useEffect(()=>setValue(read()),[key,stored]);
  function select(next:'list'|'cards'){
    setValue(next);
    const accountId=account?.id;
    pending=pending.then(async()=>{
      const current=sessionValue()?.account;
      if(!current||current.id!==accountId)return;
      try{const saved=await api('/auth/preferences',{method:'PUT',...json({catalog_views:{...current.preferences.catalog_views,[catalog]:next}})});localStorage.setItem(key,next);updateAccount(saved);}
      catch(e){if(sessionValue()?.account.id===accountId){setValue(read());window.dispatchEvent(new CustomEvent('pohub-preference-error',{detail:(e as Error).message}));}}
    });
  }
  return [value,select] as const;
}
export function CatalogView({value,onChange,label}:{value:'list'|'cards';onChange:(v:'list'|'cards')=>void;label:string}) {
  return <div className="view-switch compact-view-switch" role="group" aria-label={'Vista de '+label}><button type="button" title="Vista Lista" aria-label="Vista Lista" aria-pressed={value==='list'} onClick={()=>onChange('list')}><List size={16}/></button><button type="button" title="Vista Cards" aria-label="Vista Cards" aria-pressed={value==='cards'} onClick={()=>onChange('cards')}><LayoutGrid size={16}/></button></div>;
}
