import sqlite3
import pytest
from app import db,migrations
from test_phase2 import client,get,change
from test_pmo import base,work
from test_weekly_integration import publish

def setup(client):
    p,c,b=base(client)
    person=client.post(b+'/people',json={'new_person':{'name':'Ana'}}).json()
    event=client.post(b+'/pmo/events',json={'title':'Revisión','date':'2026-10-08','time':'09:00','kind':'Reunión','owner_id':person['id'],'description':'Revisar acuerdos'}).json()
    document=client.post(b+'/documents',files={'file':('minuta.txt',b'Original externo: revisar entrega')},data={'description':'Minuta'}).json()
    response=client.post(b+'/events/'+event['id']+'/minutes',json={'document_id':document['id']})
    assert response.status_code==201,response.text
    return p,c,b,person,event,document,response.json()

def proposal(client,b,m,**values):
    response=client.post(b+'/minutes/'+m['id']+'/proposals',json={'kind':'action','text':'Validar entrega',**values})
    assert response.status_code==201,response.text
    return response.json()

def test_original_context_no_auto_truth_and_link_review(client):
    p,c,b,person,event,document,m=setup(client)
    item=work(client,b,'A',include_in_report=False)
    before=client.get(b+'/items').json()
    value=proposal(client,b,m,owner_id=person['id'],target_date='2026-10-12')
    assert client.get(b+'/items').json()==before
    assert client.get(b+'/minute-contract').json()['automatic_extraction'] is False
    assert client.post(b+'/events/'+event['id']+'/minutes',json={'document_id':document['id']}).json()['id']==m['id']
    path=b+'/minute-proposals/'+value['id']+'/review'
    review={'version':1,'action':'link','item_id':item['id'],'executive_candidate':True,'reviewer_id':person['id']}
    accepted=client.post(path,json=review)
    assert accepted.status_code==200,accepted.text
    assert accepted.json()['status']=='accepted'
    assert client.post(path,json=review).status_code==409
    items=client.get(b+'/items').json()
    assert len(items)==len(before) and items[0]['include_in_report']==1
    assert len(client.get(b+'/attachments/item/'+item['id']).json())==1
    assert client.get(b+'/documents/'+document['id']+'/download').content==b'Original externo: revisar entrega'
    assert len(client.get(b+'/documents').json())==1
    future=client.post(b+'/cuts',json={'report_date':'2099-10-08','from_master':True}).json()
    evidence=get(client,future)['cut']['project_snapshot']['pmo']
    assert len(evidence['minute_candidates'])==1
    assert evidence['minute_candidates'][0]['item_id']==item['id']
    assert len(get(client,future)['records'])==1
    moved=client.post(b+'/events/'+event['id']+'/move',json={'version':event['version'],'date':'2026-10-09','time':'10:00'})
    assert moved.status_code==200,moved.text
    minute=client.get(b+'/events/'+event['id']+'/minutes').json()[0]
    assert minute['meeting_date']=='2026-10-08' and minute['participants']==[person['id']]

def test_review_transaction_scope_duplicate_codes_and_decisions(client):
    p,c,b,person,event,document,m=setup(client)
    q,_,qb=base(client);foreign=work(client,qb,'F')
    v=proposal(client,b,m)
    path=b+'/minute-proposals/'+v['id']+'/review'
    assert client.post(path,json={'version':1,'action':'link','item_id':foreign['id']}).status_code==404
    assert client.get(qb+'/events/'+event['id']+'/minutes').status_code==404
    item=work(client,b,'A')
    new={'kind':'Activity','code':'A','name':'Duplicado'}
    assert client.post(path,json={'version':1,'action':'create','new_item':new}).status_code==409
    assert client.get(b+'/events/'+event['id']+'/minutes').json()[0]['proposals'][0]['status']=='pending'
    new['code']='B'
    accepted=client.post(path,json={'version':1,'action':'create','new_item':new})
    assert accepted.status_code==200,accepted.text
    assert len(client.get(b+'/items').json())==2
    decision=proposal(client,b,m,kind='decision',text='Se acepta el alcance')
    saved=client.post(b+'/minute-proposals/'+decision['id']+'/review',json={'version':1,'action':'decision','executive_candidate':True})
    assert saved.status_code==200 and saved.json()['decision_id']
    ignored=proposal(client,b,m,text='No aplicable')
    path=b+'/minute-proposals/'+ignored['id']+'/review'
    assert client.post(path,json={'version':1,'action':'ignore','executive_candidate':True}).status_code==422
    assert client.post(path,json={'version':1,'action':'ignore'}).json()['status']=='ignored'
    with pytest.raises(sqlite3.IntegrityError):
        with db.connection() as connection:
            connection.execute('UPDATE meeting_minutes SET meeting_date=? WHERE id=?',('2026-10-10',m['id']))

def test_minutes_preserve_published_history(client):
    p,c,b,person,event,document,m=setup(client)
    item=work(client,b,'A')
    cut=client.post(b+'/cuts',json={'report_date':'2026-10-08','from_master':True}).json()
    for r in get(client,cut)['records']:client.patch('/api/records/'+r['id'],json=change(r))
    assert publish(client,cut).status_code==200
    frozen=get(client,cut)
    v=proposal(client,b,m,kind='risk',text='Riesgo revisado')
    accepted=client.post(b+'/minute-proposals/'+v['id']+'/review',json={'version':1,'action':'create','new_item':{'kind':'Risk','code':'R-M','name':'Riesgo revisado'}})
    assert accepted.status_code==200,accepted.text
    assert get(client,cut)==frozen

def test_minutes_migration_backup_preserves_existing_tables(tmp_path,monkeypatch):
    monkeypatch.setattr(db,'DATA',tmp_path)
    with monkeypatch.context() as old:
        old.setattr(migrations,'migrate_minutes',lambda *args:None);db.initialize()
    with db.connection() as connection:
        connection.execute("INSERT INTO projects(id,name,description,objective,created_at) VALUES('p','Original','','','2026-10-08')")
        before=dict(connection.execute('SELECT * FROM projects').fetchone())
    db.initialize();db.initialize()
    with db.connection() as connection:
        assert dict(connection.execute('SELECT * FROM projects').fetchone())==before
        assert connection.execute('PRAGMA foreign_key_check').fetchall()==[]
        assert connection.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]==11
    backups=list(tmp_path.glob('backup-v10-*.sqlite3'));assert len(backups)==1
    with sqlite3.connect(backups[0]) as connection:
        assert connection.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]==10

def test_docx_original_reuses_report_source_without_copying_bytes(client):
    from test_workflow import doc_bytes
    p,c,b,person,event,document,m=setup(client)
    content=doc_bytes()
    imported=client.post('/api/cuts/'+c['id']+'/imports',files={'file':('original.docx',content)})
    assert imported.status_code==201,imported.text
    uploaded=client.post(b+'/documents',files={'file':('minuta.docx',content)},data={'description':'Minuta externa Word'})
    assert uploaded.status_code==201,uploaded.text
    identity=uploaded.json()['id']
    attached=client.post(b+'/events/'+event['id']+'/minutes',json={'document_id':identity})
    assert attached.status_code==201,attached.text
    with db.connection() as connection:
        original=connection.execute('SELECT content,source_id FROM documents WHERE id=?',(identity,)).fetchone()
        assert original['content']==b'' and original['source_id']
    assert client.get(b+'/documents/'+identity+'/download').content==content
    other,_,ob=base(client)
    assert client.post(ob+'/events/'+event['id']+'/minutes',json={'document_id':identity}).status_code==404
    pdf=client.post(b+'/documents',files={'file':('fuente.pdf',b'%PDF-1.4')},data={'description':'No minuta'}).json()
    assert client.post(b+'/events/'+event['id']+'/minutes',json={'document_id':pdf['id']}).status_code==422
