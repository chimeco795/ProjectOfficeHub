import hashlib
import json
import sqlite3
from contextlib import asynccontextmanager
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, Field, model_validator
from .db import connection, initialize, encode
from .importers import parse, SECTIONS, ALIASES
from .validation import validate_values, generated

def now():return datetime.now(timezone.utc).isoformat()
def uid():return str(uuid4())

@asynccontextmanager
async def lifespan(app):
    initialize()
    yield

app=FastAPI(title='Project Office Hub',version='0.8.0',lifespan=lifespan)
from .api.projects import router as projects_router
app.include_router(projects_router)
from .api.master import router as master_router
from .services import master as master_service
app.include_router(master_router)
from .api.pmo import router as pmo_router
app.include_router(pmo_router)
from .api.migration import router as migration_router
app.include_router(migration_router)
from .api.schedule import router as schedule_router
app.include_router(schedule_router)
app.add_middleware(TrustedHostMiddleware,allowed_hosts=['127.0.0.1','localhost','testserver'])

class Cut(BaseModel):
    report_date:date
    start_date:date|None=None
    end_date:date|None=None
    copy_from:str|None=None
    from_master:bool=False
    @model_validator(mode='after')
    def check(self):
        if self.copy_from and self.from_master:raise ValueError('Selecciona un único origen del corte')
        if self.start_date and self.end_date and self.start_date>self.end_date:raise ValueError('Inicio posterior al fin')
        return self

class Review(BaseModel):
    version:int=Field(ge=1)
    current:dict
    review:Literal['pendiente','aceptado','dudoso','eliminado']
    section:str
    @model_validator(mode='after')
    def check(self):
        if self.section not in SECTIONS:raise ValueError('Sección desconocida')
        if len(encode(self.current))>100000:raise ValueError('Registro demasiado grande')
        validate_values(self.current)
        for key in ['planned','actual','confidence_percent']:
            val=self.current.get(key)
            if val is not None and (isinstance(val,bool) or not isinstance(val,(int,float)) or not 0<=val<=100):raise ValueError(f'{key} debe estar entre 0 y 100')
        return self

def require(db,table,id):
    row=db.execute(f'SELECT * FROM {table} WHERE id=?',(id,)).fetchone()
    if not row:raise HTTPException(404,'No encontrado')
    return row

def editable(db,cut_id):
    row=require(db,'cuts',cut_id)
    if row['status']=='publicado':raise HTTPException(409,'Este corte está publicado y es de solo lectura. Crea otro corte para continuar.')
    return row

@app.get('/api/health')
def health():return {'status':'ok','version':'0.8.0','product':'Project Office Hub'}

@app.get('/api/schema')
def schema():return {'sections':SECTIONS,'aliases':ALIASES}

@app.get('/api/projects/{project_id}/cuts')
def cuts(project_id:str):
    with connection() as db:
        require(db,'projects',project_id)
        result=[]
        for row in db.execute('SELECT * FROM cuts WHERE project_id=? ORDER BY report_date DESC',(project_id,)):
            cut=dict(row)
            cut['metadata']=json.loads(cut['metadata'])
            cut['record_count']=db.execute("SELECT COUNT(*) FROM records WHERE cut_id=? AND review!='eliminado'",(cut['id'],)).fetchone()[0]
            cut['pending_count']=db.execute("SELECT COUNT(*) FROM records WHERE cut_id=? AND review IN ('pendiente','dudoso')",(cut['id'],)).fetchone()[0]
            result.append(cut)
        return result

@app.post('/api/projects/{project_id}/cuts',status_code=201)
def create_cut(project_id:str,value:Cut):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        project=dict(require(db,'projects',project_id));id=uid()
        if value.copy_from:
            parent=require(db,'cuts',value.copy_from)
            if parent['project_id']!=project_id:raise HTTPException(422,'El corte de origen pertenece a otro proyecto.')
            if str(value.report_date)<=parent['report_date']:raise HTTPException(422,'La nueva semana debe tener una fecha posterior al corte de origen.')
        try:db.execute('INSERT INTO cuts(id,project_id,report_date,start_date,end_date,created_at,project_snapshot) VALUES(?,?,?,?,?,?,?)',(id,project_id,str(value.report_date),str(value.start_date) if value.start_date else None,str(value.end_date) if value.end_date else None,now(),encode(project)))
        except sqlite3.IntegrityError:raise HTTPException(409,'Ya existe un corte con esa fecha. Selecciónelo para importar.')
        if value.copy_from:
            source_ids={}
            for source in db.execute('SELECT * FROM sources WHERE cut_id=?',(value.copy_from,)).fetchall():
                sid=uid();source_ids[source['id']]=sid
                db.execute('INSERT INTO sources VALUES(?,?,?,?,?,?,?,?,?)',(sid,id,source['filename'],source['kind'],source['sha256'],source['uploaded_at'],source['original_file'],source['mapping'],source['warnings']))
            for row in db.execute("SELECT * FROM records WHERE cut_id=? AND review!='eliminado' AND section!='avance'",(value.copy_from,)).fetchall():
                db.execute('INSERT INTO records(id,cut_id,source_id,section,location,original,current,generated,review,modified,parent_record_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)',(uid(),id,source_ids.get(row['source_id']),row['section'],row['location'],row['original'],row['current'],row['generated'],'pendiente',row['modified'],row['id']))
            db.execute('INSERT INTO cut_audit(cut_id,changed_at,event,previous,next) VALUES(?,?,?,?,?)',(id,now(),'copiar',encode({'copy_from':value.copy_from}),'{}'))
        if value.copy_from:master_service.copy_bindings(db,id)
        if value.from_master:master_service.from_master(db,project_id,id)
        db.execute('UPDATE cuts SET updated_at=? WHERE id=?',(now(),id))
        db.execute('INSERT INTO cut_audit(cut_id,changed_at,event,previous,next) VALUES(?,?,?,?,?)',(id,now(),'crear','{}',encode(value.model_dump(mode='json'))))
        return dict(require(db,'cuts',id))

@app.get('/api/cuts/{cut_id}')
def detail(cut_id:str):
    with connection() as db:
        cut=dict(require(db,'cuts',cut_id))
        cut['metadata']=json.loads(cut['metadata'])
        cut['project_snapshot']=json.loads(cut['project_snapshot'])
        sources=[dict(r) for r in db.execute('SELECT id,filename,kind,sha256,uploaded_at,mapping,warnings FROM sources WHERE cut_id=? ORDER BY uploaded_at',(cut_id,))]
        for s in sources:
            for key in ['mapping','warnings']:s[key]=json.loads(s[key])
        records=[dict(r) for r in db.execute('SELECT * FROM records WHERE cut_id=? ORDER BY rowid',(cut_id,))]
        for r in records:
            for key in ['original','current','generated']:r[key]=json.loads(r[key])
        return {'cut':cut,'sources':sources,'records':records}

@app.get('/api/projects/{project_id}/cuts/{cut_id}')
def project_cut_detail(project_id: str, cut_id: str):
    with connection() as db:
        require(db, 'projects', project_id)
        cut = require(db, 'cuts', cut_id)
        if cut['project_id'] != project_id:
            raise HTTPException(404, 'Corte no encontrado en este proyecto')
    return detail(cut_id)

@app.post('/api/cuts/{cut_id}/imports',status_code=201)
async def import_file(cut_id:str,file:UploadFile=File(...),mapping:str=Form('{}')):
    extension=Path(file.filename or '').suffix.lower()
    if extension not in ['.docx','.xlsx']:raise HTTPException(415,'Use archivos .docx o .xlsx.')
    data=await file.read(15*1024*1024+1)
    await file.close()
    if len(data)>15*1024*1024:raise HTTPException(413,'Límite: 15 MB por archivo.')
    try:
        config=json.loads(mapping)
        if not isinstance(config,dict) or any(not isinstance(v,dict) for v in config.values()):raise ValueError('El mapeo debe ser un objeto por hoja.')
        for value in config.values():
            if not isinstance(value.get('columns',{}),dict):raise ValueError('columns debe ser un objeto.')
        records,warnings=parse(data,extension,config)
    except Exception as exc:
        raise HTTPException(422,f'No se pudo leer el documento: {str(exc)[:250]}')
    if not records:raise HTTPException(422,'No se encontraron registros en el documento.')
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        editable(db,cut_id)
        hash=hashlib.sha256(data).hexdigest()
        if db.execute('SELECT id FROM sources WHERE cut_id=? AND sha256=?',(cut_id,hash)).fetchone():raise HTTPException(409,'Este archivo ya fue importado en este corte. Sus correcciones se conservan.')
        sid=uid()
        db.execute('INSERT INTO sources VALUES(?,?,?,?,?,?,?,?,?)',(sid,cut_id,Path(file.filename).name,extension[1:],hash,now(),data,encode(config),encode(warnings)))
        for r in records:
            db.execute('INSERT INTO records(id,cut_id,source_id,section,location,original,current,review) VALUES(?,?,?,?,?,?,?,?)',(uid(),cut_id,sid,r['section'],r['location'],encode(r['original']),encode(r['current']),r['review']))
        db.execute('INSERT INTO cut_audit(cut_id,changed_at,event,previous,next) VALUES(?,?,?,?,?)',(cut_id,now(),'importar','{}',encode({'source_id':sid,'filename':Path(file.filename).name,'sha256':hash,'count':len(records),'warnings':warnings})))
        return {'source_id':sid,'count':len(records),'warnings':warnings}

@app.patch('/api/records/{record_id}')
def review_record(record_id:str,value:Review):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        return update_record(db,record_id,value)

def update_record(db,record_id,value):
        old=dict(require(db,'records',record_id))
        editable(db,old['cut_id'])
        if old['version']!=value.version:raise HTTPException(409,'Este registro cambió en otra ventana. Recargue antes de guardar.')
        link=db.execute('SELECT master_snapshot FROM weekly_item_snapshots WHERE record_id=?',(record_id,)).fetchone()
        if link and master_service.SECTIONS[json.loads(link['master_snapshot'])['kind']]!=value.section:
            raise HTTPException(422,'Desvincula el registro antes de cambiar su sección')
        calculated=generated(value.current)
        changed=int(bool(old['modified']) or json.loads(old['current'])!=value.current or old['section']!=value.section)
        result=db.execute('UPDATE records SET current=?,generated=?,review=?,section=?,modified=?,version=version+1 WHERE id=? AND version=?',(encode(value.current),encode(calculated),value.review,value.section,changed,record_id,value.version))
        if not result.rowcount:raise HTTPException(409,'Conflicto de edición. Recargue.')
        db.execute('INSERT INTO audit(record_id,changed_at,previous,next) VALUES(?,?,?,?)',(record_id,now(),encode(old),encode(value.model_dump())))
        return {'saved':True,'version':value.version+1}

@app.get('/api/records/{record_id}/audit')
def audit(record_id:str):
    with connection() as db:
        require(db,'records',record_id)
        return [dict(r) for r in db.execute('SELECT * FROM audit WHERE record_id=? ORDER BY id',(record_id,))]

class ManualRecord(Review):
    version:int=1
    review:Literal['pendiente','aceptado','dudoso','eliminado']='aceptado'

class BatchItem(Review):
    id:str

class Batch(BaseModel):
    records:list[BatchItem]=Field(min_length=1,max_length=500)

class PMP(BaseModel):
    schedule:Literal['Sin definir','Verde','Amarillo','Rojo']='Sin definir'
    scope:Literal['Sin definir','Verde','Amarillo','Rojo']='Sin definir'
    quality:Literal['Sin definir','Verde','Amarillo','Rojo']='Sin definir'
    risks:Literal['Sin definir','Verde','Amarillo','Rojo']='Sin definir'
    resources:Literal['Sin definir','Verde','Amarillo','Rojo']='Sin definir'
    dependencies:Literal['Sin definir','Verde','Amarillo','Rojo']='Sin definir'

class WeeklyMetadata(BaseModel):
    report_brand:str=Field(default='',max_length=80)
    brand_logo:str=Field(default='',max_length=420000,pattern=r'^(data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+)?$')
    report_title:str=Field(default='',max_length=200)
    report_subtitle:str=Field(default='',max_length=200)
    scope_comment:str=''
    risks_comment:str=''
    budget_comment:str=''
    budget_status:Literal['Sin definir','Verde','Amarillo','Rojo']='Sin definir'
    pmp_comment:str=''
    exposure_comment:str=''
    milestones_comment:str=''
    deviation_comment:str=''
    planned:float|None=Field(default=None,ge=0,le=100,allow_inf_nan=False)
    actual:float|None=Field(default=None,ge=0,le=100,allow_inf_nan=False)
    executive_comment:str=''
    semaphore:Literal['Sin definir','Verde','Amarillo','Rojo']='Sin definir'
    confidence_level:Literal['Sin definir','Alta','Media-Alta','Media','Media-Baja','Baja']='Sin definir'
    confidence_percent:float|None=Field(default=None,ge=0,le=100,allow_inf_nan=False)
    go_live_comment:str=''
    forecast_date:date|None=None
    pmp:PMP=Field(default_factory=PMP)

class CutUpdate(BaseModel):
    version:int=Field(ge=1)
    metadata:WeeklyMetadata
    start_date:date|None=None
    end_date:date|None=None
    @model_validator(mode='after')
    def check(self):
        if self.start_date and self.end_date and self.start_date>self.end_date:raise ValueError('Inicio posterior al fin.')
        return self

class Version(BaseModel):
    version:int=Field(ge=1)

@app.post('/api/cuts/{cut_id}/records',status_code=201)
def manual_record(cut_id:str,value:ManualRecord):
    if not str(value.current.get('description','')).strip():raise HTTPException(422,'Descripción requerida para un registro manual.')
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');editable(db,cut_id);id=uid()
        db.execute('INSERT INTO records(id,cut_id,section,location,original,current,generated,review) VALUES(?,?,?,?,?,?,?,?)',(id,cut_id,value.section,'Agregado manualmente','{}',encode(value.current),encode(generated(value.current)),value.review))
        db.execute('INSERT INTO audit(record_id,changed_at,previous,next) VALUES(?,?,?,?)',(id,now(),'{}',encode(value.model_dump())))
        return {'id':id}

@app.patch('/api/cuts/{cut_id}/records')
def batch_records(cut_id:str,value:Batch):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');editable(db,cut_id)
        if len({r.id for r in value.records})!=len(value.records):raise HTTPException(422,'Registros duplicados en el lote.')
        for row in value.records:
            if require(db,'records',row.id)['cut_id']!=cut_id:raise HTTPException(422,'El registro no pertenece a este corte.')
            update_record(db,row.id,row)
        return {'saved':len(value.records)}

@app.put('/api/cuts/{cut_id}')
def update_cut(cut_id:str,value:CutUpdate):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');old=dict(editable(db,cut_id))
        if old['version']!=value.version:raise HTTPException(409,'El corte cambió. Recarga antes de guardar.')
        metadata=value.metadata.model_dump(mode='json')
        db.execute('UPDATE cuts SET metadata=?,start_date=?,end_date=?,updated_at=?,version=version+1 WHERE id=?',(encode(metadata),str(value.start_date) if value.start_date else None,str(value.end_date) if value.end_date else None,now(),cut_id))
        db.execute('INSERT INTO cut_audit(cut_id,changed_at,event,previous,next) VALUES(?,?,?,?,?)',(cut_id,now(),'editar',encode(old),encode(value.model_dump(mode='json'))))
        return {'saved':True}

@app.post('/api/cuts/{cut_id}/publish')
def publish_cut(cut_id:str,value:Version):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');old=dict(editable(db,cut_id))
        if old['version']!=value.version:raise HTTPException(409,'El corte cambió. Recarga antes de publicar.')
        pending=db.execute("SELECT COUNT(*) FROM records WHERE cut_id=? AND review IN ('pendiente','dudoso')",(cut_id,)).fetchone()[0]
        if pending:raise HTTPException(422,f'Revisa los {pending} registros pendientes o dudosos antes de publicar.')
        master_service.freeze(db,cut_id)
        snapshot=dict(require(db,'projects',old['project_id']))
        from .migrations import history_points
        points=[p for p in history_points(db,cut_id) if p['status']=='publicado' or p['id']==cut_id]
        for point in points:
            if point['id']==cut_id:point['status']='publicado'
        stamp=now()
        db.execute("UPDATE cuts SET status='publicado',published_at=?,updated_at=?,project_snapshot=?,history_snapshot=?,version=version+1 WHERE id=?",(stamp,stamp,encode(snapshot),encode(points),cut_id))
        db.execute('INSERT INTO cut_audit(cut_id,changed_at,event,previous,next) VALUES(?,?,?,?,?)',(cut_id,now(),'publicar',encode(old),encode({'status':'publicado','project_snapshot':snapshot})))
        return {'published':True}

@app.get('/api/cuts/{cut_id}/audit')
def cut_audit(cut_id:str):
    with connection() as db:
        require(db,'cuts',cut_id)
        return [dict(row) for row in db.execute('SELECT * FROM cut_audit WHERE cut_id=? ORDER BY id',(cut_id,))]

@app.get('/api/projects/{project_id}/cuts/{cut_id}/report-history')
def project_report_history(project_id:str,cut_id:str):
    with connection() as db:
        cut=require(db,'cuts',cut_id)
        if cut['project_id']!=project_id:raise HTTPException(404,'Corte ajeno al proyecto')
    return report_history(cut_id)

@app.get('/api/cuts/{cut_id}/report-history')
def report_history(cut_id:str):
    with connection() as db:
        cut=require(db,'cuts',cut_id)
        if cut['status']=='publicado':
            return json.loads(cut['history_snapshot']) if cut['history_snapshot'] is not None else []
        from .migrations import history_points
        return [p for p in history_points(db,cut_id) if p['status']=='publicado' or p['id']==cut_id]

@app.get('/api/cuts/{cut_id}/timeline')
def timeline(cut_id:str):
    with connection() as db:
        require(db,'cuts',cut_id)
        events=[dict(r) for r in db.execute('SELECT id,changed_at,event,previous,next FROM cut_audit WHERE cut_id=?',(cut_id,))]
        for r in db.execute('SELECT a.*,r.section,r.location FROM audit a JOIN records r ON r.id=a.record_id WHERE r.cut_id=?',(cut_id,)):
            events.append({**dict(r),'event':'registro'})
        return sorted(events,key=lambda e:(e['changed_at'],e['id']))

dist=Path(__file__).resolve().parents[2]/'frontend'/'dist'
if dist.exists():app.mount('/',StaticFiles(directory=dist,html=True),name='frontend')
