"""
conftest.py - pytest fixtures for isolated in-memory test database.

Strategy:
  1. Set DATABASE_URL env var to in-memory sqlite BEFORE any app imports.
  2. Monkey-patch database.engine & database.SessionLocal to use test engine.
  3. Create all schema tables from ORM metadata (test-only).
  4. Override FastAPI's get_db dependency to use the test session.
  5. Provide a module-scoped TestClient that triggers the startup seeder.

This approach works even though database.py builds the engine at import time,
because we patch the module attributes used by SQLAlchemy sessions and DI.
"""
import os
import sys

# --- Must happen before ANY sentinel import ---
os.environ["DATABASE_URL"] = "sqlite://"   # pure in-memory, never persisted

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# ── Patch database module before other sentinel modules load ─────────────────
import database as _db_module

TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    # Force single connection so in-memory data survives across sessions
)

# Keep all sessions on the SAME underlying connection
_connection = TEST_ENGINE.connect()
_transaction = _connection.begin()

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=_connection,  # bind to shared connection, not the engine
)

# Patch the module-level attributes that routers and main.py reference
_db_module.engine = TEST_ENGINE
_db_module.SessionLocal = TestingSessionLocal

# ── Now import models & app (they will use the patched engine) ────────────────
import models
from database import Base

# Create all tables in the shared in-memory connection
Base.metadata.create_all(bind=_connection)

from main import app
from database import get_db


# ── Dependency override ───────────────────────────────────────────────────────
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ── Fixtures ──────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def client():
    """Module-scoped TestClient. The startup event seeds demo users & services."""
    with TestClient(app) as c:
        yield c
