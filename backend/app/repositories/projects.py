from datetime import date, datetime, timezone
from uuid import uuid4

from fastapi import HTTPException

from ..db import connection, encode
from ..domain.projects import Project, ProjectUpdate


def get(db, project_id):
    row = db.execute('SELECT * FROM projects WHERE id=?', (project_id,)).fetchone()
    if row is None:
        raise HTTPException(404, 'Proyecto no encontrado')
    return dict(row)


def list_projects():
    with connection() as db:
        result = [dict(row) for row in db.execute('''
            SELECT p.*, (SELECT COUNT(*) FROM cuts c WHERE c.project_id=p.id) cut_count
            FROM projects p ORDER BY created_at DESC, id
        ''')]
        today = date.today().isoformat()
        for project in result:
            facts = db.execute('''SELECT
                SUM(CASE WHEN target_date < ? THEN 1 ELSE 0 END) overdue,
                SUM(CASE WHEN kind='Risk' AND executive_priority IN ('Alta','Crítica') THEN 1 ELSE 0 END) risks,
                SUM(CASE WHEN lower(status) IN ('blocked','bloqueado') THEN 1 ELSE 0 END) blocked
                FROM master_items WHERE project_id=? AND archived=0
                AND lower(status) NOT IN ('closed','cerrado','resolved','resuelto','removed','retirado')''', (today, project['id'])).fetchone()
            project['attention'] = {key: facts[key] or 0 for key in ('overdue', 'risks', 'blocked')}
            project['attention']['late'] = bool(project['status'] != 'Cerrado' and project['target_date'] and project['target_date'] < today)
            last = db.execute("SELECT metadata FROM cuts WHERE project_id=? ORDER BY report_date DESC, created_at DESC LIMIT 1", (project['id'],)).fetchone()
            if last:
                import json
                value = json.loads(last['metadata'])
                actual, planned = value.get('actual'), value.get('planned')
                project['attention']['deviation'] = type(actual) in (int, float) and type(planned) in (int, float) and actual < planned
        return result


def get_project(project_id):
    with connection() as db:
        project = get(db, project_id)
        project['cut_count'] = db.execute('SELECT COUNT(*) FROM cuts WHERE project_id=?', (project_id,)).fetchone()[0]
        return project


def create_project(value: Project):
    fields = value.model_dump(mode='json')
    stamp = datetime.now(timezone.utc).isoformat()
    fields.update(id=str(uuid4()), created_at=stamp, updated_at=stamp)
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        db.execute(f"INSERT INTO projects ({','.join(fields)}) VALUES ({','.join('?' for _ in fields)})", tuple(fields.values()))
        project = get(db, fields['id'])
        db.execute('INSERT INTO project_audit(project_id,changed_at,previous,next) VALUES(?,?,?,?)',
                   (project['id'], stamp, '{}', encode(project)))
        return {**project, 'cut_count': 0}


def update_project(project_id, value: ProjectUpdate):
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        old = get(db, project_id)
        if old['version'] != value.version:
            raise HTTPException(409, 'El proyecto cambió. Recarga antes de guardar.')
        fields = value.model_dump(mode='json', exclude={'version'})
        fields['updated_at'] = datetime.now(timezone.utc).isoformat()
        db.execute('UPDATE projects SET ' + ','.join(f'{key}=?' for key in fields) + ',version=version+1 WHERE id=?',
                   (*fields.values(), project_id))
        saved = get(db, project_id)
        db.execute('INSERT INTO project_audit(project_id,changed_at,previous,next) VALUES(?,?,?,?)',
                   (project_id, fields['updated_at'], encode(old), encode(saved)))
        saved['cut_count'] = db.execute('SELECT COUNT(*) FROM cuts WHERE project_id=?', (project_id,)).fetchone()[0]
        return saved
