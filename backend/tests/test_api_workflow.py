from datetime import datetime, timedelta


def get_token(client, email: str, password: str) -> str:
    res = client.post("/api/token", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def test_rbac_matrix(client):
    admin_token = get_token(client, "admin@local.test", "admin")
    operator_token = get_token(client, "operator@local.test", "operator")
    viewer_token = get_token(client, "viewer@local.test", "viewer")

    svc_data = {"name": "Test Service RBAC", "description": "Testing permissions", "slo_target": 0.999}

    # Viewer cannot create service -> 403
    res_viewer = client.post("/api/services/", json=svc_data, headers={"Authorization": f"Bearer {viewer_token}"})
    assert res_viewer.status_code == 403

    # Operator cannot create service -> 403
    res_op = client.post("/api/services/", json=svc_data, headers={"Authorization": f"Bearer {operator_token}"})
    assert res_op.status_code == 403

    # Admin can create service -> 200
    res_admin = client.post("/api/services/", json=svc_data, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    svc_id = res_admin.json()["id"]

    # Monitor creation (Operator allowed)
    mon_data = {
        "service_id": svc_id,
        "name": "Test RBAC Monitor",
        "url": "https://httpbin.org/status/200",
        "method": "GET",
        "interval_seconds": 60,
        "timeout_seconds": 5,
        "failure_threshold": 3
    }

    # Viewer cannot create monitor -> 403
    res_mon_viewer = client.post("/api/monitors/", json=mon_data, headers={"Authorization": f"Bearer {viewer_token}"})
    assert res_mon_viewer.status_code == 403

    # Operator can create monitor -> 200
    res_mon_op = client.post("/api/monitors/", json=mon_data, headers={"Authorization": f"Bearer {operator_token}"})
    assert res_mon_op.status_code == 200

    # Viewer can read services and monitors -> 200
    assert client.get("/api/services/", headers={"Authorization": f"Bearer {viewer_token}"}).status_code == 200
    assert client.get("/api/monitors/", headers={"Authorization": f"Bearer {viewer_token}"}).status_code == 200

    # Cleanup
    del_res = client.delete(f"/api/services/{svc_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert del_res.status_code == 204


def test_incident_lifecycle_and_comments(client):
    operator_token = get_token(client, "operator@local.test", "operator")

    # Simulate an outage (creates a service-less incident via first service)
    sim_res = client.post("/api/maintenance/simulate-outage", headers={"Authorization": f"Bearer {operator_token}"})
    assert sim_res.status_code == 200
    inc_id = sim_res.json()["incident_id"]

    # Acknowledge
    ack_res = client.post(f"/api/incidents/{inc_id}/acknowledge", headers={"Authorization": f"Bearer {operator_token}"})
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "acknowledged"
    assert ack_res.json()["acknowledged_at"] is not None

    # Add comment
    cmt_res = client.post(
        f"/api/incidents/{inc_id}/comments",
        json={"text": "Investigating upstream 504 errors"},
        headers={"Authorization": f"Bearer {operator_token}"}
    )
    assert cmt_res.status_code == 200
    assert cmt_res.json()["text"] == "Investigating upstream 504 errors"

    # Get comments
    get_cmt = client.get(f"/api/incidents/{inc_id}/comments", headers={"Authorization": f"Bearer {operator_token}"})
    assert get_cmt.status_code == 200
    assert any(c["id"] == cmt_res.json()["id"] for c in get_cmt.json())

    # Resolve
    res_res = client.post(f"/api/incidents/{inc_id}/resolve", headers={"Authorization": f"Bearer {operator_token}"})
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "resolved"
    assert res_res.json()["resolved_at"] is not None


def test_public_status_page_unauthenticated(client):
    res = client.get("/api/status/")
    assert res.status_code == 200
    data = res.json()
    assert "overall" in data
    assert "global_status" in data
    assert "services" in data
    assert "recent_incidents" in data
    assert isinstance(data["services"], list)
    assert isinstance(data["recent_incidents"], list)


def test_csv_report_download(client):
    viewer_token = get_token(client, "viewer@local.test", "viewer")
    res = client.get("/api/maintenance/reports/csv", headers={"Authorization": f"Bearer {viewer_token}"})
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    import csv, io
    reader = csv.reader(io.StringIO(res.text))
    header = next(reader)
    assert "ID" in header
    assert "Status" in header


def test_maintenance_window_creation_and_deletion(client):
    operator_token = get_token(client, "operator@local.test", "operator")

    # Get services (seeded on startup)
    svcs = client.get("/api/services/", headers={"Authorization": f"Bearer {operator_token}"}).json()
    assert len(svcs) > 0
    svc_id = svcs[0]["id"]

    start = datetime.utcnow()
    end = start + timedelta(hours=2)

    res = client.post(
        "/api/maintenance/",
        json={
            "service_id": svc_id,
            "reason": "Routine database index maintenance",
            "start_time": start.isoformat(),
            "end_time": end.isoformat()
        },
        headers={"Authorization": f"Bearer {operator_token}"}
    )
    assert res.status_code == 200
    win_id = res.json()["id"]

    del_res = client.delete(f"/api/maintenance/{win_id}", headers={"Authorization": f"Bearer {operator_token}"})
    assert del_res.status_code == 200
