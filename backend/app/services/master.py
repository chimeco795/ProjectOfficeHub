import json
import sqlite3
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import HTTPException
from ..db import encode
from ..domain.master import ItemInput

SECTIONS={'Risk':'riesgos','Assumption':'general','Issue':'problemas','Dependency':'dependencias','Milestone':'hitos','Activity':'actividades'}
REQUIRED={'riesgos','dependencias','hitos','actividades'}
def now():return datetime.now(timezone.utc).isoformat()
def uid():return str(uuid4())

def require(db, table, identity):
    row=db.execute(f'SELECT * FROM {table} WHERE id=?',(identity,)).fetchone()
    if not row:raise HTTPException(404,'No encontrado')
    return dict(row)

def item(db, project_id, identity):
    value=require(db,'master_items',identity)
    if value['project_id']!=project_id:raise HTTPException(404,'Elemento ajeno al proyecto')
    person=db.execute('SELECT name FROM people WHERE id=?',(value['owner_id'],)).fetchone()
    value['owner_name']=person['name'] if person else ''
    value['dependencies']=[r[0] for r in db.execute('SELECT predecessor_id FROM work_dependencies WHERE item_id=? ORDER BY predecessor_id',(identity,))]
    return value

def audit(db,project_id,entity_id,event,old,new):
    db.execute('INSERT INTO audit_events(project_id,entity_id,changed_at,event,previous,next) VALUES(?,?,?,?,?,?)',
        (project_id,entity_id,now(),event,encode(old),encode(new)))

def cut_event(db,cut_id,event,old,new):
    db.execute('INSERT INTO cut_audit(cut_id,changed_at,event,previous,next) VALUES(?,?,?,?,?)',
        (cut_id,now(),event,encode(old),encode(new)))

def validate_links(db,project_id,values,identity=None):
    if values.owner_id and not db.execute('SELECT 1 FROM project_people WHERE project_id=? AND person_id=?',(project_id,values.owner_id)).fetchone():
        raise HTTPException(422,'Asigna primero el responsable a este proyecto')
    if values.related_id:
        linked=item(db,project_id,values.related_id)
        if linked['id']==identity:raise HTTPException(422,'Un elemento no puede relacionarse consigo mismo')

def save_item(db,project_id,values,identity=None,version=None):
    require(db,'projects',project_id)
    old=item(db,project_id,identity) if identity else {}
    if old and old['version']!=version:raise HTTPException(409,'El elemento maestro cambió; recarga antes de guardar')
    if old and old['kind']!=values.kind:raise HTTPException(422,'El tipo de entidad no se puede cambiar')
    validate_links(db,project_id,values,identity)
    from .planning import validate
    validate(db,project_id,values,identity)
    fields=values.model_dump(mode='json')
    dependencies=fields.pop('dependencies')
    fields['code_key']=fields['code'].casefold();fields['updated_at']=now()
    identity=identity or uid()
    try:
        if old:
            db.execute('UPDATE master_items SET '+','.join(f'{k}=?' for k in fields)+',version=version+1 WHERE id=?',(*fields.values(),identity))
        else:
            fields.update(id=identity,project_id=project_id,created_at=fields['updated_at'])
            db.execute('INSERT INTO master_items ('+','.join(fields)+') VALUES ('+','.join('?' for _ in fields)+')',tuple(fields.values()))
    except sqlite3.IntegrityError as exc:
        raise HTTPException(409,'Ya existe ese código en el proyecto; vincula el elemento existente') from exc
    db.execute('DELETE FROM work_dependencies WHERE item_id=?',(identity,))
    db.executemany('INSERT INTO work_dependencies VALUES(?,?)',[(identity,p) for p in dependencies])
    saved=item(db,project_id,identity)
    audit(db,project_id,identity,'actualizar_elemento' if old else 'crear_elemento',old,saved)
    return saved

def weekly_values(master):
    return {'code':master['code'],'description':master['name'],'status':master['status'],'owner':master['owner_name'],
        'start_date':master['start_date'],'end_date':master['target_date'],'probability':master['probability'],
        'impact':master['impact'],'mitigation':master['response'],'percentage':master['progress'],
        'executive_priority':master['executive_priority'] in ('Alta','Crítica')}

def record_context(db,project_id,cut_id,record_id,version):
    cut=require(db,'cuts',cut_id)
    if cut['project_id']!=project_id:raise HTTPException(404,'Corte ajeno al proyecto')
    if cut['status']=='publicado':raise HTTPException(409,'El corte publicado es de solo lectura')
    record=require(db,'records',record_id)
    if record['cut_id']!=cut_id:raise HTTPException(404,'Registro ajeno al corte')
    if record['version']!=version:raise HTTPException(409,'El registro cambió; recarga antes de continuar')
    if record['review']=='eliminado':raise HTTPException(422,'Restaura el registro antes de vincularlo')
    return record

def bind(db,project_id,record,master,master_snapshot=None):
    if SECTIONS[master['kind']]!=record['section']:raise HTTPException(422,'El tipo maestro no coincide con la sección semanal')
    if master['archived']:raise HTTPException(422,'El elemento está archivado')
    before=db.execute('SELECT * FROM weekly_item_snapshots WHERE record_id=?',(record['id'],)).fetchone()
    if before and before['master_item_id']==master['id']:return dict(before)
    snap=master_snapshot or master
    try:
        db.execute('''INSERT INTO weekly_item_snapshots(record_id,cut_id,master_item_id,master_version,master_snapshot,payload)
            VALUES(?,?,?,?,?,?) ON CONFLICT(record_id) DO UPDATE SET master_item_id=excluded.master_item_id,
            master_version=excluded.master_version,master_snapshot=excluded.master_snapshot,payload=excluded.payload''',
            (record['id'],record['cut_id'],master['id'],snap['version'],encode(snap),record['current']))
    except sqlite3.IntegrityError as exc:
        raise HTTPException(409,'Ese elemento ya está vinculado en este corte. Consolida la información en el registro vinculado y excluye el duplicado') from exc
    db.execute('UPDATE records SET version=version+1 WHERE id=?',(record['id'],))
    cut_event(db,record['cut_id'],'vincular',dict(before) if before else {},{'record_id':record['id'],'code':master['code'],'master_item_id':master['id']})
    return dict(db.execute('SELECT * FROM weekly_item_snapshots WHERE record_id=?',(record['id'],)).fetchone())

def from_master(db,project_id,cut_id):
    for raw in db.execute('SELECT id FROM master_items WHERE project_id=? AND archived=0 AND include_in_report=1 ORDER BY code',(project_id,)).fetchall():
        master=item(db,project_id,raw['id']);identity=uid()
        db.execute('''INSERT INTO records(id,cut_id,section,location,original,current,review)
            VALUES(?,?,?,'Estado maestro del proyecto','{}',?,'pendiente')''',(identity,cut_id,SECTIONS[master['kind']],encode(weekly_values(master))))
        bind(db,project_id,require(db,'records',identity),master)
    cut_event(db,cut_id,'desde_maestro',{}, {'project_id':project_id})

def copy_bindings(db,cut_id):
    for record in db.execute('SELECT * FROM records WHERE cut_id=? AND parent_record_id IS NOT NULL',(cut_id,)).fetchall():
        old=db.execute('SELECT * FROM weekly_item_snapshots WHERE record_id=?',(record['parent_record_id'],)).fetchone()
        if old:
            db.execute('''INSERT INTO weekly_item_snapshots(record_id,cut_id,master_item_id,master_version,master_snapshot,payload)
                VALUES(?,?,?,?,?,?)''',(record['id'],cut_id,old['master_item_id'],old['master_version'],old['master_snapshot'],record['current']))

def freeze(db,cut_id):
    rows=db.execute("SELECT * FROM records WHERE cut_id=? AND review='aceptado'",(cut_id,)).fetchall()
    for record in rows:
        link=db.execute('SELECT * FROM weekly_item_snapshots WHERE record_id=?',(record['id'],)).fetchone()
        if record['section'] in REQUIRED and not link:
            raise HTTPException(422,'Vincula los riesgos, hitos, dependencias y actividades aceptados al maestro antes de publicar')
        if link:
            snapshot=json.loads(link['master_snapshot'])
            if SECTIONS[snapshot['kind']]!=record['section']:raise HTTPException(422,'La sección cambió; revisa la vinculación maestra')
            db.execute('UPDATE weekly_item_snapshots SET payload=?,frozen_at=? WHERE record_id=?',(record['current'],now(),record['id']))
