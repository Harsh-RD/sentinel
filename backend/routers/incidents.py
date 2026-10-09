from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from auth import require_operator, require_viewer, get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

@router.get("/", response_model=List[schemas.Incident], dependencies=[Depends(require_viewer)])
def get_incidents(db: Session = Depends(get_db)):
    return db.query(models.Incident).order_by(models.Incident.created_at.desc()).all()

@router.post("/{incident_id}/acknowledge", response_model=schemas.Incident)
def acknowledge_incident(incident_id: int, user: models.User = Depends(require_operator), db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if incident.status == "open":
        incident.status = "acknowledged"
        incident.acknowledged_at = datetime.utcnow()
        incident.acknowledged_by_user_id = user.id
        db.commit()
        db.refresh(incident)
    return incident

@router.post("/{incident_id}/resolve", response_model=schemas.Incident, dependencies=[Depends(require_operator)])
def resolve_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if incident.status != "resolved":
        incident.status = "resolved"
        incident.resolved_at = datetime.utcnow()
        db.commit()
        db.refresh(incident)
    return incident

@router.get("/{incident_id}/comments", response_model=List[schemas.IncidentComment], dependencies=[Depends(require_viewer)])
def get_comments(incident_id: int, db: Session = Depends(get_db)):
    return db.query(models.IncidentComment).filter(models.IncidentComment.incident_id == incident_id).order_by(models.IncidentComment.created_at.asc()).all()

@router.post("/{incident_id}/comments", response_model=schemas.IncidentComment)
def add_comment(incident_id: int, comment: schemas.IncidentCommentCreate, user: models.User = Depends(require_operator), db: Session = Depends(get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    db_comment = models.IncidentComment(
        incident_id=incident_id,
        user_id=user.id,
        text=comment.text,
        created_at=datetime.utcnow()
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment
