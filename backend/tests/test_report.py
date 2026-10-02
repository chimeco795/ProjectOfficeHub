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
