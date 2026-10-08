import sqlite3
import pytest
from app import db, migrations
from test_phase2 import client
from test_pmo import base, work


def test_roles_assignments_contacts_and_availability(client):
    p, c, b = base(client)
    q, _, qb = base(client)
    person = client.post(b+'/people', json={'new_person': {'name': 'Ana'}}).json()
    leader = client.post(b+'/people', json={'new_person': {'name': 'Luis'}}).json()
    root = client.post('/api/roles', json={'name': 'Dirección'}).json()
    role = client.post('/api/roles', json={'name': 'Analista', 'reports_to': root['id']}).json()
    assert client.put('/api/roles/'+root['id'], json={**root, 'reports_to': role['id']}).status_code == 422
    assert client.post('/api/roles', json={'name': ' analista '}).status_code == 409
    teams = [client.post(b+'/pmo/teams', json={'name': n}).json() for n in ['Uno', 'Dos']]
    membership = {'person_id': person['id'], 'role_id': role['id'], 'leader_id': leader['id'], 'allocation': 50, 'team_id': teams[0]['id']}
    saved = client.post(b+'/pmo/memberships', json=membership)
    assert saved.status_code == 201, saved.text
    assert saved.json()['role'] == 'Analista'
    assert client.post(b+'/pmo/memberships', json={**membership, 'team_id': teams[1]['id']}).status_code == 422
    assert client.post(b+'/pmo/memberships', json={**membership, 'team_id': teams[1]['id'], 'allow_multiple_teams': True}).status_code == 201
    foreign = client.post(qb+'/people', json={'new_person': {'name': 'Ajeno'}}).json()
    assert client.post(b+'/pmo/memberships', json={**membership, 'leader_id': foreign['id']}).status_code == 422
    contact = client.put('/api/people/'+person['id']+'/contact', json={'version': person['version'], 'phone': '123', 'location': 'México'})
    assert contact.status_code == 200, contact.text
    assert contact.json()['name'] == person['name']
    assert client.put('/api/people/'+person['id']+'/contact', json={'version': person['version']}).status_code == 409
    absence = {'person_id': person['id'], 'kind': 'Vacaciones', 'start_date': '2026-10-01', 'end_date': '2026-10-03'}
    assert client.post(b+'/availability', json=absence).status_code == 201
    assert client.post(qb+'/availability', json=absence).status_code == 422
    client.post(qb+'/people', json={'person_id': person['id']})
    assert len(client.get(qb+'/availability').json()) == 1
    capacity = client.get(b+'/capacity?start=2026-10-01&end=2026-10-03').json()['people']
    ana = next(x for x in capacity if x['id'] == person['id'])
    assert ana['peak'] == 100 and len(ana['availability']) == 1
    assert {x['id'] for x in client.get('/api/people/'+person['id']+'/projects').json()} == {p['id'], q['id']}
    assert client.put('/api/roles/'+role['id'],json={**role,'archived':True}).status_code==200
    edited=client.put(b+'/pmo/memberships/'+saved.json()['id'],json={**saved.json(),'allocation':45})
    assert edited.status_code==200,edited.text
    assert client.post(b+'/pmo/memberships',json=membership).status_code==422
    assert any(e['event']=='editar_rol' and e['entity_id']==role['id'] for e in client.get(b+'/audit').json())


def test_calendar_and_document_links_atomic_scope_and_versions(client):
    p, c, b = base(client)
    q, qc, qb = base(client)
    item = work(client, b, 'A')
    foreign = work(client, qb, 'B')
    calendar = {'days': [0, 1, 2, 3, 4], 'start_time': '08:00', 'end_time': '17:00'}
    response = client.put(b+'/working-calendar', json=calendar)
    assert response.status_code == 200, response.text
    assert client.put(b+'/working-calendar', json=calendar).status_code == 409
    assert client.get(b+'/working-calendars').json()[0]['days'] == calendar['days']
    assert client.put(b+'/working-calendar', json={**calendar, 'version': 1, 'days': [7]}).status_code == 422
    response = client.post(b+'/documents', files={'file': ('nota.txt', b'original')}, data={'description': 'Original'})
    assert response.status_code == 201, response.text
    document = client.get(b+'/documents').json()[0]
    body = {'version': document['version'], 'links': [{'target_kind': 'item', 'target_id': item['id']}, {'target_kind': 'cut', 'target_id': c['id']}]}
    path = b+'/documents/'+document['id']+'/links'
    assert client.put(path, json=body).status_code == 200
    assert client.put(path, json=body).status_code == 409
    assert client.put(path, json={'version': 2, 'links': [{'target_kind': 'item', 'target_id': foreign['id']}]}).status_code == 404
    assert len(client.get(b+'/attachments/item/'+item['id']).json()) == 1
    assert len(client.get(b+'/attachments/cut/'+c['id']).json()) == 1
    assert client.get(qb+'/attachments/item/'+item['id']).status_code == 404
    assert client.get(b+'/documents/'+document['id']+'/download').content == b'original'
    with pytest.raises(sqlite3.IntegrityError):
        with db.connection() as connection:
            connection.execute('INSERT INTO document_links VALUES(?,?,?)', (document['id'], 'item', foreign['id']))


def test_management_migration_preserves_legacy_and_backup(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DATA', tmp_path)
    with monkeypatch.context() as old:
        old.setattr(migrations, 'migrate_management', lambda *args: None)
        old.setattr(migrations, 'migrate_minutes', lambda *args: None)
        db.initialize()
    with db.connection() as connection:
        connection.execute("INSERT INTO projects(id,name,description,objective,created_at) VALUES('p','Anterior','','','2026-10-01')")
        connection.execute("INSERT INTO people(id,name,email,role,created_at,updated_at) VALUES('u','Ana','','Legado','2026-10-01','2026-10-01')")
        connection.execute("INSERT INTO project_people VALUES('p','u')")
        connection.execute("INSERT INTO memberships(id,project_id,person_id,role,allocation) VALUES('m','p','u','PM legado',60)")
        legacy = dict(connection.execute('SELECT * FROM memberships').fetchone())
    db.initialize(); db.initialize()
    with db.connection() as connection:
        saved = dict(connection.execute('SELECT * FROM memberships').fetchone())
        assert all(saved[k] == v for k, v in legacy.items())
        assert saved['role_id'] is None and saved['leader_id'] is None
        assert connection.execute('SELECT COUNT(*) FROM roles').fetchone()[0] == 0
        assert connection.execute('SELECT role FROM people').fetchone()[0] == 'Legado'
        assert connection.execute('PRAGMA foreign_key_check').fetchall() == []
    backups = list(tmp_path.glob('backup-v9-*.sqlite3'))
    assert len(backups) == 1
    with sqlite3.connect(backups[0]) as connection:
        assert connection.execute('SELECT MAX(version) FROM schema_version').fetchone()[0] == 9
