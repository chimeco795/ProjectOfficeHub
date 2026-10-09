from fastapi import HTTPException
from app.services import master
from test_phase2 import client,get,change
from test_pmo import base,work
from test_weekly_integration import publish

def test_resize_dependency_scope_concurrency_undo_and_publication(client):
    _,_,b=base(client)
    pred=work(client,b,'P',start_date='2026-01-01',target_date='2026-01-02')
    item=work(client,b,'A',start_date='2026-01-05',target_date='2026-01-08',dependencies=[pred['id']])
    work(client,b,'S',start_date='2026-01-12',target_date='2026-01-15',dependencies=[item['id']])
    cut=client.post(b+'/cuts',json={'report_date':'2026-10-08','from_master':True}).json()
    for row in get(client,cut)['records']:client.patch('/api/records/'+row['id'],json=change(row))
    assert publish(client,cut).status_code==200
    frozen=get(client,cut);path=b+'/schedule/items/'+item['id'];before=client.get(b+'/items').json()
    def preview(start,end):return client.post(path+'/dates-preview',json={'start':start,'end':end})
    for start,end in [('2026-01-02','2026-01-08'),('2026-01-05','2026-01-12'),('2026-01-09','2026-01-08')]:
        p=preview(start,end).json();assert p['errors']
        assert client.post(path+'/dates-apply',json={**p}).status_code==422
    assert client.get(b+'/items').json()==before
    p=preview('2026-01-04','2026-01-10').json();assert not p['errors']
    _,_,other=base(client)
    assert client.post(other+'/schedule/items/'+item['id']+'/dates-preview',json=p).status_code==404
    assert client.post(path+'/dates-apply',json={**p,'end':'2026-01-11'}).status_code==409
    assert client.post(path+'/dates-apply',json=p).status_code==200
    assert client.post(path+'/dates-apply',json=p).status_code==409
    assert get(client,cut)==frozen
    undo=preview(item['start_date'],item['target_date']).json()
    assert client.post(path+'/dates-apply',json=undo).status_code==200
    current=next(i for i in client.get(b+'/items').json() if i['id']==item['id'])
    assert current['start_date']==item['start_date'] and current['target_date']==item['target_date']
    assert current['executive_priority']==item['executive_priority']

def test_resize_closed_and_atomic_audit_failure(client,monkeypatch):
    _,_,b=base(client);item=work(client,b,'A',start_date='2026-01-05',target_date='2026-01-08')
    path=b+'/schedule/items/'+item['id'];before=client.get(b+'/items').json()
    p=client.post(path+'/dates-preview',json={'start':'2026-01-05','end':'2026-01-10'}).json()
    def fail(*args,**kwargs):raise HTTPException(422,'rollback')
    with monkeypatch.context() as patch:
        patch.setattr(master,'audit',fail)
        assert client.post(path+'/dates-apply',json=p).status_code==422
        assert client.get(b+'/items').json()==before
    client.put(b+'/items/'+item['id'],json={**item,'status':'Closed'})
    assert client.post(path+'/dates-preview',json=p).status_code==422
