import pytest
import sqlite3
from app import db
from test_phase2 import client, project_cut, get, change
from test_weekly_integration import publish


def setup(client):
    p,c=project_cut(client);base=f"/api/projects/{p['id']}"
    person=client.post(base+'/people',json={'new_person':{'name':'Ana','email':'ana@example.test'}}).json()
    response=client.post(base+'/items',json={'kind':'Risk','code':'R-1','name':'Entrega','status':'Rojo','owner_id':person['id']})
    assert response.status_code==201,response.text
    return p,c,base,person,response.json()


def test_master_identity_scope_and_conflicts(client):
    p,c,base,person,item=setup(client)
    assert client.post(base+'/items',json={**item,'code':'r-1'}).status_code==409
    assert client.post(base+'/people',json={'new_person':{'name':'Otra','email':'ANA@example.test'}}).status_code==409
    other,_=project_cut(client);otherbase=f"/api/projects/{other['id']}"
    assert client.post(otherbase+'/items',json=item).status_code==422
    assert client.post(otherbase+'/people',json={'person_id':person['id']}).status_code==201
    assert client.post(otherbase+'/items',json=item).status_code==201
    assert client.put(otherbase+'/items/'+item['id'],json=item).status_code==404
    assert client.put(base+'/items/'+item['id'],json={**item,'status':'Verde'}).status_code==200
    assert client.put(base+'/items/'+item['id'],json=item).status_code==409


def test_weekly_snapshot_freezes_and_copy_preserves_provenance(client):
    p,c,base,person,item=setup(client)
    c=client.post(base+'/cuts',json={'report_date':'2026-10-02','from_master':True}).json();cb=base+'/cuts/'+c['id']
    row=get(client,c)['records'][0];assert row['review']=='pendiente'
    assert publish(client,c).status_code==422
    assert client.patch('/api/records/'+row['id'],json=change(row)).status_code==200
    assert publish(client,c).status_code==200
    frozen=client.get(cb+'/bindings').json();assert frozen[0]['payload']['status']=='Rojo'
    assert client.put(base+'/items/'+item['id'],json={**item,'status':'Verde'}).status_code==200
    assert client.put('/api/people/'+person['id'],json={**person,'name':'Ana nueva'}).status_code==200
    assert client.get(cb+'/bindings').json()==frozen
    assert frozen[0]['master_snapshot']['owner_name']=='Ana'
    with pytest.raises(sqlite3.IntegrityError),db.connection() as conn:
        conn.execute('DELETE FROM weekly_item_snapshots WHERE cut_id=?',(c['id'],))
    copied=client.post(base+'/cuts',json={'report_date':'2026-10-09','copy_from':c['id']}).json()
    copiedrow=get(client,copied)['records'][0]
    assert copiedrow['parent_record_id']==row['id']
    assert client.get(base+'/cuts/'+copied['id']+'/bindings').json()[0]['frozen_at'] is None
    assert any(e['event']=='actualizar_persona' for e in client.get(base+'/audit').json())


def test_reconcile_pull_apply_and_duplicate_rollback(client):
    p,c,base,person,item=setup(client);cb=base+'/cuts/'+c['id']
    for _ in range(2):
        assert client.post('/api/cuts/'+c['id']+'/records',json={'section':'riesgos','current':{'description':'Semanal','status':'Amarillo'}}).status_code==201
    for row in get(client,c)['records']:
        assert client.patch('/api/records/'+row['id'],json=change(row)).status_code==200
    assert publish(client,c).status_code==422
    rows=get(client,c)['records'];row=rows[0];rb=cb+'/records/'+row['id']
    assert client.post(rb+'/reconcile',json={'record_version':row['version'],'item_id':item['id']}).status_code==200
    response=client.post(cb+'/records/'+rows[1]['id']+'/reconcile',json={'record_version':rows[1]['version'],'item_id':item['id']})
    assert response.status_code==409
    response=client.post(cb+'/records/'+rows[1]['id']+'/reconcile',json={'record_version':rows[1]['version'],'new_item':{'kind':'Activity','code':'BAD','name':'Incorrecto'}})
    assert response.status_code==422
    assert len(client.get(base+'/items').json())==1
    assert client.post(rb+'/pull',json={'record_version':row['version'],'item_version':item['version']}).status_code==409
    row=next(r for r in get(client,c)['records'] if r['id']==row['id'])
    assert client.post(rb+'/pull',json={'record_version':row['version'],'item_version':item['version']}).status_code==200
    row=next(r for r in get(client,c)['records'] if r['id']==row['id'])
    assert row['review']=='pendiente' and row['current']['status']=='Rojo' and row['original']=={}
    assert client.patch('/api/records/'+row['id'],json=change(row,status='Verde')).status_code==200
    row=next(r for r in get(client,c)['records'] if r['id']==row['id'])
    assert client.post(rb+'/apply',json={'record_version':row['version'],'item_version':item['version'],'values':{**item,'status':'Verde'}}).status_code==200
    assert client.get(base+'/items').json()[0]['status']=='Verde'

def test_v4_migration_preserves_published_cuts(tmp_path,monkeypatch):
    from app import migrations
    monkeypatch.setattr(db,'DATA',tmp_path)
    with monkeypatch.context() as before:
        before.setattr(migrations,'migrate_master',lambda *args:None)
        before.setattr(migrations,'migrate_pmo',lambda *args:None)
        db.initialize()
    with db.connection() as conn:
        conn.execute("INSERT INTO projects(id,name,description,objective,created_at) VALUES('p','Original','','','2026-09-01')")
        conn.execute("INSERT INTO cuts(id,project_id,report_date,created_at,status,metadata,project_snapshot,history_snapshot) VALUES('c','p','2026-09-25','2026-09-25','publicado','{}','{}','[]')")
        original=dict(conn.execute('SELECT * FROM cuts').fetchone())
    db.initialize();db.initialize()
    with db.connection() as conn:
        assert dict(conn.execute('SELECT * FROM cuts').fetchone())==original
        assert conn.execute('SELECT COUNT(*) FROM weekly_item_snapshots').fetchone()[0]==0
        assert conn.execute('PRAGMA foreign_key_check').fetchall()==[]
    backups=list(tmp_path.glob('backup-v4-*.sqlite3'));assert len(backups)==1
    with sqlite3.connect(backups[0]) as conn:
        assert conn.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]==4


def test_import_does_not_create_master_duplicates(client):
    from test_weekly_integration import excel_bytes
    p,c,base,person,item=setup(client)
    payload=excel_bytes()
    for filename in ['primero.xlsx','repetido.xlsx']:
        response=client.post('/api/cuts/'+c['id']+'/imports',files={'file':(filename,payload)})
        assert response.status_code in (201,409),response.text
    assert len(client.get(base+'/items').json())==1
    nextcut=client.post(base+'/cuts',json={'report_date':'2026-10-02'}).json()
    assert client.post('/api/cuts/'+nextcut['id']+'/imports',files={'file':('tercero.xlsx',payload)}).status_code==201
    assert len(client.get(base+'/items').json())==1


@pytest.mark.parametrize('operation',['insert','update','delete'])
def test_published_snapshot_sql_protection(client,operation):
    p,c,base,person,item=setup(client)
    c=client.post(base+'/cuts',json={'report_date':'2026-10-02','from_master':True}).json()
    row=get(client,c)['records'][0]
    client.patch('/api/records/'+row['id'],json=change(row))
    assert publish(client,c).status_code==200
    statements={
      'insert':"INSERT OR REPLACE INTO weekly_item_snapshots SELECT * FROM weekly_item_snapshots WHERE cut_id=?",
      'update':"UPDATE weekly_item_snapshots SET payload='{}' WHERE cut_id=?",
      'delete':"DELETE FROM weekly_item_snapshots WHERE cut_id=?"}
    with pytest.raises(sqlite3.IntegrityError),db.connection() as conn:
        conn.execute(statements[operation],(c['id'],))
