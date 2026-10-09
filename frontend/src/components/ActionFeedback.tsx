import { useState } from 'react';
export function useActionFeedback() {
  const [notice,setNotice]=useState<{text:string;undo?:()=>Promise<void>}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const feedback=<>{notice&&<div className="action-toast" role="status"><span>{notice.text}</span>{notice.undo&&<button disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await notice.undo!();setNotice({text:'Cambio deshecho'});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Deshacer</button>}<button aria-label="Cerrar aviso" disabled={busy} onClick={()=>setNotice(null)}>×</button>{error&&<span role="alert">{error}</span>}</div>}</>;
  return {notify:(text:string,undo?:()=>Promise<void>)=>{setError('');setNotice({text,undo});},feedback};
}
