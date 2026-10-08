from datetime import date,time
from typing import Literal
from fastapi import APIRouter,HTTPException
from pydantic import BaseModel,Field,model_validator
from ..db import connection,encode
from ..services import master
from .pmo import scoped
router=APIRouter(prefix='/api',tags=['Management'])

class Role(BaseModel):
    name:str=Field(min_length=1,max_length=100)
    reports_to:str|None=None
    version:int=Field(default=1,ge=1)
    archived:bool=False

@router.get('/roles')
def roles():
    with connection() as db:return [dict(r) for r in db.execute('SELECT * FROM roles ORDER BY name')]

@router.post('/roles',status_code=201)
def create_role(value:Role):return save_role(value)

@router.put('/roles/{identity}')
def edit_role(identity:str,value:Role):return save_role(value,identity)

def save_role(value,identity=None):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        old=master.require(db,'roles',identity) if identity else {}
        if old and old['version']!=value.version:raise HTTPException(409,'El rol cambió; recarga')
        name=value.name.strip()
        if not name:raise HTTPException(422,'Nombre requerido')
        if db.execute('SELECT 1 FROM roles WHERE name_key=? AND id!=?',(name.casefold(),identity or '')).fetchone():raise HTTPException(409,'El rol ya existe')
        parent=value.reports_to;seen={identity} if identity else set()
        while parent:
            if parent in seen:raise HTTPException(422,'Jerarquía de roles circular')
            seen.add(parent);parent=master.require(db,'roles',parent)['reports_to']
        if old:db.execute('UPDATE roles SET name=?,name_key=?,reports_to=?,archived=?,version=version+1 WHERE id=?',(name,name.casefold(),value.reports_to,value.archived,identity))
        else:
            identity=master.uid();db.execute('INSERT INTO roles(id,name,name_key,reports_to,archived) VALUES(?,?,?,?,?)',(identity,name,name.casefold(),value.reports_to,value.archived))
        saved=master.require(db,'roles',identity);master.audit(db,None,identity,'editar_rol' if old else 'crear_rol',old,saved);return saved

class Contact(BaseModel):
    phone:str=Field(default='',max_length=100)
    mobile:str=Field(default='',max_length=100)
    location:str=Field(default='',max_length=300)
    contact_notes:str=Field(default='',max_length=3000)
    version:int=Field(ge=1)

@router.put('/people/{identity}/contact')
def contact(identity:str,value:Contact):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');old=master.require(db,'people',identity)
        if old['version']!=value.version:raise HTTPException(409,'La persona cambió; recarga')
        fields=value.model_dump();fields.pop('version')
        db.execute('UPDATE people SET '+','.join(k+'=?' for k in fields)+',version=version+1,updated_at=? WHERE id=?',(*fields.values(),master.now(),identity))
        saved=master.require(db,'people',identity);master.audit(db,None,identity,'editar_contacto',old,saved);return saved

class Absence(BaseModel):
    person_id:str
    kind:Literal['Vacaciones','Permiso','Enfermedad','Asunto personal','Fuera de oficina']
    start_date:date
    end_date:date
    notes:str=Field(default='',max_length=3000)
    archived:bool=False
    version:int=Field(default=1,ge=1)
    @model_validator(mode='after')
    def dates(self):
        if self.start_date>self.end_date:raise ValueError('Inicio posterior al fin')
        return self

@router.get('/projects/{project_id}/availability')
def availability(project_id:str):
    with connection() as db:
        master.require(db,'projects',project_id)
        return [dict(r) for r in db.execute('SELECT a.* FROM availability a JOIN project_people p ON p.person_id=a.person_id WHERE p.project_id=? ORDER BY a.start_date',(project_id,))]

@router.post('/projects/{project_id}/availability',status_code=201)
def create_absence(project_id:str,value:Absence):return save_absence(project_id,value)

@router.put('/projects/{project_id}/availability/{identity}')
def edit_absence(project_id:str,identity:str,value:Absence):return save_absence(project_id,value,identity)

def save_absence(pid,value,identity=None):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');master.require(db,'projects',pid)
        if not db.execute('SELECT 1 FROM project_people WHERE project_id=? AND person_id=?',(pid,value.person_id)).fetchone():raise HTTPException(422,'Persona ajena al proyecto')
        old=master.require(db,'availability',identity) if identity else {}
        if old and (old['person_id']!=value.person_id or old['version']!=value.version):raise HTTPException(409,'La disponibilidad cambió; recarga')
        identity=identity or master.uid();fields=value.model_dump(mode='json');fields.pop('version')
        if old:db.execute('UPDATE availability SET '+','.join(k+'=?' for k in fields)+',version=version+1 WHERE id=?',(*fields.values(),identity))
        else:db.execute('INSERT INTO availability(id,'+','.join(fields)+') VALUES('+','.join('?' for _ in range(len(fields)+1))+')',(identity,*fields.values()))
        saved=master.require(db,'availability',identity);master.audit(db,pid,identity,'editar_disponibilidad' if old else 'crear_disponibilidad',old,saved);return saved

class WorkingCalendar(BaseModel):
    team_id:str|None=None
    days:list[int]=Field(min_length=1,max_length=7)
    start_time:time
    end_time:time
    version:int=Field(default=0,ge=0)
    @model_validator(mode='after')
    def valid(self):
        if any(d not in range(7) for d in self.days) or len(set(self.days))!=len(self.days):raise ValueError('Días inválidos (0 lunes a 6 domingo)')
        if self.start_time>=self.end_time:raise ValueError('Horario inválido')
        return self

@router.get('/projects/{project_id}/working-calendars')
def calendars(project_id:str):
    import json
    with connection() as db:
        master.require(db,'projects',project_id)
        return [{**dict(r),'days':json.loads(r['days'])} for r in db.execute('SELECT * FROM working_calendars WHERE project_id=?',(project_id,))]

@router.put('/projects/{project_id}/working-calendar')
def calendar(project_id:str,value:WorkingCalendar):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE');master.require(db,'projects',project_id)
        if value.team_id:scoped(db,'teams',project_id,value.team_id)
        row=db.execute("SELECT * FROM working_calendars WHERE project_id=? AND COALESCE(team_id,'')=?",(project_id,value.team_id or '')).fetchone();old=dict(row) if row else {}
        if value.version!=(old.get('version',0)):raise HTTPException(409,'El horario cambió; recarga')
        identity=old.get('id') or master.uid()
        if old:db.execute('UPDATE working_calendars SET days=?,start_time=?,end_time=?,version=version+1 WHERE id=?',(encode(value.days),value.start_time.isoformat(),value.end_time.isoformat(),identity))
        else:db.execute('INSERT INTO working_calendars(id,project_id,team_id,days,start_time,end_time) VALUES(?,?,?,?,?,?)',(identity,project_id,value.team_id,encode(value.days),value.start_time.isoformat(),value.end_time.isoformat()))
        saved=dict(db.execute('SELECT * FROM working_calendars WHERE id=?',(identity,)).fetchone());master.audit(db,project_id,identity,'horario_laboral',old,saved);return saved

@router.get('/people/{person_id}/projects')
def my_projects(person_id:str):
    with connection() as db:
        master.require(db,'people',person_id)
        return [dict(r) for r in db.execute('SELECT p.* FROM projects p JOIN project_people m ON m.project_id=p.id WHERE m.person_id=? ORDER BY p.name',(person_id,))]
