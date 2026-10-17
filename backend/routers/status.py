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
    recent_incidents = (
        db.query(models.Incident)
        .order_by(models.Incident.created_at.desc())
        .limit(10)
        .all()
    )
    incident_list = [
        {
            "id": inc.id,
            "service_id": inc.service_id,
            "status": inc.status,
            "severity": inc.severity,
            "summary": inc.summary or f"Incident #{inc.id}",
            "created_at": inc.created_at.isoformat() if inc.created_at else None,
            "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None,
        }
        for inc in recent_incidents
    ]
    return {
        "overall": overall,
        "global_status": overall,
        "services": results,
        "recent_incidents": incident_list,
    }
