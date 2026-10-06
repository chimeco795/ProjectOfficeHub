from datetime import date
from fastapi import HTTPException
import pytest
from app.services.scheduler import calculate
from app.services import master
from test_phase2 import client
from test_pmo import base,work

def task(key,days=1,deps=None,**values):
    return dict(id=key,code=key,name=key,version=1,archived=False,status='Active',start_date='2026-01-01',target_date=f'2026-01-{days:02}',dependencies=deps or [],**values)

def test_parallel_critical_paths_and_durations():
    items=[task('A',2),task('B',3,['A']),task('C',1,['A']),task('D',2,['B','C'])]
    result=calculate(items,date(2026,1,1));rows={r['id']:r for r in result['rows']}
    assert result['finish']=='2026-01-07'
    assert rows['B']['start']=='2026-01-03'
    assert rows['C']['slack']==2
    assert [r['id'] for r in result['rows'] if r['critical']]==['A','B','D']
    assert items[1]['start_date']=='2026-01-01'
    assert [r['duration'] for r in result['rows']]==[2,3,1,2]

def test_missing_dates_archived_dependencies_cycles_and_overflow():
    a=task('A');a['target_date']=None
    assert calculate([a],date(2026,1,1))['errors']
    a=task('A');a['archived']=True
    assert calculate([a,task('B',deps=['A'])],date(2026,1,1))['errors']
    with pytest.raises(HTTPException):calculate([task('A',deps=['B']),task('B',deps=['A'])],date(2026,1,1))
    with pytest.raises(HTTPException):calculate([task('A',2)],date(9999,12,31))
    assert calculate([],date(2026,1,1))['rows']==[]

def test_fixed_finished_and_release_constraints():
    a=task('A',2);a['status']='Closed'
    result=calculate([a,task('B',deps=['A'])],date(2026,1,10))
    assert result['rows'][0]['start']=='2026-01-01'
    assert not result['rows'][0]['changed']
    assert result['rows'][1]['start']=='2026-01-10'
    b=task('B',deps=['A']);b['status']='Closed'
    assert calculate([a,b],date(2026,1,1))['errors']

def pair(client):
    p,c,b=base(client)
    a=work(client,b,'A',start_date='2026-01-01',target_date='2026-01-02')
    child=work(client,b,'B',start_date='2026-01-01',target_date='2026-01-03',dependencies=[a['id']])
    return p,c,b,a,child

def preview(client,b,anchor='2026-01-01'):
    r=client.post(b+'/schedule/preview',json={'anchor':anchor});assert r.status_code==200,r.text
    return r.json()

def test_preview_no_writes_apply_once_audit_and_scope(client):
    p,c,b,a,child=pair(client)
    before=client.get(b+'/items').json();result=preview(client,b)
    assert result['changes']==1
    assert client.get(b+'/items').json()==before
    r=client.post(b+'/schedule/apply',json={'anchor':'2026-01-01','fingerprint':result['fingerprint']})
    assert r.status_code==200,r.text
    saved={i['code']:i for i in client.get(b+'/items').json()}
    assert saved['B']['start_date']=='2026-01-03'
    assert saved['B']['target_date']=='2026-01-05'
    assert saved['A']['version']==a['version']
    assert saved['B']['version']==child['version']+1
    assert client.post(b+'/schedule/apply',json={'anchor':'2026-01-01','fingerprint':result['fingerprint']}).status_code==409
    from app.db import connection
    with connection() as db:assert db.execute("SELECT COUNT(*) FROM audit_events WHERE event='reprogramar'").fetchone()[0]==1
    other,_,ob=base(client)
    assert client.post(ob+'/schedule/apply',json={'anchor':'2026-01-01','fingerprint':preview(client,b)['fingerprint']}).status_code==409

def test_anchor_or_graph_change_invalidates_preview(client):
    p,c,b,a,child=pair(client);result=preview(client,b)
    assert client.post(b+'/schedule/apply',json={'anchor':'2026-01-02','fingerprint':result['fingerprint']}).status_code==409
    work(client,b,'C',start_date='2026-01-01',target_date='2026-01-02')
    before=client.get(b+'/items').json()
    assert client.post(b+'/schedule/apply',json={'anchor':'2026-01-01','fingerprint':result['fingerprint']}).status_code==409
    assert client.get(b+'/items').json()==before

def test_apply_rolls_back_entire_batch_if_audit_fails(client,monkeypatch):
    p,c,b,a,child=pair(client);result=preview(client,b,'2026-02-01');before=client.get(b+'/items').json()
    original=master.audit;calls=[]
    def fail_second(*args,**kwargs):
        calls.append(1)
        if len(calls)==2:raise HTTPException(422,'test rollback')
        return original(*args,**kwargs)
    monkeypatch.setattr(master,'audit',fail_second)
    response=client.post(b+'/schedule/apply',json={'anchor':'2026-02-01','fingerprint':result['fingerprint']})
    assert response.status_code==422
    assert client.get(b+'/items').json()==before

def test_publication_unchanged_after_rescheduling(client):
    from test_phase2 import get,change
    from test_weekly_integration import publish
    p,c,b,a,child=pair(client)
    cut=client.post(b+'/cuts',json={'report_date':'2026-10-06','from_master':True}).json()
    for row in get(client,cut)['records']:client.patch('/api/records/'+row['id'],json=change(row))
    assert publish(client,cut).status_code==200
    frozen=get(client,cut);result=preview(client,b,'2026-02-01')
    assert client.post(b+'/schedule/apply',json={'anchor':'2026-02-01','fingerprint':result['fingerprint']}).status_code==200
    assert get(client,cut)==frozen

def test_finished_successor_with_pending_predecessor_blocks_application(client):
    p,c,b,a,child=pair(client)
    response=client.put(b+'/items/'+child['id'],json={**child,'status':'Closed','start_date':'2026-01-03','target_date':'2026-01-05'})
    assert response.status_code==200
    result=preview(client,b);assert result['errors']
    before=client.get(b+'/items').json()
    assert client.post(b+'/schedule/apply',json={'anchor':'2026-01-01','fingerprint':result['fingerprint']}).status_code==422
    assert client.get(b+'/items').json()==before
