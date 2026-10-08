from fastapi import HTTPException
from app.services import master
from test_phase2 import client, get, change
from test_pmo import base,work
from test_weekly_integration import publish

def test_shift_preview_apply_scope_concurrency_and_snapshot(client):
    _,_,b=base(client)
    a=work(client,b,'A',start_date='2026-01-01',target_date='2026-01-02')
    child=work(client,b,'B',start_date='2026-01-10',target_date='2026-01-12',dependencies=[a['id']])
    cut=client.post(b+'/cuts',json={'report_date':'2026-10-08','from_master':True}).json()
    for row in get(client,cut)['records']:client.patch('/api/records/'+row['id'],json=change(row))
    assert publish(client,cut).status_code==200
    frozen=get(client,cut);before=client.get(b+'/items').json()
    path=b+'/schedule/items/'+a['id']
    result=client.post(path+'/shift-preview',json={'days':2}).json()
    assert result['errors']==[] and result['start']=='2026-01-03' and result['end']=='2026-01-04'
    assert client.get(b+'/items').json()==before
    _,_,other=base(client)
    assert client.post(other+'/schedule/items/'+a['id']+'/shift-preview',json={'days':2}).status_code==404
    assert client.post(path+'/shift-apply',json={'days':3,'fingerprint':result['fingerprint']}).status_code==409
    assert client.post(path+'/shift-apply',json={'days':2,'fingerprint':result['fingerprint']}).status_code==200
    assert get(client,cut)==frozen
    after=client.get(b+'/items').json()
    assert next(i for i in after if i['id']==child['id'])==child
    assert client.post(path+'/shift-apply',json={'days':2,'fingerprint':result['fingerprint']}).status_code==409
    assert any(e['event']=='mover_barra_cronograma' for e in client.get(b+'/audit').json())

def test_shift_rejects_dependencies_closed_overflow_and_atomic_audit_failure(client,monkeypatch):
    _,_,b=base(client)
    a=work(client,b,'A',start_date='2026-01-01',target_date='2026-01-02')
    child=work(client,b,'B',start_date='2026-01-10',target_date='2026-01-12',dependencies=[a['id']])
    def proposal(item,days):return client.post(b+'/schedule/items/'+item['id']+'/shift-preview',json={'days':days})
    p=proposal(a,8).json();assert p['errors']
    before=client.get(b+'/items').json()
    assert client.post(b+'/schedule/items/'+a['id']+'/shift-apply',json={'days':8,'fingerprint':p['fingerprint']}).status_code==422
    assert proposal(child,-8).json()['errors']
    p=proposal(a,1).json()
    def fail(*args,**kwargs):raise HTTPException(422,'audit rollback')
    with monkeypatch.context() as patch:
        patch.setattr(master,'audit',fail)
        assert client.post(b+'/schedule/items/'+a['id']+'/shift-apply',json={'days':1,'fingerprint':p['fingerprint']}).status_code==422
        assert client.get(b+'/items').json()==before
    closed=client.put(b+'/items/'+a['id'],json={**a,'status':'Closed'}).json()
    assert proposal(closed,1).status_code==422
    ancient=work(client,b,'Ancient',start_date='0001-01-01',target_date='0001-01-02')
    assert proposal(ancient,-1).status_code==422
