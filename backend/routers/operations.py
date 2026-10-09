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

