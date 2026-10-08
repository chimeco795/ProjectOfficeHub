import json
import hashlib
import sqlite3
import pytest
from app import db,migrations
from test_phase2 import client,project_cut,get,change
from test_weekly_integration import publish


def base(client):
    p,c=project_cut(client)
    return p,c,f"/api/projects/{p['id']}"

def work(client,b,code,**values):
    r=client.post(b+'/items',json={'kind':'Activity','code':code,'name':code,'work_type':'Task',**values})
    assert r.status_code==201,r.text
    return r.json()


def test_planning_shared_identity_hierarchy_and_cycles(client):
    p,c,b=base(client)
    epic=work(client,b,'E',work_type='Epic');feature=work(client,b,'F',work_type='Feature',parent_id=epic['id'])
    first=work(client,b,'T',parent_id=feature['id'])
    second=work(client,b,'T2',dependencies=[first['id']])
    assert client.put(b+'/items/'+first['id'],json={**first,'dependencies':[second['id']]}).status_code==422
    assert client.put(b+'/items/'+epic['id'],json={**epic,'parent_id':feature['id']}).status_code==422
    assert client.put(b+'/items/'+epic['id'],json={**epic,'work_type':'Task'}).status_code==422
    other,_,ob=base(client)
    assert client.post(ob+'/items',json={**second,'code':'Other'}).status_code==422
    moved=client.put(b+'/items/'+first['id'],json={**first,'status':'Active'})
    assert moved.status_code==200
    assert client.put(b+'/items/'+first['id'],json=first).status_code==409
    assert next(i for i in client.get(b+'/items').json() if i['id']==first['id'])['status']=='Active'
    cut=client.post(b+'/cuts',json={'report_date':'2026-10-02','from_master':True}).json()
    for row in get(client,cut)['records']:client.patch('/api/records/'+row['id'],json=change(row))
    assert publish(client,cut).status_code==200
    frozen=get(client,cut)
    assert client.put(b+'/items/'+first['id'],json={**moved.json(),'status':'Closed'}).status_code==200
    assert get(client,cut)==frozen


def test_period_scope_and_version(client):
    _,_,b=base(client);_,_,ob=base(client)
    period=client.post(b+'/pmo/periods',json={'kind':'Iteration','name':'Sprint 1','start_date':'2026-10-01','end_date':'2026-10-14'}).json()
    task=work(client,b,'T',iteration_id=period['id'])
    assert client.post(ob+'/items',json={**task,'code':'other'}).status_code==422
    assert client.put(b+'/pmo/periods/'+period['id'],json={**period,'kind':'Release'}).status_code==422
    assert client.put(b+'/pmo/periods/'+period['id'],json={**period,'end_date':'2026-09-01'}).status_code==422
    assert client.put(b+'/pmo/periods/'+period['id'],json={**period,'name':'Sprint nuevo'}).status_code==200
    assert client.put(b+'/pmo/periods/'+period['id'],json=period).status_code==409


def test_budget_zero_exact_cents_currency_and_conflict(client):
    _,_,b=base(client)
    assert client.get(b+'/budget').json()=={'baseline':None,'totals':{}}
    value={'version':0,'approved':'0.00','contingency':'0.00','currency':'MXN'}
    saved=client.put(b+'/budget',json=value);assert saved.status_code==200,saved.text
    assert saved.json()['approved']=='0.00'
    assert client.put(b+'/budget',json=value).status_code==409
    for amount,currency in [('0.10','MXN'),('0.20','MXN'),('1.00','USD')]:
        assert client.post(b+'/pmo/entries',json={'concept':'Costo','category':'Prueba','kind':'Actual','amount':amount,'currency':currency}).status_code==201
    assert client.get(b+'/budget').json()['totals']=={'MXN':{'Actual':'0.30'},'USD':{'Actual':'1.00'}}
    assert client.post(b+'/pmo/entries',json={'concept':'Costo','category':'Prueba','amount':'0.001','currency':'MXN'}).status_code==422


def test_teams_memberships_events_and_scope(client):
    _,_,b=base(client);_,_,ob=base(client)
    person=client.post(b+'/people',json={'new_person':{'name':'Persona'}}).json()
    team=client.post(b+'/pmo/teams',json={'name':'Equipo','lead_id':person['id']}).json()
    value={'person_id':person['id'],'team_id':team['id'],'role':'QA','allocation':50}
    member=client.post(b+'/pmo/memberships',json=value);assert member.status_code==201,member.text
    assert client.post(ob+'/pmo/memberships',json=value).status_code==422
    assert client.put(ob+'/pmo/memberships/'+member.json()['id'],json=value).status_code==404
    assert client.post(b+'/pmo/memberships',json={**value,'allocation':101}).status_code==422
    event=client.post(b+'/pmo/events',json={'title':'Reunión','date':'2026-10-05','time':'09:30','guests':[person['id']]})
    assert event.status_code==201,event.text
    assert client.post(ob+'/pmo/events',json=event.json()).status_code==422
    assert client.put(b+'/pmo/events/'+event.json()['id'],json={**event.json(),'archived':True}).status_code==200
    assert client.get(b+'/pmo/events').json()[0]['archived']==1


def test_documents_original_download_versions_scope(client):
    _,_,b=base(client);_,_,ob=base(client);content=b'original unchanged\x00'
    response=client.post(b+'/documents',files={'file':('notes.txt',content)})
    assert response.status_code==201,response.text
    identity=response.json()['id'];assert response.json()['sha256']==hashlib.sha256(content).hexdigest()
    assert client.get(ob+'/documents/'+identity+'/download').status_code==404
    download=client.get(b+'/documents/'+identity+'/download');assert download.content==content
    assert download.headers['content-disposition'].startswith('attachment;')
    assert client.put(b+'/documents/'+identity,json={'version':1,'notes':'Revisado','archived':True}).status_code==200
    assert client.put(b+'/documents/'+identity,json={'version':1,'notes':'Viejo'}).status_code==409
    assert client.get(b+'/documents/'+identity+'/download').content==content


def legacy():
    return {'schemaVersion':3,'projects':[{'id':'P','name':'Origen','methodology':'Hybrid'}],
      'people':[{'id':'U','name':'Ana','email':'ana@example.test'}],
      'teams':[{'id':'T','name':'Equipo','leadId':'U','memberIds':['U']}],
      'projectTeams':[{'projectId':'P','teamId':'T'}],
      'workItems':[{'id':'A','projectId':'P','name':'Plan','type':'Task','assigneeId':'U','state':'Active','dependencies':[],'original':4,'complete':2,'remaining':2}],
      'events':[{'id':'E','title':'Revisión','date':'2026-10-05','time':'09:00','ownerId':'U','guests':['externo@example.test']}],
      'memberships':[{'id':'M','personId':'U','projectId':'P','teamId':'T','role':'PM','allocationPercentage':50}],
      'budgets':{'P':{'approved':100,'contingency':10,'currency':'MXN'}},
      'budgetEntries':[{'id':'B','projectId':'P','concept':'Licencia','category':'Software','type':'Actual','amount':0.10,'currency':'MXN','relatedId':'A'}]}

def migrate(client,data,action='preview',mapping=None):
    content=json.dumps(data).encode()
    return client.post('/api/migrations/pohub/'+action,files={'file':('source.pohub',content)},data={
        'source':'Origen QA','project_map':json.dumps(mapping or {'P':'__new__'}),'global_project':'P','confirm_hash':hashlib.sha256(content).hexdigest()})


def test_migration_preview_atomic_apply_idempotent_original(client):
    data=legacy();before=client.get('/api/projects').json()
    preview=migrate(client,data);assert preview.status_code==200,preview.text
    assert preview.json()['errors']==[],preview.text
    assert client.get('/api/projects').json()==before
    assert client.get('/api/people').json()==[]
    saved=migrate(client,data,'apply');assert saved.status_code==200,saved.text
    result=saved.json();assert result['applied']
    projects=client.get('/api/projects').json();assert len(projects)==1
    b='/api/projects/'+projects[0]['id'];assert len(client.get(b+'/items').json())==1
    assert client.get(b+'/budget').json()['totals']['MXN']['Actual']=='0.10'
    assert 'externo@example.test' in client.get(b+'/pmo/events').json()[0]['description']
    assert migrate(client,data,'apply').json()['already_applied']
    assert len(client.get('/api/projects').json())==1
    assert client.get('/api/migrations/'+result['batch_id']+'/original').content==json.dumps(data).encode()
    changed=legacy();changed['projects'][0]['name']='Cambio'
    assert migrate(client,changed,'apply').status_code==422
    assert client.get('/api/projects').json()==projects


def test_migration_invalid_reference_rolls_back_and_existing_project_not_overwritten(client):
    p,c,b=base(client);data=legacy();data['workItems'][0]['dependencies']=['missing']
    assert migrate(client,data,'apply',{'P':p['id']}).status_code==422
    assert client.get('/api/people').json()==[]
    assert client.get(b+'/items').json()==[]
    data=legacy();response=migrate(client,data,'apply',{'P':p['id']});assert response.status_code==200,response.text
    assert client.get('/api/projects/'+p['id']).json()['name']==p['name']


def test_v5_migration_backup_and_published_preservation(tmp_path,monkeypatch):
    monkeypatch.setattr(db,'DATA',tmp_path)
    with monkeypatch.context() as before:
        before.setattr(migrations,'migrate_management',lambda *args:None)
        before.setattr(migrations,'migrate_operation_details',lambda *args:None)
        before.setattr(migrations,'migrate_pmo',lambda *args:None)
        before.setattr(migrations,'migrate_organization',lambda *args:None);db.initialize()
    with db.connection() as conn:
        conn.execute("INSERT INTO projects(id,name,description,objective,created_at) VALUES('p','Anterior','','','2026-10-01')")
        conn.execute("INSERT INTO cuts(id,project_id,report_date,created_at,status,metadata,project_snapshot,history_snapshot) VALUES('c','p','2026-10-01','2026-10-01','publicado','{}','{}','[]')")
        original=dict(conn.execute('SELECT * FROM cuts').fetchone())
    db.initialize();db.initialize()
    with db.connection() as conn:
        assert dict(conn.execute('SELECT * FROM cuts').fetchone())==original
        assert conn.execute('PRAGMA foreign_key_check').fetchall()==[]
        assert conn.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]==11
    backups=list(tmp_path.glob('backup-v5-*.sqlite3'));assert len(backups)==1
    with sqlite3.connect(backups[0]) as conn:assert conn.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]==5

def test_migration_teams_follow_declared_projects_and_attachments_block(client):
    data=legacy()
    data['projects'].insert(0,{'id':'Q','name':'Sin equipo','methodology':'Hybrid'})
    result=migrate(client,data,'apply',{'P':'__new__','Q':'__new__'})
    assert result.status_code==200,result.text
    projects={p['name']:p['id'] for p in client.get('/api/projects').json()}
    assert client.get('/api/projects/'+projects['Sin equipo']+'/pmo/teams').json()==[]
    assert len(client.get('/api/projects/'+projects['Origen']+'/pmo/teams').json())==1
    blocked=legacy();blocked['attachments']=[{'id':'file','filename':'unknown.pdf'}]
    response=migrate(client,blocked)
    assert response.json()['errors']
    assert len(client.get('/api/migrations').json())==1
