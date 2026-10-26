import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Dialog} from '../Dialog';
import './ui-patterns.css';

export function Toolbar({label,children,className=''}:{label:string;children:ReactNode;className?:string}) {
  return <div className={'ui-toolbar '+className} role="group" aria-label={label}>{children}</div>;
}
export function FeedbackState({kind='empty',children,onRetry,onDismiss}:{kind?:'empty'|'error'|'loading';children:ReactNode;onRetry?:()=>void;onDismiss?:()=>void}) {
  return <div className={'ui-state ui-state-'+kind} role={kind==='error'?'alert':'status'}><div>{children}</div>{onRetry&&<button type="button" onClick={onRetry}>Reintentar</button>}{onDismiss&&<button type="button" aria-label="Cerrar error" onClick={onDismiss}>×</button>}</div>;
}
type Confirmation={subject:string;description:string;verb:string};
export function ConfirmDialog({subject,description,verb,onCancel,onConfirm}:{subject:string;description:string;verb:string;onCancel:()=>void;onConfirm:()=>void}) {
  return <Dialog title={`${verb} ${subject}`} className="confirm-dialog" onClose={onCancel}><div className="confirm-content"><p>{description}</p></div><footer className="confirm-footer"><button autoFocus type="button" onClick={onCancel}>Cancelar</button><button type="button" className="primary" onClick={onConfirm}>{verb}</button></footer></Dialog>;
}
export function useConfirmation(){
  const [value,setValue]=useState<Confirmation|null>(null);
  const resolve=useRef<((value:boolean)=>void)|null>(null);
  useEffect(()=>()=>{resolve.current?.(false);},[]);
  const finish=(result:boolean)=>{resolve.current?.(result);resolve.current=null;setValue(null);};
  return {confirm:(next:Confirmation)=>{resolve.current?.(false);setValue(next);return new Promise<boolean>(done=>{resolve.current=done;});},confirmation:value&&<ConfirmDialog {...value} onCancel={()=>finish(false)} onConfirm={()=>finish(true)}/>};
}
