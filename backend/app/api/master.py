import json
import sqlite3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator
from ..db import connection, encode
from ..domain.master import PersonInput, PersonUpdate, ItemInput, ItemUpdate, Reconcile, Transfer, ApplyToMaster
from ..services import master as service

router=APIRouter(prefix='/api',tags=['Master data'])

class AssignPerson(BaseModel):
    person_id: str | None = None
    new_person: PersonInput | None = None
    @model_validator(mode='after')
    def choose(self):
        if bool(self.person_id)==bool(self.new_person):raise ValueError('Selecciona una persona existente o crea una nueva')
        return self

class RecordVersion(BaseModel):
    record_version:int=Field(ge=1)

@router.get('/people')
def people():
    with connection() as db:return [dict(r) for r in db.execute('SELECT * FROM people ORDER BY name,id')]

@router.get('/projects/{project_id}/people')
def project_people(project_id:str):
    with connection() as db:
        service.require(db,'projects',project_id)
        return [dict(r) for r in db.execute('SELECT p.* FROM people p JOIN project_people x ON p.id=x.person_id WHERE x.project_id=? ORDER BY name',(project_id,))]

@router.post('/projects/{project_id}/people',status_code=201)
def assign_person(project_id:str,value:AssignPerson):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');service.require(db,'projects',project_id)
        identity=value.person_id
        if value.new_person:
            identity=service.uid();stamp=service.now();person=value.new_person
            try:
                db.execute('INSERT INTO people(id,name,email,email_key,created_at,updated_at) VALUES(?,?,?,?,?,?)',
                    (identity,person.name,person.email,person.email.casefold() or None,stamp,stamp))
            except sqlite3.IntegrityError as exc:raise HTTPException(409,'Ese correo ya existe. Asigna la persona del catálogo') from exc
        person=service.require(db,'people',identity)
        inserted=db.execute('INSERT OR IGNORE INTO project_people VALUES(?,?)',(project_id,identity)).rowcount
        if inserted:service.audit(db,project_id,identity,'asignar_persona',{},person)
        return person

@router.put('/people/{person_id}')
def update_person(person_id:str,value:PersonUpdate):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');old=service.require(db,'people',person_id)
        if old['version']!=value.version:raise HTTPException(409,'La persona cambió; recarga')
        try:db.execute('UPDATE people SET name=?,email=?,email_key=?,version=version+1,updated_at=? WHERE id=?',
            (value.name,value.email,value.email.casefold() or None,service.now(),person_id))
        except sqlite3.IntegrityError as exc:raise HTTPException(409,'El correo pertenece a otra persona') from exc
        saved=service.require(db,'people',person_id)
        service.audit(db,None,person_id,'actualizar_persona',old,saved)
        return saved

@router.get('/projects/{project_id}/items')
def items(project_id:str):
    with connection() as db:
        service.require(db,'projects',project_id)
        return [service.item(db,project_id,r['id']) for r in db.execute('SELECT id FROM master_items WHERE project_id=? ORDER BY archived,kind,code',(project_id,)).fetchall()]

@router.post('/projects/{project_id}/items',status_code=201)
def create_item(project_id:str,value:ItemInput):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        return service.save_item(db,project_id,value)

@router.put('/projects/{project_id}/items/{item_id}')
def update_item(project_id:str,item_id:str,value:ItemUpdate):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        return service.save_item(db,project_id,ItemInput.model_validate(value.model_dump()),item_id,value.version)

@router.get('/projects/{project_id}/cuts/{cut_id}/bindings')
def bindings(project_id:str,cut_id:str):
    with connection() as db:
        cut=service.require(db,'cuts',cut_id)
        if cut['project_id']!=project_id:raise HTTPException(404,'Corte ajeno al proyecto')
        result=[]
        for row in db.execute('SELECT * FROM weekly_item_snapshots WHERE cut_id=?',(cut_id,)):
            value=dict(row)
            for key in ('payload','master_snapshot'):value[key]=json.loads(value[key])
            result.append(value)
        return result

@router.post('/projects/{project_id}/cuts/{cut_id}/records/{record_id}/reconcile')
def reconcile(project_id:str,cut_id:str,record_id:str,value:Reconcile):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        record=service.record_context(db,project_id,cut_id,record_id,value.record_version)
        if record['review']!='aceptado':raise HTTPException(422,'Revisa y acepta el registro antes de vincularlo')
        master=service.item(db,project_id,value.item_id) if value.item_id else service.save_item(db,project_id,value.new_item)
        return service.bind(db,project_id,record,master)

@router.delete('/projects/{project_id}/cuts/{cut_id}/records/{record_id}/binding')
def unlink(project_id:str,cut_id:str,record_id:str,value:RecordVersion):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');service.record_context(db,project_id,cut_id,record_id,value.record_version)
        old=db.execute('SELECT * FROM weekly_item_snapshots WHERE record_id=?',(record_id,)).fetchone()
        if old:
            db.execute('DELETE FROM weekly_item_snapshots WHERE record_id=?',(record_id,))
            db.execute('UPDATE records SET version=version+1 WHERE id=?',(record_id,))
            service.cut_event(db,cut_id,'desvincular',dict(old),{})
        return {'saved':True}

def linked_context(db,project_id,cut_id,record_id,value):
    record=service.record_context(db,project_id,cut_id,record_id,value.record_version)
    link=db.execute('SELECT * FROM weekly_item_snapshots WHERE record_id=?',(record_id,)).fetchone()
    if not link:raise HTTPException(422,'Primero vincula el registro al maestro')
    master=service.item(db,project_id,link['master_item_id'])
    if master['version']!=value.item_version:raise HTTPException(409,'El maestro cambió; recarga y revisa los valores')
    if master['archived']:raise HTTPException(422,'El elemento está archivado; restáuralo antes de actualizar')
    if service.SECTIONS[master['kind']]!=record['section']:raise HTTPException(422,'La sección cambió; revisa la vinculación')
    return record,master

@router.post('/projects/{project_id}/cuts/{cut_id}/records/{record_id}/pull')
def pull(project_id:str,cut_id:str,record_id:str,value:Transfer):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');record,master=linked_context(db,project_id,cut_id,record_id,value)
        current={**json.loads(record['current']),**service.weekly_values(master)}
        db.execute("UPDATE records SET current=?,review='pendiente',modified=1,version=version+1 WHERE id=?",(encode(current),record_id))
        db.execute('UPDATE weekly_item_snapshots SET master_version=?,master_snapshot=?,payload=? WHERE record_id=?',
            (master['version'],encode(master),encode(current),record_id))
        db.execute('INSERT INTO audit(record_id,changed_at,previous,next) VALUES(?,?,?,?)',
            (record_id,service.now(),encode(record),encode({'current':current,'review':'pendiente'})))
        service.cut_event(db,cut_id,'traer_maestro',{}, {'record_id':record_id,'code':master['code']})
        return {'saved':True}

@router.post('/projects/{project_id}/cuts/{cut_id}/records/{record_id}/apply')
def apply(project_id:str,cut_id:str,record_id:str,value:ApplyToMaster):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');record,master=linked_context(db,project_id,cut_id,record_id,value)
        if record['review']!='aceptado':raise HTTPException(422,'Acepta primero el registro semanal')
        saved=service.save_item(db,project_id,value.values,master['id'],value.item_version)
        db.execute('UPDATE weekly_item_snapshots SET master_version=?,master_snapshot=?,payload=? WHERE record_id=?',
            (saved['version'],encode(saved),record['current'],record_id))
        db.execute('UPDATE records SET version=version+1 WHERE id=?',(record_id,))
        service.cut_event(db,cut_id,'aplicar_maestro',master,saved)
        return saved

@router.get('/projects/{project_id}/audit')
def project_audit(project_id:str):
    with connection() as db:
        service.require(db,'projects',project_id)
        events=[{**dict(r),'origin':'maestro'} for r in db.execute('''SELECT * FROM audit_events WHERE project_id=? OR
            (project_id IS NULL AND entity_id IN (SELECT person_id FROM project_people WHERE project_id=?))''',(project_id,project_id))]
        events += [{**dict(r),'event':'editar_proyecto','origin':'proyecto'} for r in db.execute('SELECT * FROM project_audit WHERE project_id=?',(project_id,))]
        events += [{**dict(r),'origin':'corte'} for r in db.execute('SELECT a.* FROM cut_audit a JOIN cuts c ON c.id=a.cut_id WHERE c.project_id=?',(project_id,))]
        events += [{**dict(r),'event':'editar_registro','origin':'registro'} for r in db.execute('SELECT a.* FROM audit a JOIN records r ON r.id=a.record_id JOIN cuts c ON c.id=r.cut_id WHERE c.project_id=?',(project_id,))]
        return sorted(events,key=lambda e:(e['changed_at'],e['origin'],e['id']),reverse=True)
