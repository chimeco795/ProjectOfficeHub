from datetime import date
from fastapi import APIRouter,HTTPException
from pydantic import BaseModel,Field
from ..db import connection
from ..services import master,scheduler
router=APIRouter(prefix='/api/projects/{project_id}/schedule',tags=['Scheduling'])
class Simulation(BaseModel):
    anchor:date
class Application(Simulation):
    fingerprint:str=Field(min_length=64,max_length=64)

@router.post('/preview')
def preview(project_id:str,value:Simulation):
    with connection() as db:
        db.execute('BEGIN')
        result=scheduler.calculate(scheduler.snapshot(db,project_id),value.anchor)
        result["fingerprint"]=confirmation(result["fingerprint"],value.anchor,project_id)
        return result

@router.post('/apply')
def apply(project_id:str,value:Application):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        items=scheduler.snapshot(db,project_id)
        result=scheduler.calculate(items,value.anchor)
        # Bind confirmation to both the graph and the requested simulation anchor.
        expected=confirmation(result['fingerprint'],value.anchor,project_id)
        if value.fingerprint!=expected:raise HTTPException(409,'El plan o la fecha de simulación cambió. Vuelve a simular antes de aplicar')
        if result['errors']:raise HTTPException(422,'Resuelve los problemas de la simulación antes de aplicar')
        by_id={i['id']:i for i in items}
        for row in result['rows']:
            if not row['changed']:continue
            old=by_id[row['id']]
            db.execute('UPDATE master_items SET start_date=?,target_date=?,version=version+1,updated_at=? WHERE id=?',(row['start'],row['end'],master.now(),row['id']))
            master.audit(db,project_id,row['id'],'reprogramar',old,master.item(db,project_id,row['id']))
        return {'applied':result['changes'],'finish':result['finish']}

def confirmation(fingerprint,anchor,project_id):
    import hashlib
    return hashlib.sha256((fingerprint+anchor.isoformat()+project_id).encode()).hexdigest()
