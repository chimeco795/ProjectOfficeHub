import json
from datetime import date
from uuid import UUID
from fastapi import APIRouter,HTTPException
from pydantic import BaseModel,Field,field_validator
from ..db import connection
from ..services import master
from ..services.capacity import capacity
router=APIRouter(prefix='/api',tags=['Collaboration'])

@router.get('/projects/{project_id}/capacity')
def get_capacity(project_id:str,start:date,end:date):
    with connection() as db:
        db.execute('BEGIN');master.require(db,'projects',project_id)
        people=[dict(r) for r in db.execute('SELECT p.id,p.name FROM people p JOIN project_people x ON x.person_id=p.id WHERE x.project_id=? ORDER BY p.name,p.id',(project_id,))]
        rows=[dict(r) for r in db.execute('''SELECT m.*,p.name project_name FROM memberships m JOIN projects p ON p.id=m.project_id
            WHERE m.person_id IN (SELECT person_id FROM project_people WHERE project_id=?) AND m.archived=0 ORDER BY m.id''',(project_id,))]
        result=capacity(people,rows,start,end)
        for person in result:
            person['availability']=[dict(r) for r in db.execute('SELECT * FROM availability WHERE person_id=? AND archived=0 AND start_date<=? AND end_date>=?',(person['id'],end.isoformat(),start.isoformat()))]
        return {'start':start.isoformat(),'end':end.isoformat(),'people':result}

class Comment(BaseModel):
    text:str=Field(min_length=1,max_length=5000)
    request_id:UUID
    @field_validator('text')
    @classmethod
    def trim(cls,value):
        if not value.strip():raise ValueError('Escribe un comentario')
        return value.strip()

def comments(db,project_id,item_id):
    return [{'id':r['id'],'created_at':r['changed_at'],**json.loads(r['next'])} for r in db.execute("SELECT id,changed_at,next FROM audit_events WHERE project_id=? AND entity_id=? AND event='comentario' ORDER BY id",(project_id,item_id))]

@router.get('/projects/{project_id}/items/{item_id}/comments')
def list_comments(project_id:str,item_id:str):
    with connection() as db:
        master.item(db,project_id,item_id)
        return comments(db,project_id,item_id)

@router.post('/projects/{project_id}/items/{item_id}/comments',status_code=201)
def add_comment(project_id:str,item_id:str,value:Comment):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');master.item(db,project_id,item_id)
        previous=next((r for r in comments(db,project_id,item_id) if r['request_id']==str(value.request_id)),None)
        if previous:
            if previous['text']!=value.text:raise HTTPException(409,'El identificador de envío ya corresponde a otro comentario')
            return previous
        master.audit(db,project_id,item_id,'comentario',{}, {'text':value.text,'request_id':str(value.request_id),'author':'Usuario local'})
        return comments(db,project_id,item_id)[-1]
class Organization(BaseModel):
    leader_id:str|None=None
    role:str=Field(default='',max_length=200)
    version:int=Field(ge=1)

@router.put('/people/{person_id}/organization')
def update_organization(person_id:str,value:Organization):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');old=master.require(db,'people',person_id)
        if old['version']!=value.version:raise HTTPException(409,'La persona cambió. Recarga el organigrama')
        cursor=value.leader_id;seen={person_id}
        while cursor:
            if cursor in seen:raise HTTPException(422,'La relación de liderazgo formaría un ciclo')
            seen.add(cursor);cursor=master.require(db,'people',cursor)['leader_id']
        db.execute('UPDATE people SET leader_id=?,role=?,version=version+1,updated_at=? WHERE id=?',(value.leader_id,value.role.strip(),master.now(),person_id))
        saved=master.require(db,'people',person_id)
        master.audit(db,None,person_id,'actualizar_organigrama',old,saved)
        return saved
