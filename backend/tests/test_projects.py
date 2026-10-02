import json
import sqlite3

import pytest
from fastapi.testclient import TestClient

from app import db
from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DATA', tmp_path)
    with TestClient(app) as client:
        yield client


def test_project_master_roundtrip_restart_and_conflict(client):
    assert client.get('/api/projects').json() == []
    a = client.post('/api/projects', json={
        'name': '  Proyecto A  ', 'methodology': 'Waterfall', 'priority': 'Alta',
        'start_date': '2026-10-01', 'target_date': '2026-11-01',
        'go_live': '2026-12-01', 'close_date': '2027-01-01',
    }).json()
    b = client.post('/api/projects', json={'name': 'Proyecto B', 'methodology': 'Agile'}).json()
    assert a['name'] == 'Proyecto A'
    assert len({a['target_date'], a['go_live'], a['close_date']}) == 3
    response = client.put('/api/projects/' + a['id'], json={**a, 'name': 'Proyecto A editado', 'priority': 'Crítica'})
    assert response.status_code == 200
    saved = response.json()
    assert saved['version'] == 2
    assert client.put('/api/projects/' + a['id'], json=a).status_code == 409
    # New application lifecycle and DB connection must recover persisted data.
    with TestClient(app) as restarted:
        assert restarted.get('/api/projects/' + a['id']).json() == saved
        assert restarted.get('/api/projects/' + b['id']).json()['methodology'] == 'Agile'
        assert len(restarted.get('/api/projects').json()) == 2
    with db.connection() as connection:
        events = connection.execute('SELECT * FROM project_audit WHERE project_id=?', (a['id'],)).fetchall()
        assert len(events) == 2
        assert json.loads(events[-1]['previous'])['priority'] == 'Alta'
        assert json.loads(events[-1]['next'])['priority'] == 'Crítica'


def test_project_routes_reject_foreign_cut(client):
    a = client.post('/api/projects', json={'name': 'A'}).json()
    b = client.post('/api/projects', json={'name': 'B'}).json()
    cut = client.post('/api/projects/' + a['id'] + '/cuts', json={'report_date': '2026-10-02'}).json()
    assert client.get(f"/api/projects/{a['id']}/cuts/{cut['id']}").status_code == 200
    assert client.get(f"/api/projects/{b['id']}/cuts/{cut['id']}").status_code == 404
    assert client.get(f"/api/projects/{b['id']}/cuts").json() == []
    assert client.get('/api/projects/missing').status_code == 404


@pytest.mark.parametrize('fields', [
    {'name': '  '}, {'methodology': 'Unknown'}, {'priority': 'Invalid'},
    {'status': 'Invalid'}, {'start_date': '2026-10-02', 'target_date': '2026-10-01'},
    {'start_date': '2026-10-02', 'go_live': '2026-10-01'},
])
def test_project_validation(client, fields):
    assert client.post('/api/projects', json={'name': 'Valid', **fields}).status_code == 422
    assert client.get('/api/projects').json() == []


def test_v2_migration_preserves_published_data(tmp_path, monkeypatch):
    from app import migrations
    monkeypatch.setattr(db, 'DATA', tmp_path)
    with monkeypatch.context() as initial:
        initial.setattr(migrations, 'migrate_projects', lambda *args: None)
        initial.setattr(migrations, 'migrate_weekly', lambda *args: None)
        db.initialize()
    with db.connection() as connection:
        connection.execute("INSERT INTO projects(id,name,description,objective,created_at) VALUES('p','Original','','','2026-09-01')")
        connection.execute("INSERT INTO cuts(id,project_id,report_date,created_at,status,project_snapshot) VALUES('c','p','2026-09-25','2026-09-25','publicado',?)", ('{"name":"Nombre histórico"}',))
    db.initialize()
    db.initialize()
    with db.connection() as connection:
        project = connection.execute('SELECT * FROM projects').fetchone()
        assert project['methodology'] == 'Hybrid' and project['target_date'] is None
        assert project['updated_at'] == '2026-09-01'
        cut = connection.execute('SELECT * FROM cuts').fetchone()
        assert cut['status'] == 'publicado'
        assert json.loads(cut['project_snapshot']) == {'name': 'Nombre histórico'}
        assert connection.execute('SELECT MAX(version) FROM schema_version').fetchone()[0] == 4
    backups = list(tmp_path.glob('backup-v2-*.sqlite3'))
    assert len(backups) == 1
    with sqlite3.connect(backups[0]) as connection:
        assert connection.execute('SELECT MAX(version) FROM schema_version').fetchone()[0] == 2
        assert connection.execute('SELECT name FROM projects').fetchone()[0] == 'Original'
