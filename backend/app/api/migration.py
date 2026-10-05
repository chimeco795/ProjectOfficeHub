import hashlib
import json
from fastapi import APIRouter,UploadFile,File,Form,HTTPException
from fastapi.responses import Response
from ..db import connection
from ..services.legacy import inspect
router=APIRouter(prefix='/api/migrations',tags=['Migration'])

@router.post('/pohub/{action}')
async def pohub(action:str,file:UploadFile=File(...),source:str=Form(...),project_map:str=Form('{}'),global_project:str=Form(''),confirm_hash:str=Form('')):
    if action not in ('preview','apply'):raise HTTPException(404,'Acción desconocida')
    content=await file.read(20*1024*1024+1)
    try:mapping=json.loads(project_map)
    except ValueError as exc:raise HTTPException(422,'Mapa de proyectos inválido') from exc
    if not isinstance(mapping,dict) or any(not isinstance(v,str) for v in mapping.values()):raise HTTPException(422,'Mapa de proyectos inválido')
    if action=='apply' and confirm_hash!=hashlib.sha256(content).hexdigest():raise HTTPException(409,'El archivo cambió; valida la vista previa otra vez')
    result=inspect(content,file.filename or 'origen.pohub',source.strip(),mapping,global_project or None,apply=action=='apply')
    if action=='apply' and result['errors']:raise HTTPException(422,'; '.join(result['errors']))
    return result

@router.get('')
def batches():
    with connection() as db:return [dict(r) for r in db.execute('SELECT id,sha256,filename,report,created_at FROM migration_batches ORDER BY created_at DESC')]

@router.get('/{identity}/original')
def original(identity:str):
    with connection() as db:
        row=db.execute('SELECT original FROM migration_batches WHERE id=?',(identity,)).fetchone()
        if not row:raise HTTPException(404,'Importación no encontrada')
        return Response(row['original'],media_type='application/octet-stream',headers={'Content-Disposition':'attachment; filename="original.pohub"','X-Content-Type-Options':'nosniff'})
