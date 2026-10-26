"""Request-local project ACL, using the existing project_people participation."""
from contextvars import ContextVar
import re
from fastapi import HTTPException

account_context=ContextVar('pohub_account',default=None)

def project_ids(db):
    account=account_context.get()
    if account is None or account['security_role'] in ('Admin','Gestor'):return None
    return {r[0] for r in db.execute('SELECT project_id FROM project_people WHERE person_id=?',(account['person_id'],))} if account['person_id'] else set()

def filter_projects(db,rows):
    allowed=project_ids(db)
    return [r for r in rows if allowed is None or r['id'] in allowed]

def person_ids(db):
    allowed=project_ids(db)
    if allowed is None:return None
    ids={r['person_id'] for r in db.execute('SELECT project_id,person_id FROM project_people') if r['project_id'] in allowed}
    person=account_context.get()['person_id']
    if person:ids.add(person)
    return ids

def filter_people(db,rows):
    allowed=person_ids(db)
    return [dict(r,leader_id=r.get('leader_id') if allowed is None or r.get('leader_id') in allowed else None) for r in rows if allowed is None or r['id'] in allowed]

def role_ids(db):
    allowed=project_ids(db)
    if allowed is None:return None
    ids={r['role_id'] for r in db.execute('SELECT project_id,role_id FROM memberships') if r['project_id'] in allowed and r['role_id']}
    parents={r['id']:r['reports_to'] for r in db.execute('SELECT id,reports_to FROM roles')}
    pending=list(ids)
    while pending:
        parent=parents.get(pending.pop())
        if parent and parent not in ids:ids.add(parent);pending.append(parent)
    return ids

def filter_roles(db,rows):
    from .api.pmo import multi_team_roles
    effective=multi_team_roles(db)
    ids=role_ids(db)
    return [dict(r,effective_manages_multiple_teams=r['id'] in effective) for r in rows if ids is None or r['id'] in ids]

def filter_teams(db,rows):
    allowed=project_ids(db)
    if allowed is None:return rows
    ids={r['team_id'] for r in db.execute('SELECT project_id,team_id FROM project_teams') if r['project_id'] in allowed}
    people=person_ids(db)
    return [dict(r,lead_id=r['lead_id'] if r['lead_id'] in people else None) for r in rows if r['id'] in ids]

def guard_read(db,path):
    allowed=project_ids(db)
    if allowed is None:return
    path=path.rstrip('/')
    if path in ('/api/projects','/api/people','/api/roles','/api/teams','/api/schema') or path.startswith('/api/auth/'):return
    match=re.match(r'^/api/projects/([^/]+)(?:/|$)',path)
    if match and match[1] in allowed:return
    match=re.fullmatch(r'/api/cuts/([^/]+)(?:/(?:audit|timeline|report-history))?',path)
    if match:
        row=db.execute('SELECT project_id FROM cuts WHERE id=?',(match[1],)).fetchone()
        if row and row['project_id'] in allowed:return
    match=re.fullmatch(r'/api/records/([^/]+)/audit',path)
    if match:
        row=db.execute('SELECT c.project_id FROM records r JOIN cuts c ON c.id=r.cut_id WHERE r.id=?',(match[1],)).fetchone()
        if row and row['project_id'] in allowed:return
    match=re.fullmatch(r'/api/people/([^/]+)/projects',path)
    if match and match[1] in person_ids(db):return
    # Migration originals can span projects; there is no safe partial download.
    if path.startswith('/api/migrations'):raise HTTPException(403,'Las importaciones globales requieren permisos de gestión.')
    raise HTTPException(404,'Recurso no encontrado.')
