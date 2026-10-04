from fastapi.testclient import TestClient
from main import app
import pytest

def test_login_success():
    with TestClient(app) as client:
        response = client.post("/api/token", json={"email": "admin@local.test", "password": "admin"})
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

def test_login_invalid_password():
    with TestClient(app) as client:
        response = client.post("/api/token", json={"email": "admin@local.test", "password": "wrong"})
        assert response.status_code == 401

def test_login_invalid_user():
    with TestClient(app) as client:
        response = client.post("/api/token", json={"email": "nobody@local.test", "password": "admin"})
        assert response.status_code == 401
