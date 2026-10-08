from datetime import date
from uuid import uuid4
import pytest
from fastapi import HTTPException
from app.services.capacity import capacity
from test_phase2 import client
from test_pmo import base,work

def assignment(identity,percent,start=None,end=None,**values):
    return dict(id=identity,person_id='u',project_id='p',project_name='Proyecto',role='PM',allocation=percent,valid_from=start,valid_to=end,archived=False,**values)

def test_capacity_inclusive_overlap_and_weighted_average():
    rows=[assignment('a',60,'2026-01-01','2026-01-05'),assignment('b',50,'2026-01-05','2026-01-10')]
    result=capacity([{'id':'u','name':'Ana'}],rows,date(2026,1,1),date(2026,1,10))[0]
    assert result['peak']==110
    assert result['overloaded_days']==1
    assert result['average']==60
    assert [r['allocation'] for r in result['segments']]==[60,110,50]
    assert result['segments'][1]['start']==result['segments'][1]['end']=='2026-01-05'

def test_capacity_disjoint_ranges_archives_open_dates_and_zero():
    archived=assignment('z',100);archived['archived']=True
    rows=[assignment('a',60,None,'2026-01-04'),assignment('b',70,'2026-01-06',None),archived]
    result=capacity([{'id':'u','name':'Ana'},{'id':'none','name':'Libre'}],rows,date(2026,1,1),date(2026,1,10))
    assert result[0]['overloaded_days']==0
    assert [r['allocation'] for r in result[0]['segments']]==[60,0,70]
    assert result[1]['peak']==0
    assert capacity([{'id':'u','name':'Ana'}],[assignment('a',0)],date(9999,12,31),date(9999,12,31))[0]['average']==0
    for start,end in [(date(2026,1,2),date(2026,1,1)),(date(2026,1,1),date(2027,1,2))]:
        with pytest.raises(HTTPException):capacity([],[],start,end)

def test_capacity_api_includes_other_projects_only_for_current_roster(client):
    p,c,b=base(client);q,_,qb=base(client)
    person=client.post(b+'/people',json={'new_person':{'name':'Ana'}}).json()
    client.post(qb+'/people',json={'person_id':person['id']})
    for path,amount in [(b,60),(qb,50)]:
        assert client.post(path+'/pmo/memberships',json={'person_id':person['id'],'role':'PM','allocation':amount}).status_code==201
    response=client.get(b+'/capacity?start=2026-01-01&end=2026-01-10')
    assert response.status_code==200,response.text
    row=response.json()['people'][0];assert row['peak']==110
    assert {a['project_id'] for a in row['segments'][0]['assignments']}=={p['id'],q['id']}
    other,_,ob=base(client)
    assert client.get(ob+'/capacity?start=2026-01-01&end=2026-01-10').json()['people']==[]
    assert client.get(b+'/capacity?start=2026-01-10&end=2026-01-01').status_code==422

def test_comment_idempotency_scope_and_no_master_mutation(client):
    p,c,b=base(client);item=work(client,b,'A');path=b+'/items/'+item['id']+'/comments'
    payload={'text':'Una nota\ncon detalle','request_id':str(uuid4())}
    saved=client.post(path,json=payload);assert saved.status_code==201,saved.text
    assert client.post(path,json=payload).json()==saved.json()
    assert len(client.get(path).json())==1
    assert client.get(b+'/items').json()[0]==item
    assert client.post(path,json={**payload,'text':'Otro texto'}).status_code==409
    assert client.post(path,json={'text':'   ','request_id':str(uuid4())}).status_code==422
    q,_,qb=base(client)
    foreign=qb+'/items/'+item['id']+'/comments'
    assert client.get(foreign).status_code==404
    assert client.post(foreign,json=payload).status_code==404

def test_comments_and_period_reassignment_preserve_published_cut(client):
    from test_phase2 import get,change
    from test_weekly_integration import publish
    p,c,b=base(client)
    iteration=client.post(b+'/pmo/periods',json={'kind':'Iteration','name':'Sprint 1'}).json()
    release=client.post(b+'/pmo/periods',json={'kind':'Release','name':'Entrega 1'}).json()
    item=work(client,b,'A',iteration_id=iteration['id'],release_id=release['id'])
    cut=client.post(b+'/cuts',json={'report_date':'2026-10-06','from_master':True}).json()
    for row in get(client,cut)['records']:client.patch('/api/records/'+row['id'],json=change(row))
    assert publish(client,cut).status_code==200
    frozen=get(client,cut)
    assert client.post(b+'/items/'+item['id']+'/comments',json={'text':'Nota posterior','request_id':str(uuid4())}).status_code==201
    updated=client.put(b+'/items/'+item['id'],json={**item,'iteration_id':None})
    assert updated.status_code==200
    assert updated.json()['release_id']==release['id']
    assert client.put(b+'/items/'+item['id'],json=item).status_code==409
    assert get(client,cut)==frozen

def test_organization_cycles_versions_and_preservation(client):
    from app.db import connection
    import sqlite3
    p,c,b=base(client)
    a=client.post(b+'/people',json={'new_person':{'name':'Líder'}}).json()
    child=client.post(b+'/people',json={'new_person':{'name':'Persona'}}).json()
    saved=client.put('/api/people/'+child['id']+'/organization',json={'version':child['version'],'leader_id':a['id'],'role':'Analista'})
    assert saved.status_code==200,saved.text
    assert saved.json()['email']==child['email']
    assert client.put('/api/people/'+a['id']+'/organization',json={'version':a['version'],'leader_id':child['id']}).status_code==422
    assert client.put('/api/people/'+a['id']+'/organization',json={'version':a['version'],'leader_id':a['id']}).status_code==422
    assert client.put('/api/people/'+child['id']+'/organization',json={'version':child['version'],'leader_id':None}).status_code==409
    renamed=client.put('/api/people/'+child['id'],json={'version':saved.json()['version'],'name':'Persona nueva','email':''})
    assert renamed.status_code==200
    assert renamed.json()['leader_id']==a['id'] and renamed.json()['role']=='Analista'
    with pytest.raises(sqlite3.IntegrityError):
        with connection() as db:db.execute('UPDATE people SET leader_id=? WHERE id=?',(child['id'],a['id']))

def test_organization_schema_migration_backup(tmp_path,monkeypatch):
    from app import db,migrations
    import sqlite3
    monkeypatch.setattr(db,'DATA',tmp_path)
    with monkeypatch.context() as old:
        old.setattr(migrations,'migrate_management',lambda *args:None)
        old.setattr(migrations,'migrate_operation_details',lambda *args:None)
        old.setattr(migrations,'migrate_organization',lambda *args:None);db.initialize()
    with db.connection() as conn:
        conn.execute("INSERT INTO projects(id,name,description,objective,created_at) VALUES('p','Anterior','','','2026-10-01')")
        conn.execute("INSERT INTO people(id,name,email,created_at,updated_at) VALUES('u','Ana','','2026-10-01','2026-10-01')")
    db.initialize();db.initialize()
    with db.connection() as conn:
        row=dict(conn.execute('SELECT * FROM people').fetchone())
        assert row['name']=='Ana' and row['leader_id'] is None and row['role']==''
        assert conn.execute('PRAGMA foreign_key_check').fetchall()==[]
        assert conn.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]==11
    backups=list(tmp_path.glob('backup-v6-*.sqlite3'));assert len(backups)==1
    with sqlite3.connect(backups[0]) as conn:assert conn.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]==6
