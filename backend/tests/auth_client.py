"""Legacy functional tests run through real Admin authentication, never a bypass."""
from fastapi.testclient import TestClient as RawTestClient

class TestClient(RawTestClient):
    __test__ = False
    def __enter__(self):
        super().__enter__()
        credentials={'email':'fixture-admin@example.test','password':'Fixture access phrase 2026','name':'Fixture Admin'}
        status=self.get('/api/auth/status').json()
        endpoint='/api/auth/bootstrap' if status['setup_required'] else '/api/auth/login'
        response=self.post(endpoint,json=credentials)
        assert response.status_code in (200,201),response.text
        self.headers['x-pohub-csrf']=response.json()['csrf']
        return self
