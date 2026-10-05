from decimal import Decimal
import hashlib
import json
from urllib.parse import quote
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import ValidationError, BaseModel
from ..db import connection, encode
from ..domain.pmo import Period,Team,Membership,Budget,Entry,Event,DocumentUpdate
from ..services.master import require,item,audit,uid,now

router=APIRouter(prefix='/api',tags=['PMO'])
CONFIG={'periods':('planning_periods',Period),'teams':('teams',Team),'memberships':('memberships',Membership),
    'entries':('budget_entries',Entry),'events':('events',Event)}

def scoped(db,table,pid,identity):
    value=require(db,table,identity)
    if table=='teams':
        valid=db.execute('SELECT 1 FROM project_teams WHERE project_id=? AND team_id=?',(pid,identity)).fetchone()
    else:valid=value['project_id']==pid
    if not valid:raise HTTPException(404,'Registro ajeno al proyecto')
    return value

def decode(value):
    result=dict(value)
    if 'guests' in result:result['guests']=json.loads(result['guests'])
    for key in ('approved','contingency','amount'):
        if key+'_cents' in result:result[key]=format(Decimal(result.pop(key+'_cents'))/100,'.2f')
    return result

def validate_refs(db,pid,values):
    for key in ('owner_id','person_id'):
        person=getattr(values,key,None)
        if person and not db.execute('SELECT 1 FROM project_people WHERE project_id=? AND person_id=?',(pid,person)).fetchone():
            raise HTTPException(422,'La persona debe estar asignada al proyecto')
    if getattr(values,'lead_id',None):require(db,'people',values.lead_id)
    if getattr(values,'team_id',None):scoped(db,'teams',pid,values.team_id)
    if getattr(values,'related_id',None):item(db,pid,values.related_id)
    for guest in getattr(values,'guests',[]):
        if not db.execute('SELECT 1 FROM project_people WHERE project_id=? AND person_id=?',(pid,guest)).fetchone():
            raise HTTPException(422,'Invitado ajeno al proyecto')

@router.get('/projects/{project_id}/pmo/{collection}')
def listing(project_id:str,collection:str):
    if collection not in CONFIG:raise HTTPException(404,'Módulo desconocido')
    table,_=CONFIG[collection]
    with connection() as db:
        require(db,'projects',project_id)
        if table=='teams':rows=db.execute('SELECT t.* FROM teams t JOIN project_teams p ON p.team_id=t.id WHERE p.project_id=?',(project_id,))
        else:rows=db.execute(f'SELECT * FROM {table} WHERE project_id=? ORDER BY id',(project_id,))
        return [decode(row) for row in rows]

@router.post('/projects/{project_id}/pmo/{collection}',status_code=201)
def create(project_id:str,collection:str,value:dict):return save(project_id,collection,value)

@router.put('/projects/{project_id}/pmo/{collection}/{identity}')
def update(project_id:str,collection:str,identity:str,value:dict):return save(project_id,collection,value,identity)

def save(pid,collection,value,identity=None):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        return save_record(db,pid,collection,value,identity)

def save_record(db,pid,collection,value,identity=None):
    if collection not in CONFIG:raise HTTPException(404,'Módulo desconocido')
    table,model=CONFIG[collection]
    try:values=model.model_validate(value)
    except ValidationError as exc:raise HTTPException(422,str(exc)) from exc
    require(db,'projects',pid)
    old=scoped(db,table,pid,identity) if identity else {}
    if old and old['version']!=values.version:raise HTTPException(409,'El registro cambió; recarga antes de guardar')
    validate_refs(db,pid,values)
    if table=='planning_periods' and old and old['kind']!=values.kind:
        raise HTTPException(422,'El tipo de periodo no puede cambiar')
    fields=values.model_dump(mode='json');fields.pop('version')
    for key in ('name','title','concept','category','role','kind'):
        if key in fields:
            fields[key]=fields[key].strip()
            if not fields[key]:raise HTTPException(422,'Los campos de texto obligatorios no pueden quedar vacíos')
    if 'amount' in fields:fields['amount_cents']=int(values.amount*100);del fields['amount']
    if 'guests' in fields:fields['guests']=encode(fields['guests'])
    if table=='planning_periods':fields['updated_at']=now()
    if old:
        db.execute(f"UPDATE {table} SET "+','.join(f'{k}=?' for k in fields)+',version=version+1 WHERE id=?',(*fields.values(),identity))
    else:
        identity=uid();fields['id']=identity
        if table!='teams':fields['project_id']=pid
        if table=='planning_periods':fields['created_at']=fields['updated_at']
        db.execute(f"INSERT INTO {table} ("+','.join(fields)+') VALUES ('+','.join('?' for _ in fields)+')',tuple(fields.values()))
        if table=='teams':db.execute('INSERT INTO project_teams VALUES(?,?)',(pid,identity))
    saved=decode(require(db,table,identity));audit(db,pid,identity,'actualizar_'+collection if old else 'crear_'+collection,decode(old),saved)
    return saved

@router.get('/teams')
def teams():
    with connection() as db:return [dict(r) for r in db.execute('SELECT * FROM teams ORDER BY name')]

class Assign(BaseModel):
    team_id:str

@router.post('/projects/{project_id}/teams/assign')
def assign_team(project_id:str,value:Assign):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');require(db,'projects',project_id);team=require(db,'teams',value.team_id)
        if db.execute('INSERT OR IGNORE INTO project_teams VALUES(?,?)',(project_id,value.team_id)).rowcount:
            audit(db,project_id,value.team_id,'asignar_equipo',{},team)
        return team

@router.get('/projects/{project_id}/budget')
def budget(project_id:str):
    with connection() as db:
        require(db,'projects',project_id)
        row=db.execute('SELECT * FROM budgets WHERE project_id=?',(project_id,)).fetchone()
        totals={}
        for entry in db.execute('SELECT currency,kind,SUM(amount_cents) total FROM budget_entries WHERE project_id=? AND archived=0 GROUP BY currency,kind',(project_id,)):
            totals.setdefault(entry['currency'],{})[entry['kind']]=format(Decimal(entry['total'])/100,'.2f')
        return {'baseline':decode(row) if row else None,'totals':totals}

@router.put('/projects/{project_id}/budget')
def set_budget(project_id:str,value:Budget):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');require(db,'projects',project_id)
        row=db.execute('SELECT * FROM budgets WHERE project_id=?',(project_id,)).fetchone();old=dict(row) if row else {}
        if (old and old['version']!=value.version) or (not old and value.version!=0):raise HTTPException(409,'El presupuesto cambió; recarga')
        db.execute('''INSERT INTO budgets(project_id,currency,approved_cents,contingency_cents,notes) VALUES(?,?,?,?,?)
            ON CONFLICT(project_id) DO UPDATE SET currency=excluded.currency,approved_cents=excluded.approved_cents,
            contingency_cents=excluded.contingency_cents,notes=excluded.notes,version=budgets.version+1''',
            (project_id,value.currency,int(value.approved*100),int(value.contingency*100),value.notes))
        saved=decode(db.execute('SELECT * FROM budgets WHERE project_id=?',(project_id,)).fetchone())
        audit(db,project_id,project_id,'presupuesto',decode(old),saved);return saved

@router.get('/projects/{project_id}/documents')
def documents(project_id:str):
    with connection() as db:
        require(db,'projects',project_id)
        return [dict(r) for r in db.execute('SELECT id,filename,size,sha256,related_id,notes,archived,version,created_at FROM documents WHERE project_id=? ORDER BY created_at DESC',(project_id,))]

@router.post('/projects/{project_id}/documents',status_code=201)
async def upload_document(project_id:str,file:UploadFile=File(...)):
    content=await file.read(20*1024*1024+1)
    if not content or len(content)>20*1024*1024:raise HTTPException(422,'Archivo vacío o mayor a 20 MB')
    filename=(file.filename or 'documento').replace('\\','/').split('/')[-1].replace('\r','').replace('\n','')[:240] or 'documento'
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');require(db,'projects',project_id);identity=uid();digest=hashlib.sha256(content).hexdigest()
        db.execute('INSERT INTO documents(id,project_id,filename,size,sha256,content,created_at) VALUES(?,?,?,?,?,?,?)',(identity,project_id,filename,len(content),digest,content,now()))
        audit(db,project_id,identity,'subir_documento',{}, {'filename':filename,'sha256':digest,'size':len(content)})
        return {'id':identity,'filename':filename,'sha256':digest}

@router.get('/projects/{project_id}/documents/{identity}/download')
def download(project_id:str,identity:str):
    with connection() as db:
        row=scoped(db,'documents',project_id,identity)
        return Response(row['content'],media_type='application/octet-stream',headers={'Content-Disposition':"attachment; filename*=UTF-8''"+quote(row['filename'],safe=''),'X-Content-Type-Options':'nosniff'})

@router.put('/projects/{project_id}/documents/{identity}')
def edit_document(project_id:str,identity:str,value:DocumentUpdate):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');old=scoped(db,'documents',project_id,identity)
        if old['version']!=value.version:raise HTTPException(409,'El documento cambió; recarga')
        validate_refs(db,project_id,value)
        db.execute('UPDATE documents SET related_id=?,notes=?,archived=?,version=version+1 WHERE id=?',(value.related_id,value.notes,value.archived,identity))
        old.pop('content');audit(db,project_id,identity,'editar_documento',old,value.model_dump(mode='json'))
        return {'saved':True}
