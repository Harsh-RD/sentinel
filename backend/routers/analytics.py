from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models
from auth import require_viewer

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/", dependencies=[Depends(require_viewer)])
def get_analytics(db: Session = Depends(get_db)):
    total_monitors = db.query(models.Monitor).count()
    total_incidents = db.query(models.Incident).count()
    open_incidents = db.query(models.Incident).filter(models.Incident.status != "resolved").count()
    
    # Calculate global uptime %
    total_checks = db.query(models.CheckResult).count()
    up_checks = db.query(models.CheckResult).filter(models.CheckResult.is_up == True).count()
    uptime_percentage = (up_checks / total_checks * 100) if total_checks > 0 else 100.0
    
    # Average latency
    avg_latency = db.query(func.avg(models.CheckResult.response_time_ms)).scalar()
    avg_latency = round(avg_latency, 2) if avg_latency else 0.0
    
    # Failure rate
    failure_rate = (100.0 - uptime_percentage)
    
    return {
        "total_monitors": total_monitors,
        "total_incidents": total_incidents,
        "open_incidents": open_incidents,
        "uptime_percentage": round(uptime_percentage, 2),
        "avg_latency_ms": avg_latency,
        "failure_rate_percentage": round(failure_rate, 2)
    }
