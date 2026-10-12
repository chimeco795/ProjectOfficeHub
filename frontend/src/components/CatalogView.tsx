import {useEffect, useState} from 'react';
import {useLocalPersonId} from './LocalIdentity';

export function useCatalogView(catalog:string, initial:'list'|'cards'='list') {
  const person=useLocalPersonId();
  const key=`pohub.catalog-view.${person||'local'}.${catalog}`;
  const read=(): 'list'|'cards'=>localStorage.getItem(key)==='cards'?'cards':localStorage.getItem(key)==='list'?'list':initial;
  const [value,setValue]=useState<'list'|'cards'>(read);
  useEffect(()=>setValue(read()),[key]);
  function select(next:'list'|'cards'){localStorage.setItem(key,next);setValue(next);}
  return [value,select] as const;
}
export function CatalogView({value,onChange,label}:{value:'list'|'cards';onChange:(v:'list'|'cards')=>void;label:string}) {
  return <div className="view-switch" role="group" aria-label={'Vista de '+label}><button aria-pressed={value==='list'} onClick={()=>onChange('list')}>Lista</button><button aria-pressed={value==='cards'} onClick={()=>onChange('cards')}>Cards</button></div>;
}
