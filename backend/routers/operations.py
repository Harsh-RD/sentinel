from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from auth import require_operator, require_viewer

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])

@router.get("/", response_model=List[schemas.MaintenanceWindow], dependencies=[Depends(require_viewer)])
def get_windows(db: Session = Depends(get_db)):
    return db.query(models.MaintenanceWindow).order_by(models.MaintenanceWindow.start_time.desc()).all()

@router.post("/", response_model=schemas.MaintenanceWindow, dependencies=[Depends(require_operator)])
def create_window(window: schemas.MaintenanceWindowCreate, db: Session = Depends(get_db)):
    db_window = models.MaintenanceWindow(**window.model_dump())
    db.add(db_window)
    db.commit()
    db.refresh(db_window)
    return db_window

from fastapi.responses import StreamingResponse
import io
import csv

@router.get("/reports/csv", dependencies=[Depends(require_viewer)])
def get_csv_report(db: Session = Depends(get_db)):
    incidents = db.query(models.Incident).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Service ID", "Monitor ID", "Status", "Severity", "Created At", "Resolved At"])
    for i in incidents:
        writer.writerow([i.id, i.service_id, i.monitor_id, i.status, i.severity, i.created_at, i.resolved_at])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=incidents.csv"}
    )

from datetime import datetime

@router.delete("/{window_id}", dependencies=[Depends(require_operator)])
def delete_window(window_id: int, db: Session = Depends(get_db)):
    win = db.query(models.MaintenanceWindow).filter(models.MaintenanceWindow.id == window_id).first()
    if not win:
        raise HTTPException(status_code=404, detail="Maintenance window not found")
    db.delete(win)
    db.commit()
    return {"status": "deleted"}

@router.post("/simulate-outage", dependencies=[Depends(require_operator)])
def simulate_outage(service_id: int | None = None, db: Session = Depends(get_db)):
    svc = None
    if service_id:
        svc = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not svc:
        svc = db.query(models.Service).first()
    if not svc:
        raise HTTPException(status_code=404, detail="No services exist to simulate outage")

    monitor = db.query(models.Monitor).filter(models.Monitor.service_id == svc.id).first()
    monitor_id = monitor.id if monitor else None

    incident = models.Incident(
        service_id=svc.id,
        monitor_id=monitor_id,
        status="open",
        severity="critical",
        summary=f"CRITICAL OUTAGE: {svc.name} payment gateway timeouts exceeding SLO threshold"
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    now = datetime.utcnow()
    maint = db.query(models.MaintenanceWindow).filter(
        models.MaintenanceWindow.service_id == svc.id,
        models.MaintenanceWindow.start_time <= now,
        models.MaintenanceWindow.end_time >= now
    ).first()
    if not maint:
        alert = models.AlertDelivery(
            incident_id=incident.id,
            mechanism="in-app",
            status="pending"
        )
        db.add(alert)
        db.commit()

    return {"message": f"Simulated outage triggered for {svc.name}", "incident_id": incident.id}
