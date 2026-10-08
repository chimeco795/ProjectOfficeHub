"""Manual minutes and explicit human review. No AI provider is configured."""
import json
from datetime import date
from pathlib import Path
from typing import Literal
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator
from ..db import connection, encode
from ..domain.master import ItemInput
from ..services import master
from .pmo import scoped

router = APIRouter(prefix='/api/projects/{project_id}', tags=['Meeting minutes'])

class MinuteInput(BaseModel):
    document_id: str

class ProposalInput(BaseModel):
    kind: Literal['decision','agreement','action','risk','blocker','next_step','achievement','change']
    text: str = Field(min_length=1, max_length=10000)
    evidence: str = Field(default='', max_length=10000)
    owner_id: str | None = None
    target_date: date | None = None
    @model_validator(mode='after')
    def nonblank(self):
        self.text=self.text.strip()
        if not self.text:raise ValueError('La propuesta requiere contenido')
        return self

class Review(BaseModel):
    version: int = Field(ge=1)
    action: Literal['link','create','decision','ignore']
    item_id: str | None = None
    new_item: ItemInput | None = None
    executive_candidate: bool = False
    reviewer_id: str | None = None

def detail(db, pid, identity):
    minute=scoped(db,'meeting_minutes',pid,identity)
    minute['participants']=json.loads(minute['participants'])
    minute['proposals']=[dict(r) for r in db.execute('SELECT * FROM minute_proposals WHERE minute_id=? ORDER BY created_at,id',(identity,))]
    minute['document']=dict(db.execute('SELECT id,filename,size,created_at FROM documents WHERE id=?',(minute['document_id'],)).fetchone())
    return minute

@router.get('/events/{event_id}/minutes')
def minutes(project_id:str,event_id:str):
    with connection() as db:
        scoped(db,'events',project_id,event_id)
        return [detail(db,project_id,r['id']) for r in db.execute('SELECT id FROM meeting_minutes WHERE event_id=? ORDER BY created_at',(event_id,))]

@router.post('/events/{event_id}/minutes',status_code=201)
def attach_minute(project_id:str,event_id:str,value:MinuteInput):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        event=scoped(db,'events',project_id,event_id)
        document=scoped(db,'documents',project_id,value.document_id)
        if Path(document['filename']).suffix.lower() not in ('.txt','.docx'):raise HTTPException(422,'La minuta debe ser TXT o DOCX')
        previous=db.execute('SELECT id FROM meeting_minutes WHERE event_id=? AND document_id=?',(event_id,value.document_id)).fetchone()
        if previous:return detail(db,project_id,previous['id'])
        identity=master.uid();participants=list(dict.fromkeys(([event['owner_id']] if event['owner_id'] else [])+json.loads(event['guests'])))
        db.execute('INSERT INTO meeting_minutes(id,project_id,event_id,document_id,meeting_date,participants,created_at) VALUES(?,?,?,?,?,?,?)',(identity,project_id,event_id,value.document_id,event['date'],encode(participants),master.now()))
        db.execute("INSERT OR IGNORE INTO document_links VALUES(?,'event',?)",(value.document_id,event_id))
        db.execute('UPDATE documents SET version=version+1 WHERE id=?',(value.document_id,))
        saved=detail(db,project_id,identity);master.audit(db,project_id,identity,'adjuntar_minuta',{},saved)
        return saved

@router.post('/minutes/{minute_id}/proposals',status_code=201)
def propose(project_id:str,minute_id:str,value:ProposalInput):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');scoped(db,'meeting_minutes',project_id,minute_id)
        if value.owner_id and not db.execute('SELECT 1 FROM project_people WHERE project_id=? AND person_id=?',(project_id,value.owner_id)).fetchone():raise HTTPException(422,'Responsable ajeno al proyecto')
        identity=master.uid()
        db.execute('INSERT INTO minute_proposals(id,project_id,minute_id,kind,text,evidence,owner_id,target_date,created_at) VALUES(?,?,?,?,?,?,?,?,?)',(identity,project_id,minute_id,value.kind,value.text,value.evidence,value.owner_id,value.target_date.isoformat() if value.target_date else None,master.now()))
        saved=scoped(db,'minute_proposals',project_id,identity);master.audit(db,project_id,identity,'propuesta_manual_minuta',{},saved);return saved

@router.post('/minute-proposals/{identity}/review')
def review(project_id:str,identity:str,value:Review):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');old=scoped(db,'minute_proposals',project_id,identity)
        if old['version']!=value.version or old['status']!='pending':raise HTTPException(409,'La propuesta ya cambió o fue revisada')
        if value.reviewer_id and not db.execute('SELECT 1 FROM project_people WHERE project_id=? AND person_id=?',(project_id,value.reviewer_id)).fetchone():raise HTTPException(422,'Revisor ajeno al proyecto')
        linked=None;decision=None
        if value.action=='link':
            if not value.item_id or value.new_item:raise HTTPException(422,'Selecciona un elemento existente')
            linked=master.item(db,project_id,value.item_id)
            if linked['archived']:raise HTTPException(422,'El elemento está archivado')
        elif value.action=='create':
            if not value.new_item or value.item_id:raise HTTPException(422,'Revisa los datos del nuevo elemento')
            linked=master.save_item(db,project_id,value.new_item)
        elif value.action=='decision':
            decision=master.uid()
            db.execute('INSERT INTO meeting_decisions(id,project_id,proposal_id,text,owner_id,target_date,created_at) VALUES(?,?,?,?,?,?,?)',(decision,project_id,identity,old['text'],old['owner_id'],old['target_date'],master.now()))
        if value.action in ('ignore','decision') and (value.item_id or value.new_item):raise HTTPException(422,'Acción incompatible con un elemento')
        if value.action=='ignore' and value.executive_candidate:raise HTTPException(422,'Una propuesta ignorada no puede ser candidata')
        if linked:
            minute=scoped(db,'meeting_minutes',project_id,old['minute_id'])
            inserted=db.execute("INSERT OR IGNORE INTO document_links VALUES(?,'item',?)",(minute['document_id'],linked['id'])).rowcount
            if inserted:db.execute('UPDATE documents SET version=version+1 WHERE id=?',(minute['document_id'],))
            if value.executive_candidate and not linked['include_in_report']:
                previous=linked
                db.execute('UPDATE master_items SET include_in_report=1,version=version+1,updated_at=? WHERE id=?',(master.now(),linked['id']))
                master.audit(db,project_id,linked['id'],'candidato_desde_minuta',previous,master.item(db,project_id,linked['id']))
        db.execute('UPDATE minute_proposals SET status=?,review_action=?,item_id=?,decision_id=?,executive_candidate=?,reviewer_id=?,reviewed_at=?,version=version+1 WHERE id=?',('ignored' if value.action=='ignore' else 'accepted',value.action,linked['id'] if linked else None,decision,value.executive_candidate,value.reviewer_id,master.now(),identity))
        saved=scoped(db,'minute_proposals',project_id,identity);master.audit(db,project_id,identity,'revisar_propuesta_minuta',old,saved);return saved

@router.get('/minute-contract')
def extension_contract(project_id:str):
    with connection() as db:master.require(db,'projects',project_id)
    return {'provider':None,'automatic_extraction':False,'input':['txt','docx'],'proposal_kinds':list(ProposalInput.model_fields['kind'].annotation.__args__),'review_required':True,'write_endpoint':'/minutes/{minute_id}/proposals','note':'La extensión futura genera propuestas; nunca aplica cambios al maestro sin revisión explícita.'}
