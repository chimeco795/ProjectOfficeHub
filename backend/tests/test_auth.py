import sqlite3
import time
import pytest
from fastapi.testclient import TestClient
from app import db
from app.main import app
from app.auth import COOKIE,digest,verify

ADMIN={'email':'admin@example.test','name':'Admin QA','password':'Synthetic admin phrase 2026'}

@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setattr(db,'DATA',tmp_path)
    with TestClient(app) as client:
        yield client

def bootstrap(client):
    response=client.post('/api/auth/bootstrap',json=ADMIN)
    assert response.status_code==201,response.text
    client.headers['x-pohub-csrf']=response.json()['csrf']
    return response

def login(client,email=ADMIN['email'],password=ADMIN['password'],remember=False):
    response=client.post('/api/auth/login',json={'email':email,'password':password,'remember':remember})
    assert response.status_code==200,response.text
    client.headers['x-pohub-csrf']=response.json()['csrf']
    return response

def test_bootstrap_protects_every_api_and_never_creates_person(client):
    assert client.get('/api/auth/status').json()['setup_required']
    for path in ['/api/projects','/api/people','/api/roles','/api/schema','/api/projects/p/source-files/s/download']:
        assert client.get(path).status_code==401
    assert client.post('/api/projects',json={'name':'blocked'}).status_code==401
    response=bootstrap(client)
    account=response.json()['account']
    assert account['security_role']=='Admin' and account['person_id'] is None
    assert 'password_hash' not in account and ADMIN['password'] not in response.text
    assert client.get('/api/people').json()==[]
    assert client.get('/api/roles').json()==[]
    assert client.post('/api/auth/bootstrap',json=ADMIN).status_code==409
    assert client.get('/api/auth/me').json()['account']['id']==account['id']
    with db.connection() as conn:
        stored=conn.execute('SELECT password_hash FROM access_accounts').fetchone()[0]
        assert stored!=ADMIN['password'] and stored.startswith('scrypt$') and verify(ADMIN['password'],stored)
        assert conn.execute('SELECT token_hash FROM access_sessions').fetchone()[0]!=client.cookies.get(COOKIE)
    assert 'httponly' in response.headers['set-cookie'].lower()
    assert 'samesite=strict' in response.headers['set-cookie'].lower()
    assert 'no-store' in client.get('/api/projects').headers['cache-control']

def test_csrf_and_origin_protect_writes_and_prelogin(client):
    assert client.post('/api/auth/bootstrap',json=ADMIN,headers={'origin':'https://attacker.test'}).status_code==403
    bootstrap(client)
    assert client.post('/api/projects',json={'name':'valid'}).status_code==201
    assert client.post('/api/projects',json={'name':'blocked'},headers={'x-pohub-csrf':''}).status_code==403
    assert client.post('/api/projects',json={'name':'blocked'},headers={'origin':'http://localhost:9999'}).status_code==403
    assert client.post('/api/auth/logout',headers={'sec-fetch-site':'cross-site'}).status_code==403
    assert len(client.get('/api/projects').json())==1

def test_login_rotation_remember_logout_and_expiry(client):
    bootstrap(client)
    first=client.cookies.get(COOKIE)
    response=login(client,remember=True)
    assert client.cookies.get(COOKIE)!=first
    assert 'max-age=2592000' in response.headers['set-cookie'].lower()
    assert response.json()['idle_seconds']==7*86400
    stale=TestClient(app);stale.cookies.set(COOKIE,first)
    assert stale.get('/api/projects').status_code==401
    current=client.cookies.get(COOKIE)
    assert client.post('/api/auth/logout').status_code==200
    stale.cookies.set(COOKIE,current)
    assert stale.get('/api/projects').status_code==401
    login(client)
    with db.connection() as conn:
        conn.execute('UPDATE access_sessions SET expires_at=?',(time.time()-1,))
    assert client.get('/api/projects').status_code==401
    login(client)
    with db.connection() as conn:
        conn.execute('UPDATE access_sessions SET last_seen=?',(time.time()-1801,))
    assert client.get('/api/projects').status_code==401

def test_login_failure_neutral_and_throttled(client):
    bootstrap(client)
    for email in [ADMIN['email'],'unknown@example.test']:
        response=client.post('/api/auth/login',json={'email':email,'password':'incorrect'})
        assert response.status_code==401 and response.json()['detail']=='Correo o contraseña incorrectos.'
    for _ in range(9):
        assert client.post('/api/auth/login',json={'email':ADMIN['email'],'password':'incorrect'}).status_code==401
    assert client.post('/api/auth/login',json={'email':ADMIN['email'],'password':ADMIN['password']}).status_code==429

@pytest.mark.parametrize('role',['Gestor','Miembro','Consulta'])
def test_security_roles_distinct_from_professional_roles(client,role):
    bootstrap(client)
    project=client.post('/api/projects',json={'name':'A'}).json()
    foreign=client.post('/api/projects',json={'name':'B'}).json()
    person=client.post('/api/projects/'+project['id']+'/people',json={'new_person':{'name':'PMO person'}}).json()
    professional=client.post('/api/roles',json={'name':'Tech Lead'}).json()
    response=client.post('/api/auth/accounts',json={'email':role.lower()+'@example.test','name':role,'password':'Synthetic member phrase 2026','security_role':role,'person_id':person['id']})
    assert response.status_code==201,response.text
    assert response.json()['security_role']==role
    login(client,role.lower()+'@example.test','Synthetic member phrase 2026')
    assert client.get('/api/projects').status_code==200
    assert client.get('/api/auth/accounts').status_code==403
    assert client.post('/api/auth/accounts',json=ADMIN).status_code==403
    assert client.post('/api/projects',json={'name':'new'}).status_code==(201 if role=='Gestor' else 403)
    payload={'kind':'Activity','code':'T','name':'Work','start_date':'2026-10-01','target_date':'2026-10-03'}
    work=client.post('/api/projects/'+project['id']+'/items',json=payload)
    assert work.status_code==(403 if role=='Consulta' else 201)
    if role!='Consulta':
        preview=client.post('/api/projects/'+project['id']+'/schedule/items/'+work.json()['id']+'/dates-preview',json={'start':'2026-10-02','end':'2026-10-04'})
        assert preview.status_code==200,preview.text
        assert client.post('/api/projects/'+project['id']+'/schedule/items/'+work.json()['id']+'/dates-apply',json=preview.json()).status_code==200
    assert client.post('/api/projects/'+foreign['id']+'/items',json=payload).status_code==(201 if role=='Gestor' else 403)
    assert client.put('/api/roles/'+professional['id'],json={**professional,'name':'changed'}).status_code==(200 if role=='Gestor' else 403)
    assert client.put('/api/auth/profile',json={'name':'New name'}).status_code==200
    result=client.put('/api/auth/preferences',json={'catalog_views':{'people':'cards'}})
    assert result.status_code==200 and result.json()['preferences']['catalog_views']['people']=='cards'

def test_password_change_revokes_other_sessions_without_changing_person(client):
    bootstrap(client)
    other=TestClient(app);login(other)
    before=client.get('/api/auth/me').json()['account']
    assert client.post('/api/auth/password',json={'current_password':'wrong','new_password':'Different synthetic phrase'}).status_code==400
    response=client.post('/api/auth/password',json={'current_password':ADMIN['password'],'new_password':'Different synthetic phrase'})
    assert response.status_code==200
    client.headers['x-pohub-csrf']=response.json()['csrf']
    assert other.get('/api/projects').status_code==401
    assert client.get('/api/auth/me').json()['account']['person_id']==before['person_id']
    assert client.post('/api/auth/login',json={'email':ADMIN['email'],'password':ADMIN['password']}).status_code==401
    login(client,password='Different synthetic phrase')

def test_neutral_recovery_single_use_and_expired_reset(client):
    bootstrap(client)
    admin=client.get('/api/auth/me').json()['account']
    assert client.post('/api/auth/recover',json={'email':ADMIN['email']}).json()==client.post('/api/auth/recover',json={'email':'missing@example.test'}).json()
    result=client.post('/api/auth/accounts/'+admin['id']+'/reset-link').json()
    token=result['path'].split('reset=')[1]
    with db.connection() as conn:
        assert conn.execute('SELECT token_hash FROM access_reset_tokens').fetchone()[0]==digest(token)
    new={'token':token,'new_password':'Recovery synthetic phrase 2026'}
    assert client.post('/api/auth/reset',json=new).status_code==200
    assert client.get('/api/projects').status_code==401
    assert client.post('/api/auth/reset',json=new).status_code==400
    login(client,password=new['new_password'])
    token=client.post('/api/auth/accounts/'+admin['id']+'/reset-link').json()['path'].split('reset=')[1]
    with db.connection() as conn:
        conn.execute('UPDATE access_reset_tokens SET expires_at=?',(time.time()-1,))
    assert client.post('/api/auth/reset',json={**new,'token':token}).status_code==400

def test_account_changes_versions_and_last_admin_guard(client):
    admin=bootstrap(client).json()['account']
    payload={'version':admin['version'],'security_role':'Consulta','active':True,'person_id':None}
    assert client.put('/api/auth/accounts/'+admin['id'],json=payload).status_code==409
    second=client.post('/api/auth/accounts',json={**ADMIN,'email':'second@example.test','security_role':'Admin'}).json()
    session=TestClient(app);login(session,'second@example.test')
    assert client.put('/api/auth/accounts/'+second['id'],json={**payload,'version':second['version']}).status_code==200
    assert session.get('/api/projects').status_code==401
    assert client.put('/api/auth/accounts/'+second['id'],json={**payload,'version':second['version']}).status_code==409
    disabled=client.put('/api/auth/accounts/'+second['id'],json={**payload,'version':second['version']+1,'active':False})
    assert disabled.status_code==200
    assert client.post('/api/auth/login',json={'email':'second@example.test','password':ADMIN['password']}).status_code==401

def test_downloads_require_live_session(client):
    bootstrap(client)
    project=client.post('/api/projects',json={'name':'Document project'}).json()
    response=client.post('/api/projects/'+project['id']+'/documents',files={'file':('proof.txt',b'original bytes','text/plain')},data={'description':'Proof'})
    assert response.status_code==201,response.text
    path='/api/projects/'+project['id']+'/documents/'+response.json()['id']+'/download'
    assert client.get(path).content==b'original bytes'
    assert TestClient(app).get(path).status_code==401
    client.post('/api/auth/logout')
    assert client.get(path).status_code==401

def test_validation_never_echoes_password_and_preferences_are_private(client):
    response=client.post('/api/auth/bootstrap',json={**ADMIN,'password':'tiny'})
    assert response.status_code==422 and 'tiny' not in response.text
    bootstrap(client)
    assert client.put('/api/auth/preferences',json={'catalog_views':{'unknown':'cards'}}).status_code==422
    assert client.put('/api/auth/preferences',json={'catalog_views':{'people':'cards'}}).status_code==200
    second=client.post('/api/auth/accounts',json={**ADMIN,'email':'other@example.test'}).json()
    other=TestClient(app);login(other,'other@example.test')
    assert other.get('/api/auth/me').json()['account']['preferences']=={}
    assert client.get('/api/auth/me').json()['account']['preferences']['catalog_views']['people']=='cards'

def test_local_owner_recovery_works_without_smtp(client):
    from app.recover_account import issue
    bootstrap(client)
    path=issue(ADMIN['email'])
    token=path.split('reset=')[1]
    assert client.post('/api/auth/reset',json={'token':token,'new_password':'Local recovery phrase 2026'}).status_code==200
    login(client,password='Local recovery phrase 2026')
    with db.connection() as conn:
        assert conn.execute("SELECT COUNT(*) FROM access_audit WHERE event='local-owner-reset'").fetchone()[0]==1
    with pytest.raises(ValueError):
        issue('missing@example.test')

def test_cookie_namespace_does_not_accept_another_instance_session(client,monkeypatch):
    from app import auth
    monkeypatch.setattr(auth,'COOKIE','isolated_qa_session')
    response=bootstrap(client)
    assert 'isolated_qa_session=' in response.headers['set-cookie']
    assert client.get('/api/projects').status_code==200
    token=client.cookies.get('isolated_qa_session')
    other=TestClient(app)
    other.cookies.set('pohub_session',token)
    assert other.get('/api/projects').status_code==401

def test_reset_always_requires_login_even_with_another_account_cookie(client):
    admin=bootstrap(client).json()['account']
    client.post('/api/auth/accounts',json={**ADMIN,'email':'other@example.test'})
    token=client.post('/api/auth/accounts/'+admin['id']+'/reset-link').json()['path'].split('reset=')[1]
    other=TestClient(app);login(other,'other@example.test')
    previous=other.cookies.get(COOKIE)
    assert other.post('/api/auth/reset',json={'token':token,'new_password':'Another recovery phrase 2026'}).status_code==200
    assert not other.cookies.get(COOKIE)
    stale=TestClient(app);stale.cookies.set(COOKIE,previous)
    assert stale.get('/api/projects').status_code==401
