import json
from typing import Literal
from fastapi import APIRouter,HTTPException
from pydantic import BaseModel,Field
from ..db import connection
from ..services import master
from .pmo import scoped
router=APIRouter(prefix='/api/projects/{project_id}',tags=['Document relationships'])

class Link(BaseModel):
    target_kind:Literal['item','event','cut']
    target_id:str
class Links(BaseModel):
    version:int=Field(ge=1)
    links:list[Link]=Field(max_length=100)

def document_links(db,identity):
    return [dict(r) for r in db.execute('SELECT target_kind,target_id FROM document_links WHERE document_id=? ORDER BY target_kind,target_id',(identity,))]

@router.put('/documents/{identity}/links')
def save_links(project_id:str,identity:str,value:Links):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');old=scoped(db,'documents',project_id,identity)
        if old['version']!=value.version:raise HTTPException(409,'El documento cambió; recarga')
        for link in value.links:
            table={'item':'master_items','event':'events','cut':'cuts'}[link.target_kind]
            scoped(db,table,project_id,link.target_id)
        previous=document_links(db,identity)
        db.execute('DELETE FROM document_links WHERE document_id=?',(identity,))
        for link in value.links:db.execute('INSERT OR IGNORE INTO document_links VALUES(?,?,?)',(identity,link.target_kind,link.target_id))
        db.execute('UPDATE documents SET version=version+1 WHERE id=?',(identity,))
        saved=document_links(db,identity);master.audit(db,project_id,identity,'relacionar_documento',previous,saved)
        return {'links':saved,'version':old['version']+1}

@router.get('/attachments/{kind}/{identity}')
def attachments(project_id:str,kind:Literal['item','event','cut'],identity:str):
    with connection() as db:
        scoped(db,{'item':'master_items','event':'events','cut':'cuts'}[kind],project_id,identity)
        rows=[]
        for row in db.execute('SELECT id,filename,size,created_at,notes,author_id,archived,related_id FROM documents WHERE project_id=?',(project_id,)):
            linked=db.execute('SELECT 1 FROM document_links WHERE document_id=? AND target_kind=? AND target_id=?',(row['id'],kind,identity)).fetchone()
            legacy=kind=='item' and row['related_id']==identity
            if kind=='event':legacy=row['id'] in json.loads(scoped(db,'events',project_id,identity)['document_ids'])
            if linked or legacy:rows.append({**dict(row),'download_url':f"/api/projects/{project_id}/documents/{row['id']}/download"})
        return rows
