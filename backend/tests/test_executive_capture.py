from test_phase2 import client, get, change
from test_pmo import base, work
from test_weekly_integration import publish
from app import db, migrations
import sqlite3

def new_cut(client,b,day='2026-10-07'):
    r=client.post(b+'/cuts',json={'report_date':day,'from_master':True})
    assert r.status_code==201,r.text
    return r.json()

def test_capture_progress_budget_scope_and_immutable_publication(client):
    p,_,b=base(client)
    epic=work(client,b,'EP',work_type='Epic',progress=99)
    feature=work(client,b,'FE',work_type='Feature',parent_id=epic['id'],progress=99)
    first=work(client,b,'A',parent_id=feature['id'],progress=20,status='Blocked',target_date='2026-10-06')
    second=work(client,b,'B',progress=60)
    _,_,other=base(client)
    work(client,other,'OTHER',progress=100,status='Blocked')
    for amount in ['0.10','0.20']:
        assert client.post(b+'/pmo/entries',json={'concept':'Cost','category':'QA','amount':amount,'currency':'MXN','kind':'Actual'}).status_code==201
    cut=new_cut(client,b);detail=get(client,cut);evidence=detail['cut']['project_snapshot']['pmo']
    assert evidence['progress']['proposed']==40
    assert detail['cut']['metadata']['actual']==40
    assert [i['code'] for i in evidence['blocked']]==['A']
    assert evidence['budget']['totals']=={'MXN':{'Actual':'0.30'}}
    assert evidence['schedule']['errors'] and evidence['schedule']['critical']==[]
    assert 'planned' not in detail['cut']['metadata']
    for row in detail['records']:
        assert client.patch('/api/records/'+row['id'],json=change(row)).status_code==200
    assert client.put(b+'/items/'+first['id'],json={**first,'progress':100,'status':'Closed'}).status_code==200
    assert client.put(b,json={**p,'name':'Current name changed'}).status_code==200
    assert publish(client,cut).status_code==200
    frozen=get(client,cut)
    assert frozen['cut']['project_snapshot']['pmo']==evidence
    assert frozen['cut']['project_snapshot']['name']==p['name']
    assert client.put(b+'/items/'+second['id'],json={**second,'progress':100}).status_code==200
    assert get(client,cut)==frozen
    next_cut=get(client,new_cut(client,b,'2026-10-08'))
    assert next_cut['cut']['project_snapshot']['pmo']['progress']['proposed']==100

def test_missing_progress_and_meeting_links_do_not_duplicate_or_copy_notes(client):
    _,_,b=base(client)
    task=work(client,b,'MEET',progress=None,include_in_report=False)
    event={'title':'QA meeting','date':'2026-10-06','time':'09:00','related_id':task['id'],'propose_executive':True,'notes':'PRIVATE NARRATIVE'}
    assert client.post(b+'/pmo/events',json={**event,'related_id':None}).status_code==422
    for _ in range(2):assert client.post(b+'/pmo/events',json=event).status_code==201
    cut=get(client,new_cut(client,b));pmo=cut['cut']['project_snapshot']['pmo']
    assert pmo['progress']['proposed'] is None
    assert len(pmo['meeting_proposals'])==2
    assert len(cut['records'])==1
    assert cut['records'][0]['review']=='pendiente'
    assert 'PRIVATE NARRATIVE' not in str(cut)
    _,_,other=base(client)
    assert client.post(other+'/pmo/events',json=event).status_code==404

def test_v9_migration_preserves_events_and_creates_backup(tmp_path,monkeypatch):
    monkeypatch.setattr(db,'DATA',tmp_path)
    with monkeypatch.context() as before:
        before.setattr(migrations,'migrate_executive_links',lambda *args:None)
        db.initialize()
    with db.connection() as conn:
        conn.execute("INSERT INTO projects(id,name,description,objective,created_at) VALUES('p','Old','','','2026-10-01')")
        conn.execute("INSERT INTO events(id,project_id,title,date,time,kind) VALUES('e','p','Existing','2026-10-01','09:00','Meeting')")
        old=dict(conn.execute('SELECT * FROM events').fetchone())
    db.initialize();db.initialize()
    with db.connection() as conn:
        saved=dict(conn.execute('SELECT * FROM events').fetchone())
        assert {k:saved[k] for k in old}==old and saved['propose_executive']==0
        assert conn.execute('PRAGMA foreign_key_check').fetchall()==[]
    backups=list(tmp_path.glob('backup-v8-*.sqlite3'));assert len(backups)==1
    with sqlite3.connect(backups[0]) as conn:assert conn.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]==8
