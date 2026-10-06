import hashlib
from app import db
from test_phase2 import client, get, change
from test_pmo import base
from test_workflow import doc_bytes
from test_weekly_integration import publish


def test_library_reuses_documents_including_archived_and_scopes_hashes(client):
    _,_,b=base(client);_,_,other=base(client)
    content=b'UX original source'
    first=client.post(b+'/documents',files={'file':('notes.txt',content)}).json()
    second=client.post(b+'/documents',files={'file':('renamed.txt',content)}).json()
    assert second['reused'] and first['id']==second['id']
    assert len(client.get(b+'/documents').json())==1
    assert client.put(b+'/documents/'+first['id'],json={'version':1,'archived':True}).status_code==200
    assert client.post(b+'/documents',files={'file':('again.txt',content)}).json()['archived']
    library=client.get(b+'/document-library').json()
    assert len(library)==1 and library[0]['archived']
    separate=client.post(other+'/documents',files={'file':('same.txt',content)}).json()
    assert separate['id']!=first['id']
    assert client.get(other+'/documents/'+first['id']+'/download').status_code==404
    assert client.get('/api/projects/missing/document-library').status_code==404


def test_library_sources_share_original_without_changing_published_history(client):
    _,cut,b=base(client);_,_,other=base(client)
    content=doc_bytes()
    response=client.post(f"/api/cuts/{cut['id']}/imports",files={'file':('weekly.docx',content)})
    assert response.status_code==201,response.text
    for record in get(client,cut)['records']:
        assert client.patch('/api/records/'+record['id'],json=change(record)).status_code==200
    assert publish(client,cut).status_code==200
    before=get(client,cut)
    copied=client.post(b+'/cuts',json={'report_date':'2026-10-02','copy_from':cut['id']}).json()
    library=client.get(b+'/document-library').json()
    assert len(library)==1
    entry=library[0]
    assert entry['origin']=='source' and entry['size']==len(content)
    assert {r['cut_id'] for r in entry['references']}=={cut['id'],copied['id']}
    assert client.get(entry['download_url']).content==content
    assert client.get(other+'/source-files/'+entry['id']+'/download').status_code==404
    reused=client.post(b+'/documents',files={'file':('same.docx',content)}).json()
    assert reused['reused'] and reused['origin']=='source'
    assert client.get(b+'/documents').json()==[]
    assert get(client,cut)==before


def test_library_groups_existing_document_and_source_without_losing_associations(client):
    _,cut,b=base(client);content=doc_bytes()
    doc=client.post(b+'/documents',files={'file':('project.docx',content)}).json()
    assert client.put(b+'/documents/'+doc['id'],json={'version':1,'archived':True,'notes':'Preserve me'}).status_code==200
    assert client.post(f"/api/cuts/{cut['id']}/imports",files={'file':('weekly.docx',content)}).status_code==201
    entry=client.get(b+'/document-library').json()[0]
    assert entry['origin']=='document' and entry['document_archived'] and not entry['archived']
    assert entry['notes']=='Preserve me'
    assert {r['kind'] for r in entry['references']}=={'document','source'}
    assert client.get(entry['download_url']).content==content
    with db.connection() as connection:
        assert connection.execute('SELECT COUNT(*) FROM documents').fetchone()[0]==1
        assert connection.execute('SELECT sha256 FROM sources').fetchone()[0]==hashlib.sha256(content).hexdigest()
