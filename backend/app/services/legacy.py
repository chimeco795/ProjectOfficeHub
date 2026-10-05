"""Conservative .pohub importer. Dry-run and application share one transaction path."""
import hashlib
import json
import sqlite3
from datetime import datetime
from fastapi import HTTPException
from pydantic import ValidationError
from ..db import connection,encode
from ..domain.projects import Project
from ..domain.master import ItemInput,PersonInput
from ..domain.pmo import Budget,Team
from .master import uid,now,require,save_item,audit

COLLECTIONS=('projects','people','teams','workItems','raid','memberships','projectTeams','events','iterations','releases','attachments','auditLog','budgetEntries')

def parse(content):
    if len(content)>20*1024*1024:raise HTTPException(422,'La exportación supera 20 MB')
    try:data=json.loads(content.decode('utf-8-sig'))
    except (ValueError,UnicodeError) as exc:raise HTTPException(422,'Archivo JSON .pohub inválido') from exc
    if not isinstance(data,dict) or data.get('schemaVersion',(data.get('meta') or {}).get('schemaVersion') if isinstance(data.get('meta'),dict) else None)!=3:
        raise HTTPException(422,'Se requiere una exportación .pohub schemaVersion 3 del PMO 3.1')
    for key in COLLECTIONS:
        values=data.get(key,[])
        if not isinstance(values,list) or len(values)>10000 or any(not isinstance(v,dict) for v in values):
            raise HTTPException(422,f'Colección inválida: {key}')
        if key not in ('auditLog','projectTeams'):
            ids=[v.get('id') for v in values]
            if any(not isinstance(i,str) or not i for i in ids) or len(set(ids))!=len(ids):raise HTTPException(422,f'Identificadores vacíos o duplicados en {key}')
    return data

def inspect(content,filename,source,project_map,global_project=None,apply=False):
    from ..api.pmo import save_record
    data=parse(content);digest=hashlib.sha256(content).hexdigest()
    report={'sha256':digest,'projects':[{k:p.get(k) for k in ('id','name','methodology')} for p in data.get('projects',[])],
        'counts':{k:len(data.get(k,[])) for k in COLLECTIONS},'errors':[],'warnings':[
            'Los campos sin equivalente (comentarios, configuración visual y metadatos antiguos) se conservan en el archivo original descargable; no se sustituyen por valores inventados.',
            'Personas con el mismo correo se reutilizan; no se fusionan identidades solo por nombre. Los proyectos existentes conservan su ficha y publicaciones.'], 'applied':False}
    if not source.strip() or len(source)>200:report['errors'].append('Indica un nombre estable de origen (máximo 200 caracteres)')
    projects=data.get('projects',[])
    if not projects:report['errors'].append('La exportación no contiene proyectos')
    if any(p['id'] not in project_map for p in projects):report['errors'].append('Asigna un destino para cada proyecto antes de validar')
    if data.get('attachments'):report['errors'].append('La exportación contiene adjuntos antiguos. Se requiere verificar su formato antes de migrarlos; no se omitirán silenciosamente')
    global_rows=[r for key in ('events','memberships') for r in data.get(key,[]) if not r.get('projectId')]
    if global_rows and global_project not in {p['id'] for p in projects}:report['errors'].append('Selecciona el proyecto de destino para agenda y asignaciones globales')
    if report['errors']:return report
    try:
        with connection() as db:
            db.execute('BEGIN IMMEDIATE')
            existing=db.execute('SELECT id,report FROM migration_batches WHERE sha256=?',(digest,)).fetchone()
            if existing:
                result=json.loads(existing['report']);result.update(already_applied=True,batch_id=existing['id'],applied=True)
                return result
            batch=uid();db.execute('INSERT INTO migration_batches VALUES(?,?,?,?,?,?)',(batch,digest,filename,content,'{}',now()))
            maps={key:{} for key in COLLECTIONS}
            def bind(kind,old,new):
                conflict=db.execute('SELECT new_id FROM migration_identities WHERE source=? AND entity_type=? AND old_id=?',(source,kind,old)).fetchone()
                if conflict:raise HTTPException(409,f'{kind} {old}: ya migrado desde este origen en otro archivo. Se requiere conciliación; no se sobrescribe')
                maps[kind][old]=new
                db.execute('INSERT INTO migration_identities VALUES(?,?,?,?,?)',(batch,kind,old,new,source))
            def lookup(kind,old,optional=False):
                if not old and optional:return None
                if old not in maps[kind]:raise HTTPException(422,f'Referencia sin resolver: {kind} / {old}')
                return maps[kind][old]
            def pid(row):return lookup('projects',row.get('projectId') or global_project)
            for row in projects:
                target=project_map[row['id']]
                if target=='__new__':
                    value=Project(name=row.get('name',''),description=row.get('description',''),methodology=row.get('methodology','Hybrid'),
                        start_date=row.get('start') or None,target_date=row.get('target') or None,priority=row.get('priority','Media'),
                        status={'Active':'Activo','Closed':'Cerrado','Paused':'En pausa'}.get(row.get('state'),'Activo'))
                    fields=value.model_dump(mode='json');fields.update(id=uid(),created_at=now(),updated_at=now())
                    db.execute('INSERT INTO projects ('+','.join(fields)+') VALUES ('+','.join('?' for _ in fields)+')',tuple(fields.values()));target=fields['id']
                else:require(db,'projects',target)
                bind('projects',row['id'],target)
            for row in data.get('people',[]):
                value=PersonInput(name=row.get('name',''),email=row.get('email') or '')
                existing=db.execute('SELECT id FROM people WHERE email_key=?',(value.email.casefold(),)).fetchone() if value.email else None
                if existing:identity=existing['id']
                else:
                    if db.execute('SELECT 1 FROM people WHERE lower(name)=lower(?)',(value.name,)).fetchone():raise HTTPException(409,f'Persona ambigua sin correo coincidente: {value.name}')
                    identity=uid();db.execute('INSERT INTO people(id,name,email,email_key,created_at,updated_at) VALUES(?,?,?,?,?,?)',(identity,value.name,value.email,value.email.casefold() or None,now(),now()))
                bind('people',row['id'],identity)
            def roster(project,old_ids):
                for old_id in old_ids:
                    if old_id:db.execute('INSERT OR IGNORE INTO project_people VALUES(?,?)',(project,lookup('people',old_id)))
            for row in projects:roster(lookup('projects',row['id']),row.get('stakeholderIds',[]))
            primary=next(iter(maps['projects'].values()))
            for row in data.get('teams',[]):
                if db.execute('SELECT 1 FROM teams WHERE lower(name)=lower(?)',(row.get('name',''),)).fetchone():raise HTTPException(409,'Equipo existente con nombre coincidente; requiere conciliación previa')
                team=Team(name=row.get('name',''),lead_id=lookup('people',row.get('leadId'),True))
                identity=uid()
                db.execute('INSERT INTO teams(id,name,lead_id,archived,version) VALUES(?,?,?,0,1)',(identity,team.name,team.lead_id))
                bind('teams',row['id'],identity)
                for member in row.get('memberIds',[]):lookup('people',member)
            for row in projects:
                if row.get('teamId'):db.execute('INSERT OR IGNORE INTO project_teams VALUES(?,?)',(lookup('projects',row['id']),lookup('teams',row['teamId'])))
            for row in data.get('projectTeams',[]):db.execute('INSERT OR IGNORE INTO project_teams VALUES(?,?)',(pid(row),lookup('teams',row.get('teamId'))))
            for row in data.get('teams',[]):
                for assigned in db.execute('SELECT project_id FROM project_teams WHERE team_id=?',(maps['teams'][row['id']],)).fetchall():
                    roster(assigned['project_id'],row.get('memberIds',[])+[row.get('leadId')])
            for key,kind in [('iterations','Iteration'),('releases','Release')]:
                for row in data.get(key,[]):
                    period=save_record(db,pid(row),'periods',{'kind':kind,'name':row.get('name',''),'start_date':row.get('start') or None,'end_date':row.get('end') or row.get('target') or None,'status':row.get('state','Planned'),'description':row.get('description','')})
                    bind(key,row['id'],period['id'])
            # Allocate all work identities first; then validate hierarchy and predecessor graph.
            pending=[]
            for row in data.get('workItems',[]):
                roster(pid(row),[row.get('assigneeId')])
                value=ItemInput(kind='Activity',code=row['id'],name=row.get('name',''),description=row.get('description',''),status=row.get('state','New'),
                    owner_id=lookup('people',row.get('assigneeId'),True),start_date=row.get('start') or None,target_date=row.get('target') or None,
                    work_type=row.get('type','Task'),original_effort=row.get('original'),remaining_effort=row.get('remaining'),completed_effort=row.get('complete'),
                    points=row.get('points'),progress=row.get('progress',row.get('percentComplete')),executive_priority=row.get('priority','Media'),include_in_report=False)
                saved=save_item(db,pid(row),value);bind('workItems',row['id'],saved['id']);pending.append((row,value,saved))
            for row,value,saved in pending:
                value.parent_id=lookup('workItems',row.get('parentId'),True)
                value.dependencies=[lookup('workItems',d) for d in row.get('dependencies',[])]
                value.iteration_id=lookup('iterations',row.get('iterationId'),True);value.release_id=lookup('releases',row.get('releaseId'),True)
                save_item(db,pid(row),value,saved['id'],saved['version'])
            for row in data.get('raid',[]):
                roster(pid(row),[row.get('ownerId')])
                value=ItemInput(kind=row.get('type','Risk'),code=row['id'],name=row.get('title') or row.get('name') or row.get('description',''),description=row.get('description',''),
                    status=row.get('state','Abierto'),owner_id=lookup('people',row.get('ownerId'),True),probability=str(row.get('probability','')),impact=str(row.get('impact','')),
                    response=row.get('response') or row.get('mitigation') or '',include_in_report=False)
                saved=save_item(db,pid(row),value);bind('raid',row['id'],saved['id'])
            for row in data.get('memberships',[]):
                roster(pid(row),[row.get('personId')])
                team=lookup('teams',row.get('teamId'),True)
                if team:db.execute('INSERT OR IGNORE INTO project_teams VALUES(?,?)',(pid(row),team))
                saved=save_record(db,pid(row),'memberships',{'person_id':lookup('people',row.get('personId')),'team_id':team,'role':row.get('role','Invitado'),
                    'allocation':row.get('allocationPercentage',100),'valid_from':row.get('validFrom') or None,'valid_to':row.get('validTo') or None})
                bind('memberships',row['id'],saved['id'])
            for row in data.get('events',[]):
                guests=[];external=[]
                for guest in row.get('guests',[]):
                    if guest in maps['people']:guests.append(maps['people'][guest])
                    else:external.append(str(guest))
                roster(pid(row),[row.get('ownerId')]+[g for g in row.get('guests',[]) if g in maps['people']])
                description=row.get('description','')+ ('\nInvitados externos del origen: '+', '.join(external) if external else '')
                saved=save_record(db,pid(row),'events',{'title':row.get('title',''),'date':row.get('date'),'time':row.get('time','09:00'),
                    'kind':row.get('type','Reunión'),'owner_id':lookup('people',row.get('ownerId'),True),'guests':guests,'description':description})
                bind('events',row['id'],saved['id'])
            budgets=data.get('budgets',{})
            if not isinstance(budgets,dict):raise HTTPException(422,'Presupuestos inválidos')
            for old_id,row in budgets.items():
                project=lookup('projects',old_id)
                if db.execute('SELECT 1 FROM budgets WHERE project_id=?',(project,)).fetchone():raise HTTPException(409,'El proyecto destino ya tiene presupuesto; no se sobrescribe')
                v=Budget(approved=row.get('approved'),contingency=row.get('contingency',0),currency=row.get('currency','MXN'),notes=row.get('notes',''))
                db.execute('INSERT INTO budgets VALUES(?,?,?,?,?,1)',(project,v.currency,int(v.approved*100),int(v.contingency*100),v.notes))
            for row in data.get('budgetEntries',[]):
                saved=save_record(db,pid(row),'entries',{'concept':row.get('concept',''),'category':row.get('category',''),'kind':row.get('type','Planned'),
                    'amount':row.get('amount'),'currency':row.get('currency','MXN'),'date':row.get('date') or None,'vendor':row.get('vendor',''),'notes':row.get('notes',''),
                    'related_id':lookup('workItems',row.get('relatedId'),True)})
                bind('budgetEntries',row['id'],saved['id'])
            for row in data.get('auditLog',[]):
                project=lookup('projects',row.get('projectId'),True) or primary
                stamp=row.get('timestamp') or row.get('date')
                try:datetime.fromisoformat(str(stamp).replace('Z','+00:00'))
                except ValueError:stamp=now()
                db.execute('INSERT INTO audit_events(project_id,entity_id,changed_at,event,previous,next) VALUES(?,?,?,?,?,?)',(project,batch,stamp,'evento_origen','{}',encode(row)))
            for project in maps['projects'].values():audit(db,project,batch,'migrar_pohub',{}, {'source':source,'sha256':digest,'counts':report['counts']})
            if db.execute('PRAGMA foreign_key_check').fetchall():raise HTTPException(422,'La importación produjo referencias inválidas')
            report.update(batch_id=batch,applied=apply,identities=sum(len(m) for m in maps.values()))
            db.execute('UPDATE migration_batches SET report=? WHERE id=?',(encode(report),batch))
            if not apply:db.rollback()
    except (HTTPException,ValidationError,sqlite3.IntegrityError,ValueError,TypeError,KeyError) as exc:
        report['errors'].append(str(exc.detail if isinstance(exc,HTTPException) else exc));report['applied']=False
    return report
