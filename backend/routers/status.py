from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models

router = APIRouter(prefix="/api/status", tags=["status"])

@router.get("/")
def get_public_status(db: Session = Depends(get_db)):
    services = db.query(models.Service).all()
    results = []
    overall = "All Systems Operational"
    for s in services:
        incidents = db.query(models.Incident).filter(
            models.Incident.service_id == s.id,
            models.Incident.status != "resolved"
        ).count()
        status = "Operational"
        if incidents > 0:
            status = "Degraded/Down"
            overall = "Some Systems Are Experiencing Issues"
        
        results.append({
            "id": s.id,
            "name": s.name,
            "status": status
        })
    return {
        "overall": overall,
        "services": results
    }
