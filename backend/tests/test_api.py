"""API ke tests: alag in-memory SQLite, asli nas_data.db ko haath nahi lagate."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from db.database import Base, NasData, NasDataRevision, get_db
from main import app


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    with Session() as db:
        db.add(NasDataRevision(revision_id=1, revision_name="test"))
        db.add_all(
            [
                NasData(  # id=1: flagged anomaly
                    revision_id=1, indicator="Gross Domestic Product", frequency="Annual",
                    year="2022-23", year_int=2022, current_price=100.0, constant_price=90.0,
                    is_anomaly=True, flagged_for_review=True, is_rejected=False, anomaly_score=3.5,
                ),
                NasData(  # id=2: normal row
                    revision_id=1, indicator="Gross Value Added", frequency="Annual",
                    year="2021-22", year_int=2021, current_price=50.0, constant_price=45.0,
                    is_anomaly=False, flagged_for_review=False, is_rejected=False, anomaly_score=0.1,
                ),
            ]
        )
        db.commit()

    def override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    # `with` nahi: startup event (asli DB banana) chalane ki zaroorat nahi
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_all_data_returns_rows_as_floats(client):
    rows = client.get("/api/data/all").json()
    assert len(rows) == 2
    assert isinstance(rows[0]["current_price"], float)


def test_all_data_indicator_filter(client):
    rows = client.get("/api/data/all", params={"indicator": "Gross Domestic Product"}).json()
    assert [r["id"] for r in rows] == [1]


def test_status_when_nothing_ingested(client):
    assert "No data" in client.get("/api/data/status").json()["status"]


def test_anomaly_list(client):
    body = client.get("/api/anomalies/").json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == 1


def test_approve_clears_flag_but_keeps_row(client):
    assert client.post("/api/anomalies/1/approve").json()["status"] == "approved"
    assert client.get("/api/anomalies/").json()["total"] == 0
    assert len(client.get("/api/data/all").json()) == 2


def test_reject_is_soft_delete(client):
    assert client.post("/api/anomalies/1/reject").json()["status"] == "rejected"
    ids = [r["id"] for r in client.get("/api/data/all").json()]
    assert ids == [2]  # API se chhup gayi


def test_unknown_row_is_404(client):
    assert client.post("/api/anomalies/999/approve").status_code == 404
