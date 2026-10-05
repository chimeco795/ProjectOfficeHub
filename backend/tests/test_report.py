from test_phase2 import client, project_cut

def test_report_history_scope_and_pmp(client):
    project,cut=project_cut(client)
    response=client.put('/api/cuts/'+cut['id'],json={'version':1,'metadata':{'planned':48,'actual':45,'pmp':{'schedule':'Amarillo'}}})
    assert response.status_code==200
    assert client.get('/api/cuts/'+cut['id']).json()['cut']['metadata']['pmp']['schedule']=='Amarillo'
    client.post('/api/projects/'+project['id']+'/cuts',json={'report_date':'2026-10-02'})
    project_cut(client) # Another project's data must not appear.
    points=client.get('/api/cuts/'+cut['id']+'/report-history').json()
    assert len(points)==1 and points[0]['actual']==45 and points[0]['status']=='borrador'
    assert client.put('/api/cuts/'+cut['id'],json={'version':2,'metadata':{'pmp':{'schedule':'Inventado'}}}).status_code==422


def test_report_branding_persistence_and_validation(client):
    _, cut = project_cut(client)
    metadata = {'report_brand': 'Marca de otro proyecto', 'report_title': 'Reporte propio', 'report_subtitle': 'Proyecto independiente', 'brand_logo': 'data:image/png;base64,aGVsbG8=', 'budget_status': 'Verde', 'scope_comment': 'Alcance aprobado'}
    response = client.put('/api/cuts/' + cut['id'], json={'version': 1, 'metadata': metadata})
    assert response.status_code == 200
    saved = client.get('/api/cuts/' + cut['id']).json()['cut']['metadata']
    assert all(saved[key] == value for key, value in metadata.items())
    for invalid in ('https://example.com/logo.png', 'data:image/svg+xml;base64,aGVsbG8='):
        assert client.put('/api/cuts/' + cut['id'], json={'version': 2, 'metadata': {'brand_logo': invalid}}).status_code == 422


def test_report_history_excludes_unpublished_other_weeks_and_checks_project(client):
    from test_phase2 import get
    from test_weekly_integration import publish
    project,first=project_cut(client)
    base=f"/api/projects/{project['id']}/cuts"
    draft=client.post(base,json={'report_date':'2026-10-02'}).json()
    current=client.post(base,json={'report_date':'2026-10-09'}).json()
    other,_=project_cut(client)
    assert client.get(f"/api/projects/{other['id']}/cuts/{current['id']}/report-history").status_code==404
    assert publish(client,first).status_code==200
    route=base+'/'+current['id']+'/report-history'
    assert [p['id'] for p in client.get(route).json()]==[first['id'],current['id']]
    assert publish(client,current).status_code==200
    original=client.get(route).json()
    assert publish(client,draft).status_code==200
    assert client.get(route).json()==original


def test_report_publication_preserves_brand_numbers_and_project(client):
    from test_phase2 import get
    from test_weekly_integration import publish
    project,cut=project_cut(client)
    metadata={'planned':0,'actual':0,'report_title':'Reporte histórico','report_brand':'Marca guardada','semaphore':'Amarillo'}
    assert client.put('/api/cuts/'+cut['id'],json={'version':cut['version'],'metadata':metadata}).status_code==200
    assert publish(client,cut).status_code==200
    original=get(client,cut)
    assert client.put('/api/projects/'+project['id'],json={**project,'name':'Proyecto renombrado','go_live':'2028-01-01'}).status_code==200
    assert get(client,cut)==original
    assert original['cut']['metadata']['planned']==0
    assert original['cut']['metadata']['actual']==0
    assert original['cut']['project_snapshot']['name']==project['name']
