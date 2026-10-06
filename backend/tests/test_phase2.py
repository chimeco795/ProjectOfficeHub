import json
import sqlite3
import pytest
from fastapi.testclient import TestClient
from app import db
from app.main import app
from test_workflow import doc_bytes

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DATA', tmp_path)
    with TestClient(app) as client:
        yield client

def project_cut(client):
    project = client.post('/api/projects', json={'name':'Proyecto genérico','go_live':'2027-02-15'}).json()
    cut = client.post(f"/api/projects/{project['id']}/cuts", json={'report_date':'2026-09-25'}).json()
    return project,cut

def add(client, cut, text='Nueva actividad'):
    response=client.post(f"/api/cuts/{cut['id']}/records", json={'section':'actividades','current':{'description':text,'owner':'Pedro','percentage':0}})
    assert response.status_code==201,response.text
    return response.json()['id']

def get(client,cut):return client.get(f"/api/cuts/{cut['id']}").json()
def change(row, **fields):return {'id':row['id'],'version':row['version'],'review':'aceptado','section':row['section'],'current':{**row['current'],**fields}}

def test_manual_batch_atomicity_and_conflicts(client):
    _,cut=project_cut(client);add(client,cut);add(client,cut,'Otro registro')
    rows=get(client,cut)['records']
    changes=[change(rows[0],owner='Pablo'),change(rows[1],percentage=35)]
    changes[1]['version']=999
    assert client.patch(f"/api/cuts/{cut['id']}/records",json={'records':changes}).status_code==409
    assert get(client,cut)['records'][0]['current']['owner']=='Pedro'
    changes[1]['version']=1
    assert client.patch(f"/api/cuts/{cut['id']}/records",json={'records':changes}).status_code==200
    saved=get(client,cut)['records'][0]
    assert saved['source_id'] is None and saved['original']=={}
    assert saved['current']['owner']=='Pablo' and saved['modified']==1
    assert len(client.get('/api/records/'+saved['id']+'/audit').json())==2
    changes[0]['version']=2;changes[0]['current']['percentage']=101
    assert client.patch(f"/api/cuts/{cut['id']}/records",json={'records':changes}).status_code==422

def test_published_cut_immutable_snapshot_and_copy(client):
    project,cut=project_cut(client)
    client.post(f"/api/cuts/{cut['id']}/imports",files={'file':('source.docx',doc_bytes())})
    assert client.post(f"/api/cuts/{cut['id']}/publish",json={'version':get(client,cut)['cut']['version']}).status_code==422
    rows=get(client,cut)['records']
    assert client.patch(f"/api/cuts/{cut['id']}/records",json={'records':[change(r) for r in rows]}).status_code==200
    assert client.put(f"/api/cuts/{cut['id']}",json={'version':get(client,cut)['cut']['version'],'metadata':{'planned':48,'actual':45,'executive_comment':'Revisado'}}).status_code==200
    assert client.post(f"/api/cuts/{cut['id']}/publish",json={'version':get(client,cut)['cut']['version']}).status_code==200
    published=get(client,cut)
    row=published['records'][0]
    assert client.patch('/api/records/'+row['id'],json=change(row,owner='Cambio')).status_code==409
    assert client.post(f"/api/cuts/{cut['id']}/records",json={'section':'actividades','current':{'description':'No permitido'}}).status_code==409
    assert client.post(f"/api/cuts/{cut['id']}/imports",files={'file':('source.docx',doc_bytes())}).status_code==409
    assert client.put(f"/api/cuts/{cut['id']}",json={'version':3,'metadata':{'planned':99}}).status_code==409
    assert client.put('/api/projects/'+project['id'],json={**project,'name':'Nombre cambiado','go_live':'2027-03-01'}).status_code==200
    assert get(client,cut)['cut']['project_snapshot']['go_live']=='2027-02-15'
    response=client.post(f"/api/projects/{project['id']}/cuts",json={'report_date':'2026-10-02','copy_from':cut['id']})
    assert response.status_code==201,response.text
    next_cut=response.json();copied=get(client,next_cut)
    assert copied['cut']['metadata']=={} and copied['cut']['status']=='borrador'
    assert all(r['section']!='avance' and r['review']=='pendiente' for r in copied['records'])
    copied_row=copied['records'][0]
    assert copied_row['parent_record_id']==row['id']
    assert copied_row['original']==row['original']
    assert copied_row['source_id']!=row['source_id']
    assert client.patch('/api/records/'+copied_row['id'],json=change(copied_row,owner='Pablo')).status_code==200
    assert get(client,cut)==published or get(client,cut)['records']==published['records']

def test_validation_and_cross_project_copy(client):
    project,cut=project_cut(client);other,other_cut=project_cut(client)
    for current in [{'description':'A','percentage':-1},{'description':'A','end_date':'imposible'},{'description':'A','start_date':'2026-10-02','end_date':'2026-09-25'},{'description':''}]:
        assert client.post(f"/api/cuts/{cut['id']}/records",json={'section':'actividades','current':current}).status_code==422
    assert client.post(f"/api/projects/{other['id']}/cuts",json={'report_date':'2026-10-02','copy_from':cut['id']}).status_code==422
    add(client,other_cut);row=get(client,other_cut)['records'][0]
    assert client.patch(f"/api/cuts/{cut['id']}/records",json={'records':[change(row)]}).status_code==422
    assert client.put(f"/api/cuts/{cut['id']}",json={'version':999,'metadata':{}}).status_code==409
    assert client.post(f"/api/cuts/{cut['id']}/records",json={'section':'acciones','current':{'description':'Revisar dependencias','owner':'Equipo'}}).status_code==201

def test_v1_migration_preserves_data_and_creates_backup(tmp_path,monkeypatch):
    monkeypatch.setattr(db,'DATA',tmp_path)
    with sqlite3.connect(tmp_path/'pmo.sqlite3') as connection:
        connection.executescript('''
        CREATE TABLE schema_version(version INTEGER PRIMARY KEY);
        INSERT INTO schema_version VALUES(1);
        CREATE TABLE projects(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL,objective TEXT NOT NULL,start_date TEXT,go_live TEXT,close_date TEXT,status TEXT NOT NULL DEFAULT 'Activo',created_at TEXT NOT NULL);
        CREATE TABLE cuts(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),report_date TEXT NOT NULL,start_date TEXT,end_date TEXT,created_at TEXT NOT NULL,UNIQUE(project_id,report_date));
        INSERT INTO projects VALUES('old-project','Proyecto existente','','',NULL,NULL,NULL,'Activo','2026-09-01');
        INSERT INTO cuts VALUES('old-cut','old-project','2026-09-25',NULL,NULL,'2026-09-25');
        ''')
    db.initialize();db.initialize()
    with db.connection() as connection:
        assert connection.execute('SELECT name,version FROM projects').fetchone()['name']=='Proyecto existente'
        assert connection.execute('SELECT status FROM cuts').fetchone()['status']=='borrador'
        assert connection.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]==7
    backups=list(tmp_path.glob('backup-v1-*.sqlite3'))
    assert len(backups)==1
    with sqlite3.connect(backups[0]) as connection:
        assert connection.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]==1
