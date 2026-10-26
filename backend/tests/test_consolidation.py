import sqlite3
import pytest
from fastapi.testclient import TestClient
from app import db
from app.main import app
from test_auth import client,bootstrap,login,ADMIN

@pytest.mark.parametrize('role',['Miembro','Consulta'])
def test_project_read_acl_including_aliases_catalogs_and_downloads(client,role):
    bootstrap(client)
    own=client.post('/api/projects',json={'name':'Visible'}).json();foreign=client.post('/api/projects',json={'name':'Hidden secret'}).json()
    b='/api/projects/'+own['id'];f='/api/projects/'+foreign['id']
    person=client.post(b+'/people',json={'new_person':{'name':'Participant'}}).json()
    client.post(f+'/people',json={'person_id':person['id']})
    outsider=client.post(f+'/people',json={'new_person':{'name':'Hidden outsider'}}).json()
    # Use a second participant only in the authorized project as account identity.
    actor=client.post(b+'/people',json={'new_person':{'name':'Reader'}}).json()
    root=client.post('/api/roles',json={'name':'Root'}).json()
    r=client.post('/api/roles',json={'name':'Assigned','reports_to':root['id']}).json()
    hidden=client.post('/api/roles',json={'name':'Hidden role'}).json()
    team=client.post(b+'/pmo/teams',json={'name':'Allowed team'}).json()
    secret=client.post(f+'/pmo/teams',json={'name':'Hidden team'}).json()
    client.post(b+'/pmo/memberships',json={'person_id':person['id'],'role_id':r['id'],'team_id':team['id'],'allocation':20})
    client.post(f+'/pmo/memberships',json={'person_id':person['id'],'role_id':hidden['id'],'team_id':secret['id'],'allocation':70})
    cut=client.post(b+'/cuts',json={'report_date':'2026-10-22'}).json()
    hidden_cut=client.post(f+'/cuts',json={'report_date':'2026-10-22'}).json()
    doc=client.post(f+'/documents',files={'file':('secret.txt',b'private original')}).json()
    record=client.post('/api/cuts/'+hidden_cut['id']+'/records',json={'section':'actividades','current':{'description':'Secret'}})
    # Endpoint contract may require additional manual fields; a fixture record covers the alias.
    with db.connection() as connection:
        connection.execute("INSERT INTO records(id,cut_id,section,location,original,current) VALUES('hidden-record',?,'actividades','manual','{}','{}')",(hidden_cut['id'],))
    account=client.post('/api/auth/accounts',json={'email':role.lower()+'@example.test','name':role,'password':'Synthetic member phrase 2026','security_role':role,'person_id':actor['id']}).json()
    login(client,account['email'],'Synthetic member phrase 2026')
    assert {x['id'] for x in client.get('/api/projects').json()}=={own['id']}
    assert client.get(b).status_code==200 and client.get(b+'/cuts/'+cut['id']).status_code==200
    for path in [f,f+'/items',f+'/people',f+'/pmo/teams',f+'/document-library',f+'/documents/'+doc['id']+'/download',b+'/documents/'+doc['id']+'/download',b+'/cuts/'+hidden_cut['id'],
                 '/api/cuts/'+hidden_cut['id'],'/api/cuts/'+hidden_cut['id']+'/audit','/api/cuts/'+hidden_cut['id']+'/timeline','/api/cuts/'+hidden_cut['id']+'/report-history','/api/records/hidden-record/audit']:
        response=client.get(path);assert response.status_code==404,(path,response.text)
        assert 'Hidden secret' not in response.text and 'private original' not in response.text
    assert outsider['id'] not in {p['id'] for p in client.get('/api/people').json()}
    assert {t['id'] for t in client.get('/api/teams').json()}=={team['id']}
    assert {x['id'] for x in client.get('/api/roles').json()}=={root['id'],r['id']}
    assert {p['id'] for p in client.get('/api/people/'+person['id']+'/projects').json()}=={own['id']}
    capacity=client.get(b+'/capacity?start=2026-10-22&end=2026-10-23')
    assert capacity.status_code==200 and 'Hidden secret' not in capacity.text and foreign['id'] not in capacity.text
    assert client.get('/api/migrations').status_code==403
    assert client.get('/api/migrations/unknown/original').status_code==403
    payload={'kind':'Activity','code':'A','name':'Allowed write'}
    assert client.post(b+'/items',json=payload).status_code==(201 if role=='Miembro' else 403)
    assert client.post(f+'/items',json=payload).status_code==403
    document=client.post(b+'/documents',files={'file':('new.txt',b'new bytes')},data={'author_id':outsider['id']})
    assert document.status_code==(404 if role=='Miembro' else 403)
    # Scope is evaluated on every request, even with an existing session.
    with db.connection() as connection:connection.execute('DELETE FROM project_people WHERE person_id=?',(actor['id'],))
    assert client.get('/api/projects').json()==[] and client.get(b).status_code==404

@pytest.mark.parametrize('role',['Admin','Gestor','Consulta'])
def test_manager_scope_and_unlinked_reader(client,role):
    bootstrap(client)
    projects=[client.post('/api/projects',json={'name':n}).json() for n in ['A','B']]
    if role!='Admin':
        client.post('/api/auth/accounts',json={**ADMIN,'email':role.lower()+'@example.test','security_role':role})
        login(client,role.lower()+'@example.test')
    expected=2 if role in ('Admin','Gestor') else 0
    assert len(client.get('/api/projects').json())==expected
    for p in projects:assert client.get('/api/projects/'+p['id']).status_code==(200 if expected else 404)
    assert client.get('/api/auth/me').status_code==200

def test_explicit_role_and_team_identity_persist_independently_of_names(client):
    bootstrap(client)
    p=client.post('/api/projects',json={'name':'Identity'}).json();b='/api/projects/'+p['id']
    role=client.post('/api/roles',json={'name':'Any title','manages_multiple_teams':True}).json()
    named=client.post('/api/roles',json={'name':'TechLead'}).json()
    assert not named['manages_multiple_teams']
    renamed=client.put('/api/roles/'+role['id'],json={**role,'name':'Renamed'}).json()
    assert renamed['manages_multiple_teams']
    person=client.post(b+'/people',json={'new_person':{'name':'Leader'}}).json()
    teams=[client.post(b+'/pmo/teams',json={'name':n}).json() for n in ['Z','A']]
    original=teams[0]
    assert original['code'] and original['color'] and original['shape']
    for t in teams:assert client.post(b+'/pmo/memberships',json={'person_id':person['id'],'role_id':role['id'],'allocation':50,'team_id':t['id']}).status_code==201
    saved=client.put(b+'/pmo/teams/'+original['id'],json={**original,'code':'SRE','color':'#365baa','shape':'diamond','name':'Changed'}).json()
    client.post(b+'/pmo/teams',json={'name':'Another earlier alphabetic'})
    persisted=next(t for t in client.get('/api/teams').json() if t['id']==saved['id'])
    assert (persisted['code'],persisted['color'],persisted['shape'])==('SRE','#365baa','diamond')
    assert client.post(b+'/pmo/teams',json={'name':'Duplicate','code':'SRE'}).status_code==409
    assert client.put(b+'/pmo/teams/'+saved['id'],json={**saved,'color':'url(bad)'}).status_code==422
    assert client.put(b+'/pmo/teams/'+saved['id'],json={**saved,'shape':'<svg>'}).status_code==422

def test_additive_migration_preserves_all_old_values_and_is_idempotent(tmp_path,monkeypatch):
    from app import consolidation
    monkeypatch.setattr(db,'DATA',tmp_path)
    with monkeypatch.context() as context:
        context.setattr(consolidation,'migrate_consolidation',lambda *args:None)
        db.initialize()
    with db.connection() as connection:
        connection.execute("INSERT INTO projects(id,name,description,objective,created_at) VALUES('p','Preserve','','','2026-10-22')")
        connection.execute("INSERT INTO roles(id,name,name_key) VALUES('r','TechLead','techlead')")
        connection.execute("INSERT INTO roles(id,name,name_key) VALUES('plain','Engineer','engineer')")
        connection.execute("INSERT INTO teams(id,name) VALUES('t','Existing')")
        connection.execute("INSERT INTO project_teams VALUES('p','t')")
        tables=[r[0] for r in connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
        columns={t:[r[1] for r in connection.execute(f'PRAGMA table_info({t})')] for t in tables}
        before={t:connection.execute('SELECT '+','.join('"'+c+'"' for c in columns[t])+' FROM "'+t+'" ORDER BY rowid').fetchall() for t in tables}
    db.initialize();db.initialize()
    with db.connection() as connection:
        for t in tables:
            rows=connection.execute('SELECT '+','.join('"'+c+'"' for c in columns[t])+' FROM "'+t+'" ORDER BY rowid').fetchall()
            assert rows==before[t] if t!='schema_version' else rows[:-1]==before[t]
        assert connection.execute("SELECT manages_multiple_teams FROM roles WHERE id='r'").fetchone()[0]==1
        assert connection.execute("SELECT manages_multiple_teams FROM roles WHERE id='plain'").fetchone()[0]==0
        assert connection.execute("SELECT code FROM teams WHERE id='t'").fetchone()[0]=='EQ1'
        assert connection.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
        assert connection.execute('PRAGMA foreign_key_check').fetchall()==[]
    assert len(list(tmp_path.glob('backup-v12-*.sqlite3')))==1
