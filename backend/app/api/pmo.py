from decimal import Decimal
import datetime
import hashlib
import json
from urllib.parse import quote
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
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
    for key in ('guests','document_ids'):
        if key in result:result[key]=json.loads(result[key])
    for key in ('approved','contingency','amount'):
        if key+'_cents' in result:result[key]=format(Decimal(result.pop(key+'_cents'))/100,'.2f')
    return result

def validate_refs(db,pid,values):
    for key in ('owner_id','person_id'):
        person=getattr(values,key,None)
        if person and not db.execute('SELECT 1 FROM project_people WHERE project_id=? AND person_id=?',(pid,person)).fetchone():
            raise HTTPException(422,'La persona debe estar asignada al proyecto')
    if getattr(values,'author_id',None):require(db,'people',values.author_id)
    for identity in getattr(values,'document_ids',[]):scoped(db,'documents',pid,identity)
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
    for key in ('guests','document_ids'):
        if key in fields:fields[key]=encode(list(dict.fromkeys(fields[key])))
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
        return [dict(r) for r in db.execute('SELECT id,filename,size,sha256,related_id,notes,archived,version,created_at,author_id,source_id FROM documents WHERE project_id=? ORDER BY created_at DESC',(project_id,))]

@router.get('/projects/{project_id}/document-library')
def document_library(project_id:str):
    """One presentation entry per content hash; originals and snapshots stay in place."""
    with connection() as db:
        require(db,'projects',project_id)
        grouped={}
        for row in db.execute('SELECT id,filename,size,sha256,related_id,notes,archived,version,created_at,author_id,source_id FROM documents WHERE project_id=? ORDER BY archived,created_at DESC',(project_id,)):
            doc=dict(row)
            reference={'kind':'document','id':doc['id'],'filename':doc['filename'],'archived':bool(doc['archived']),'related_id':doc['related_id']}
            if doc['sha256'] not in grouped:
                grouped[doc['sha256']]={**doc,'document_archived':bool(doc['archived']),'origin':'document','references':[],'download_url':f"/api/projects/{project_id}/documents/{doc['id']}/download"}
            grouped[doc['sha256']]['references'].append(reference)
        for row in db.execute("""SELECT s.id,s.filename,s.sha256,length(s.original_file) AS size,s.uploaded_at AS created_at,c.id AS cut_id,c.report_date,c.status
            FROM sources s JOIN cuts c ON c.id=s.cut_id WHERE c.project_id=? ORDER BY c.report_date DESC,s.id""",(project_id,)):
            source=dict(row)
            if source['sha256'] not in grouped:
                grouped[source['sha256']]={**source,'origin':'source','archived':False,'references':[],'download_url':f"/api/projects/{project_id}/source-files/{source['id']}/download"}
            entry=grouped[source['sha256']]
            # A file still used by a report remains discoverable in the active library.
            entry['archived']=False
            entry['references'].append({'kind':'source','id':source['id'],'filename':source['filename'],'cut_id':source['cut_id'],'report_date':source['report_date'],'status':source['status']})
        return sorted(grouped.values(),key=lambda x:x['created_at'],reverse=True)

@router.get('/projects/{project_id}/source-files/{identity}/download')
def download_source(project_id:str,identity:str):
    with connection() as db:
        row=db.execute('SELECT s.* FROM sources s JOIN cuts c ON c.id=s.cut_id WHERE s.id=? AND c.project_id=?',(identity,project_id)).fetchone()
        if not row:raise HTTPException(404,'Fuente no encontrada en este proyecto')
        filename=row['filename'].replace('\\','/').split('/')[-1].replace('\r','').replace('\n','') or 'documento'
        return Response(row['original_file'],media_type='application/octet-stream',headers={'Content-Disposition':"attachment; filename*=UTF-8''"+quote(filename,safe=''),'X-Content-Type-Options':'nosniff'})

@router.post('/projects/{project_id}/documents',status_code=201)
async def upload_document(project_id:str,file:UploadFile=File(...),description:str=Form('',max_length=10000),author_id:str|None=Form(None),related_id:str|None=Form(None)):
    content=await file.read(20*1024*1024+1)
    if not content or len(content)>20*1024*1024:raise HTTPException(422,'Archivo vacío o mayor a 20 MB')
    filename=(file.filename or 'documento').replace('\\','/').split('/')[-1].replace('\r','').replace('\n','')[:240] or 'documento'
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');require(db,'projects',project_id);identity=uid();digest=hashlib.sha256(content).hexdigest()
        metadata=DocumentUpdate(notes=description,author_id=author_id or None,related_id=related_id or None)
        validate_refs(db,project_id,metadata)
        existing=db.execute('SELECT id,filename,archived FROM documents WHERE project_id=? AND sha256=? ORDER BY archived,created_at DESC LIMIT 1',(project_id,digest)).fetchone()
        if existing:
            return {'id':existing['id'],'filename':existing['filename'],'sha256':digest,'reused':True,'archived':bool(existing['archived']),'origin':'document'}
        source=db.execute('SELECT s.id,s.filename FROM sources s JOIN cuts c ON c.id=s.cut_id WHERE c.project_id=? AND s.sha256=? LIMIT 1',(project_id,digest)).fetchone()
        if source and not (description or author_id or related_id):
            return {'id':source['id'],'filename':source['filename'],'sha256':digest,'reused':True,'origin':'source'}
        db.execute('INSERT INTO documents(id,project_id,filename,size,sha256,content,created_at,notes,author_id,related_id,source_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)',(identity,project_id,filename,len(content),digest,b'' if source else content,now(),description,author_id or None,related_id or None,source['id'] if source else None))
        audit(db,project_id,identity,'subir_documento',{}, {'filename':filename,'sha256':digest,'size':len(content),'notes':description,'author_id':author_id or None,'related_id':related_id or None,'source_id':source['id'] if source else None})
        return {'id':identity,'filename':filename,'sha256':digest}

@router.get('/projects/{project_id}/documents/{identity}/download')
def download(project_id:str,identity:str):
    with connection() as db:
        row=scoped(db,'documents',project_id,identity)
        content=row['content']
        if row.get('source_id'):
            source=db.execute('SELECT s.original_file FROM sources s JOIN cuts c ON c.id=s.cut_id WHERE s.id=? AND c.project_id=?',(row['source_id'],project_id)).fetchone()
            if not source:raise HTTPException(404,'Fuente original no disponible')
            content=source['original_file']
        return Response(content,media_type='application/octet-stream',headers={'Content-Disposition':"attachment; filename*=UTF-8''"+quote(row['filename'],safe=''),'X-Content-Type-Options':'nosniff'})

@router.put('/projects/{project_id}/documents/{identity}')
def edit_document(project_id:str,identity:str,value:DocumentUpdate):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');old=scoped(db,'documents',project_id,identity)
        if old['version']!=value.version:raise HTTPException(409,'El documento cambió; recarga')
        validate_refs(db,project_id,value)
        db.execute('UPDATE documents SET related_id=?,notes=?,author_id=?,archived=?,version=version+1 WHERE id=?',(value.related_id,value.notes,value.author_id,value.archived,identity))
        old.pop('content');audit(db,project_id,identity,'editar_documento',old,value.model_dump(mode='json'))
        return {'saved':True}

class EventMove(BaseModel):
    version:int
    date: datetime.date
    time: datetime.time

@router.post('/projects/{project_id}/events/{identity}/move')
def move_event(project_id:str,identity:str,value:EventMove):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        old=decode(scoped(db,'events',project_id,identity))
        if old['archived']:raise HTTPException(422,'Restaura el evento antes de moverlo')
        return save_record(db,project_id,'events',{**old,**value.model_dump(mode='json')},identity)
