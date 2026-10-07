from io import BytesIO
import json
import sqlite3

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook

from app import db, migrations
from app.main import app
from test_phase2 import client, project_cut, get, change
from test_workflow import doc_bytes


def excel_bytes():
    book = Workbook()
    sheet = book.active
    sheet.title = 'Plan libre'
    sheet.append(['Tarea', 'Responsable', 'FIN'])
    sheet.append(['Entrega validada', 'Ana', '2026-10-10'])
    data = BytesIO(); book.save(data)
    return data.getvalue()


def publish(client, cut):
    current = get(client, cut)['cut']
    return client.post(f"/api/cuts/{cut['id']}/publish", json={'version': current['version']})


def test_word_excel_review_publication_copy_and_restart(client):
    project, cut = project_cut(client)
    base = f"/api/cuts/{cut['id']}"
    for name, content in [('avance.docx', doc_bytes()), ('plan.xlsx', excel_bytes())]:
        assert client.post(base + '/imports', files={'file': (name, content)}).status_code == 201
    detected = get(client, cut)
    assert len(detected['sources']) == 2
    assert publish(client, cut).status_code == 422
    original = detected['records'][0]['original']
    rows = [change(row) for row in detected['records']]
    rows[0]['current']['description'] = 'Corrección revisada dentro de PMO'
    assert client.patch(base + '/records', json={'records': rows}).status_code == 200
    latest = get(client, cut)['cut']
    assert client.put(base, json={'version': latest['version'], 'start_date':'2026-09-21','end_date':'2026-09-25',
        'metadata': {'planned':48,'actual':45,'executive_comment':'Semana validada'}}).status_code == 200
    reconcile_structured(client, project, cut)
    assert publish(client, cut).status_code == 200
    published = get(client, cut)
    assert published['records'][0]['original'] == original
    assert published['records'][0]['modified'] == 1
    assert client.post(base + '/imports', files={'file': ('otra.xlsx', excel_bytes())}).status_code == 409
    assert client.patch(base + '/records', json={'records': rows}).status_code == 409
    assert client.put('/api/projects/' + project['id'], json={**project,'name':'Proyecto actual distinto'}).status_code == 200
    copied = client.post(f"/api/projects/{project['id']}/cuts",json={'report_date':'2026-10-02','copy_from':cut['id']}).json()
    detail = get(client, copied)
    assert detail['cut']['metadata'] == {}
    assert all(row['review'] == 'pendiente' for row in detail['records'])
    assert all(row['section'] != 'avance' for row in detail['records'])
    with TestClient(app) as fresh:
        assert get(fresh, cut) == published
    listing = client.get(f"/api/projects/{project['id']}/cuts").json()
    assert listing[0]['pending_count'] == len(detail['records'])
    assert listing[1]['pending_count'] == 0
    events = client.get(base + '/timeline').json()
    assert [e['event'] for e in events].count('importar') == 2
    assert {'crear','registro','editar','publicar'} <= {e['event'] for e in events}


def test_content_change_invalidates_publication_version(client):
    project, cut = project_cut(client)
    base = f"/api/cuts/{cut['id']}"
    stale = get(client, cut)['cut']['version']
    record = client.post(base + '/records',json={'section':'riesgos','current':{'description':'Revisar riesgo'}})
    assert record.status_code == 201
    assert client.post(base + '/publish',json={'version':stale}).status_code == 409
    latest = get(client, cut)
    row = latest['records'][0]
    assert client.patch('/api/records/'+row['id'],json=change(row,owner='Otro responsable')).status_code == 200
    assert client.post(base + '/publish',json={'version':latest['cut']['version']}).status_code == 409
    reconcile_structured(client, project, cut)
    assert publish(client,cut).status_code == 200


def test_published_history_does_not_change_when_older_cut_is_published_later(client):
    project, first = project_cut(client)
    second = client.post(f"/api/projects/{project['id']}/cuts",json={'report_date':'2026-10-02'}).json()
    assert publish(client,second).status_code == 200
    original = client.get(f"/api/cuts/{second['id']}/report-history").json()
    assert len(original) == 1
    assert publish(client,first).status_code == 200
    assert client.get(f"/api/cuts/{second['id']}/report-history").json() == original


@pytest.mark.parametrize('operation', ['cut_update','cut_delete','record_insert','record_update','record_delete','source_insert','source_update','source_delete'])
def test_sql_cannot_change_published_content(client, operation):
    _, cut = project_cut(client)
    base = f"/api/cuts/{cut['id']}"
    client.post(base+'/imports',files={'file':('a.docx',doc_bytes())})
    detail = get(client,cut)
    client.patch(base+'/records',json={'records':[change(row) for row in detail['records']]})
    assert publish(client,cut).status_code == 200
    row_id=detail['records'][0]['id']; source_id=detail['sources'][0]['id']
    statements={
        'cut_update':("UPDATE cuts SET status='borrador' WHERE id=?",(cut['id'],)),
        'cut_delete':('DELETE FROM cuts WHERE id=?',(cut['id'],)),
        'record_insert':("INSERT INTO records(id,cut_id,section,location,original,current) VALUES('new',?,'general','manual','{}','{}')",(cut['id'],)),
        'record_update':("UPDATE records SET current='{}' WHERE id=?",(row_id,)),
        'record_delete':('DELETE FROM records WHERE id=?',(row_id,)),
        'source_insert':("INSERT INTO sources(id,cut_id,filename,kind,sha256,uploaded_at,original_file,mapping,warnings) VALUES('new',?,'file','docx','hash','now',X'00','{}','[]')",(cut['id'],)),
        'source_update':("UPDATE sources SET filename='changed' WHERE id=?",(source_id,)),
        'source_delete':('DELETE FROM sources WHERE id=?',(source_id,)),
    }
    with pytest.raises(sqlite3.IntegrityError):
        with db.connection() as connection:
            connection.execute(*statements[operation])


def test_v3_migration_preserves_data_and_creates_backup(tmp_path,monkeypatch):
    monkeypatch.setattr(db,'DATA',tmp_path)
    with monkeypatch.context() as before:
        before.setattr(migrations,'migrate_operation_details',lambda *args:None)
        before.setattr(migrations,'migrate_weekly',lambda *args:None)
        before.setattr(migrations,'migrate_master',lambda *args:None)
        before.setattr(migrations,'migrate_pmo',lambda *args:None)
        before.setattr(migrations,'migrate_organization',lambda *args:None)
        db.initialize()
    with db.connection() as connection:
        connection.execute("INSERT INTO projects(id,name,description,objective,created_at) VALUES('p','Original','','','2026-09-01')")
        connection.execute("INSERT INTO cuts(id,project_id,report_date,created_at,status,metadata,project_snapshot) VALUES('c','p','2026-09-25','2026-09-25','publicado','{\"planned\":48}','{\"name\":\"Histórico\"}')")
    db.initialize();db.initialize()
    with db.connection() as connection:
        cut=connection.execute('SELECT * FROM cuts').fetchone()
        assert json.loads(cut['project_snapshot']) == {'name':'Histórico'}
        assert json.loads(cut['history_snapshot'])[0]['planned'] == 48
        assert connection.execute('SELECT MAX(version) FROM schema_version').fetchone()[0] == 8
    backups=list(tmp_path.glob('backup-v3-*.sqlite3'))
    assert len(backups)==1
    with sqlite3.connect(backups[0]) as connection:
        assert connection.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]==3


def reconcile_structured(client, project, cut):
    kinds={'riesgos':'Risk','actividades':'Activity','dependencias':'Dependency','hitos':'Milestone'}
    for index,row in enumerate(get(client,cut)['records']):
        if row['section'] in kinds and row['review']=='aceptado':
            response=client.post(f"/api/projects/{project['id']}/cuts/{cut['id']}/records/{row['id']}/reconcile",json={
                'record_version':row['version'],'new_item':{'kind':kinds[row['section']],'code':f'REF-{index}','name':str(row['current'].get('description','Elemento'))}})
            assert response.status_code==200,response.text
