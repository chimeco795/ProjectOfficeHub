import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Secondary actions float independently of their containing grid or dialog. */
export function ActionMenu({label, children}: {label:string;children:ReactNode}) {
  const trigger=useRef<HTMLButtonElement>(null), panel=useRef<HTMLDivElement>(null);
  const [position,setPosition]=useState<{top:number;left:number}|null>(null);
  useEffect(()=>{
    if(!position)return;
    const close=(e:Event)=>{if(!panel.current?.contains(e.target as Node)&&!trigger.current?.contains(e.target as Node))setPosition(null);};
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setPosition(null);trigger.current?.focus();}};
    const reposition=()=>setPosition(null);
    document.addEventListener('pointerdown',close);document.addEventListener('keydown',key);
    window.addEventListener('resize',reposition);window.addEventListener('scroll',reposition,true);
    panel.current?.querySelector<HTMLElement>('button:not(:disabled),input')?.focus();
    return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',key);window.removeEventListener('resize',reposition);window.removeEventListener('scroll',reposition,true);};
  },[position]);
  return <><button type="button" ref={trigger} className="action-menu-trigger" aria-label={label} aria-expanded={!!position} aria-haspopup="dialog" onClick={()=>{
    if(position){setPosition(null);return;}const r=trigger.current!.getBoundingClientRect();
    setPosition({left:Math.max(8,Math.min(r.right-220,window.innerWidth-228)),top:Math.max(8,Math.min(r.bottom+4,window.innerHeight-250))});
  }}>⋮</button>{position&&createPortal(<div ref={panel} role="dialog" aria-label={label} className="action-menu-panel" style={{position:'fixed',...position}} onClick={e=>{if((e.target as HTMLElement).closest('button'))setPosition(null);}}>{children}</div>,trigger.current?.closest('dialog')||document.body)}</>;
}
