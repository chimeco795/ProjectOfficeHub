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

class Shift(BaseModel):
    days:int=Field(ge=-36500,le=36500)
    fingerprint:str|None=Field(default=None,min_length=64,max_length=64)

def shift_proposal(items,identity,days,project_id,start_override=None,end_override=None):
    import hashlib,json
    from datetime import timedelta
    source=next((i for i in items if i['id']==identity),None)
    if not source:raise HTTPException(404,'Trabajo ajeno al proyecto')
    if source['archived'] or source['status'].lower() in scheduler.DONE:
        raise HTTPException(422,'El trabajo archivado o terminado no se mueve desde la barra')
    if not source['start_date'] or not source['target_date']:raise HTTPException(422,'Completa las fechas antes de mover')
    try:
        start=start_override or date.fromisoformat(source['start_date'])+timedelta(days=days)
        end=end_override or date.fromisoformat(source['target_date'])+timedelta(days=days)
    except (ValueError,OverflowError) as exc:raise HTTPException(422,'Fechas fuera del calendario admitido') from exc
    errors=[];by_id={i['id']:i for i in items}
    if end<start:errors.append('El fin no puede ser anterior al inicio')
    for dep in source['dependencies']:
        pred=by_id.get(dep)
        if not pred or pred['archived'] or not pred['target_date']:errors.append('Predecesor sin fecha válida')
        elif date.fromisoformat(pred['target_date'])>=start:errors.append(f"{pred['code']}: el inicio debe ser posterior al fin del predecesor")
    for child in items:
        if not child['archived'] and identity in child['dependencies']:
            if not child['start_date']:errors.append(f"{child['code']}: sucesor sin inicio")
            elif end>=date.fromisoformat(child['start_date']):errors.append(f"{child['code']}: el fin debe preceder al inicio del sucesor")
    fingerprint=hashlib.sha256(json.dumps([project_id,identity,days,start,end,items],sort_keys=True,default=str).encode()).hexdigest()
    return {'fingerprint':fingerprint,'errors':errors,'id':identity,'old_start':source['start_date'],'old_end':source['target_date'],'start':start.isoformat(),'end':end.isoformat(),'days':days}

@router.post('/items/{identity}/shift-preview')
def preview_shift(project_id:str,identity:str,value:Shift):
    with connection() as db:
        db.execute('BEGIN')
        return shift_proposal(scheduler.snapshot(db,project_id),identity,value.days,project_id)

@router.post('/items/{identity}/shift-apply')
def apply_shift(project_id:str,identity:str,value:Shift):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        items=scheduler.snapshot(db,project_id)
        result=shift_proposal(items,identity,value.days,project_id)
        if value.fingerprint!=result['fingerprint']:raise HTTPException(409,'El plan cambió; vuelve a revisar el movimiento')
        if result['errors']:raise HTTPException(422,'El movimiento rompe dependencias')
        old=master.item(db,project_id,identity)
        if value.days:
            db.execute('UPDATE master_items SET start_date=?,target_date=?,version=version+1,updated_at=? WHERE id=?',(result['start'],result['end'],master.now(),identity))
            master.audit(db,project_id,identity,'mover_barra_cronograma',old,master.item(db,project_id,identity))
        return result

class DateRange(BaseModel):
    start:date
    end:date
    fingerprint:str|None=Field(default=None,min_length=64,max_length=64)

@router.post('/items/{identity}/dates-preview')
def preview_dates(project_id:str,identity:str,value:DateRange):
    with connection() as db:
        db.execute('BEGIN')
        return shift_proposal(scheduler.snapshot(db,project_id),identity,0,project_id,value.start,value.end)

@router.post('/items/{identity}/dates-apply')
def apply_dates(project_id:str,identity:str,value:DateRange):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        result=shift_proposal(scheduler.snapshot(db,project_id),identity,0,project_id,value.start,value.end)
        if value.fingerprint!=result['fingerprint']:raise HTTPException(409,'El plan cambió; vuelve a revisar las fechas')
        if result['errors']:raise HTTPException(422,'Las fechas incumplen las reglas del cronograma')
        old=master.item(db,project_id,identity)
        if (result['start'],result['end'])!=(result['old_start'],result['old_end']):
            db.execute('UPDATE master_items SET start_date=?,target_date=?,version=version+1,updated_at=? WHERE id=?',(result['start'],result['end'],master.now(),identity))
            master.audit(db,project_id,identity,'ajustar_fechas_cronograma',old,master.item(db,project_id,identity))
        return result
