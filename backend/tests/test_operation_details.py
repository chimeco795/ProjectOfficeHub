from test_phase2 import client
from test_pmo import base, work
from app import db, migrations
import hashlib
import sqlite3


def test_event_move_preserves_content_and_rejects_stale_undo(client):
    _, _, b = base(client)
    person = client.post(b+'/people', json={'new_person': {'name': 'Organizador'}}).json()
    task = work(client, b, 'EVT')
    doc = client.post(b+'/documents', files={'file': ('agenda.txt', b'agenda')}).json()
    value = {'title': 'Revision', 'description': 'Revisar entregables',
             'date': '2026-10-06', 'time': '09:30', 'duration_minutes': 90,
             'owner_id': person['id'], 'guests': [person['id']],
             'related_id': task['id'], 'status': 'Confirmado',
             'notes': 'Acuerdos previos', 'document_ids': [doc['id']]}
    response = client.post(b+'/pmo/events', json=value)
    assert response.status_code == 201, response.text
    original = response.json()
    url = b+'/events/'+original['id']+'/move'
    moved = client.post(url, json={'version': original['version'], 'date': '2026-10-08', 'time': '14:00'})
    assert moved.status_code == 200, moved.text
    saved = moved.json()
    for key in value:
        if key not in ('date', 'time'):
            assert saved[key] == original[key]
    assert client.post(url, json={'version': original['version'], 'date': original['date'], 'time': original['time']}).status_code == 409
    undo = client.post(url, json={'version': saved['version'], 'date': original['date'], 'time': original['time']})
    assert undo.status_code == 200
    assert undo.json()['time'] == original['time']
    _, _, other = base(client)
    assert client.post(other+'/events/'+original['id']+'/move', json={'version': undo.json()['version'], 'date': original['date'], 'time': original['time']}).status_code == 404
    assert client.post(b+'/pmo/events', json={**value, 'duration_minutes': 0}).status_code == 422
    assert client.post(other+'/pmo/events', json=value).status_code == 422


def test_document_metadata_and_duplicate_preserve_original(client):
    _, _, b = base(client)
    person = client.post(b+'/people', json={'new_person': {'name': 'Autor local'}}).json()
    task = work(client, b, 'DOC')
    content = b'original bytes\x00'
    response = client.post(b+'/documents', files={'file': ('original.txt', content)},
                           data={'description': 'Criterios aprobados', 'author_id': person['id'], 'related_id': task['id']})
    assert response.status_code == 201, response.text
    doc = client.get(b+'/documents').json()[0]
    assert doc['notes'] == 'Criterios aprobados'
    assert doc['author_id'] == person['id']
    assert doc['related_id'] == task['id']
    duplicate = client.post(b+'/documents', files={'file': ('renamed.txt', content)}, data={'description': 'No sobrescribir'})
    assert duplicate.json()['reused'] is True
    assert client.get(b+'/documents').json() == [doc]
    assert client.get(b+'/documents/'+doc['id']+'/download').content == content


def test_source_metadata_reuses_bytes_without_changing_original_source(client):
    _, cut, b = base(client)
    content = b'original source bytes'
    digest = hashlib.sha256(content).hexdigest()
    with db.connection() as conn:
        conn.execute("INSERT INTO sources(id,cut_id,filename,kind,sha256,uploaded_at,original_file,mapping,warnings) VALUES('source-detail',?,'source.txt','docx',?,'2026-10-06',?,'{}','[]')", (cut['id'], digest, content))
        original = dict(conn.execute("SELECT * FROM sources WHERE id='source-detail'").fetchone())
    response = client.post(b+'/documents', files={'file': ('source.txt', content)}, data={'description': 'Descripcion operativa'})
    assert response.status_code == 201, response.text
    identity = response.json()['id']
    with db.connection() as conn:
        saved = dict(conn.execute('SELECT * FROM documents WHERE id=?', (identity,)).fetchone())
        assert saved['source_id'] == 'source-detail'
        assert saved['content'] == b''
        assert dict(conn.execute("SELECT * FROM sources WHERE id='source-detail'").fetchone()) == original
    assert client.get(b+'/documents/'+identity+'/download').content == content
    assert len(client.get(b+'/document-library').json()) == 1


def test_v8_migration_backup_idempotence_and_legacy_values(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DATA', tmp_path)
    with monkeypatch.context() as before:
        before.setattr(migrations,'migrate_management',lambda *args:None)
        before.setattr(migrations, 'migrate_operation_details', lambda *args: None)
        db.initialize()
    with db.connection() as conn:
        conn.execute("INSERT INTO projects(id,name,description,objective,created_at) VALUES('p','Previo','','','2026-10-01')")
        conn.execute("INSERT INTO events(id,project_id,title,date,time,kind,description,guests) VALUES('e','p','Anterior','2026-10-01','09:00','Reunion','Texto','[]')")
        original = dict(conn.execute('SELECT * FROM events').fetchone())
    db.initialize()
    db.initialize()
    with db.connection() as conn:
        saved = dict(conn.execute('SELECT * FROM events').fetchone())
        assert {key: saved[key] for key in original} == original
        assert saved['duration_minutes'] is None
        assert saved['status'] == 'Programado'
        assert conn.execute('PRAGMA foreign_key_check').fetchall() == []
        assert conn.execute('SELECT MAX(version) FROM schema_version').fetchone()[0] == 11
    backups = list(tmp_path.glob('backup-v7-*.sqlite3'))
    assert len(backups) == 1
    with sqlite3.connect(backups[0]) as conn:
        assert conn.execute('SELECT MAX(version) FROM schema_version').fetchone()[0] == 7
