import { useState } from 'react';
import {createPortal} from 'react-dom';
export function useActionFeedback() {
  const [notice,setNotice]=useState<{text:string;undo?:()=>Promise<void>}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const dialogs=document.querySelectorAll('dialog[open]');
  const target=dialogs[dialogs.length-1]||document.body;
  const feedback=notice?createPortal(<div className="action-toast" role="status"><span>{notice.text}</span>{notice.undo&&<button disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await notice.undo!();setNotice({text:'Cambio deshecho'});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Deshacer</button>}<button aria-label="Cerrar aviso" disabled={busy} onClick={()=>setNotice(null)}>×</button>{error&&<span role="alert">{error}</span>}</div>,target):null;
  return {notify:(text:string,undo?:()=>Promise<void>)=>{setError('');setNotice({text,undo});},feedback};
}
