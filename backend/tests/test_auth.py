from fastapi.testclient import TestClient
from main import app


def test_login_success(client):
    response = client.post("/api/token", json={"email": "admin@local.test", "password": "admin"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "admin"
    assert data["email"] == "admin@local.test"


def test_login_invalid_password(client):
    response = client.post("/api/token", json={"email": "admin@local.test", "password": "wrong"})
    assert response.status_code == 401


def test_login_invalid_user(client):
    response = client.post("/api/token", json={"email": "nobody@local.test", "password": "admin"})
    assert response.status_code == 401
