import {useEffect,useState} from 'react';
import {api} from '../../api';
import {DocumentIcon} from './DocumentIcon';
export function Attachments({projectId,kind,id}:{projectId:string;kind:'item'|'event'|'cut';id:string}) {
 const [rows,setRows]=useState<any[]>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;setRows([]);setError('');api(`/projects/${projectId}/attachments/${kind}/${id}`).then(r=>{if(active)setRows(r);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[projectId,kind,id]);
 return <section className="entity-attachments"><h4>Documentos vinculados</h4>{error&&<p role="alert">{error}</p>}{rows.map(d=><div key={d.id}><DocumentIcon filename={d.filename}/><a href={d.download_url}>{d.filename}</a>{!!d.archived&&<small>Archivado</small>}<p>{d.notes}</p></div>)}{!rows.length&&!error&&<small>Sin documentos vinculados. Puedes relacionarlos desde Documentos.</small>}</section>;
}
