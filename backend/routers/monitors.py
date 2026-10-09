from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import httpx
import time

from database import get_db
import models
import schemas
from auth import require_admin, require_operator, require_viewer
from utils import validate_monitor_url

router = APIRouter(prefix="/api/monitors", tags=["monitors"])

@router.post("/", response_model=schemas.Monitor, dependencies=[Depends(require_operator)])
def create_monitor(monitor: schemas.MonitorCreate, db: Session = Depends(get_db)):
    if not validate_monitor_url(monitor.url):
        raise HTTPException(status_code=400, detail="Invalid or blocked URL")
    
    db_service = db.query(models.Service).filter(models.Service.id == monitor.service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
        
    db_monitor = models.Monitor(**monitor.model_dump())
    db.add(db_monitor)
    db.commit()
    db.refresh(db_monitor)
    return db_monitor

@router.get("/", response_model=List[schemas.Monitor], dependencies=[Depends(require_viewer)])
def get_monitors(db: Session = Depends(get_db)):
    return db.query(models.Monitor).all()

@router.put("/{monitor_id}", response_model=schemas.Monitor, dependencies=[Depends(require_operator)])
def update_monitor(monitor_id: int, monitor: schemas.MonitorUpdate, db: Session = Depends(get_db)):
    if not validate_monitor_url(monitor.url):
        raise HTTPException(status_code=400, detail="Invalid or blocked URL")

    db_monitor = db.query(models.Monitor).filter(models.Monitor.id == monitor_id).first()
    if not db_monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
        
    for k, v in monitor.model_dump().items():
        setattr(db_monitor, k, v)
        
    db.commit()
    db.refresh(db_monitor)
    return db_monitor

@router.delete("/{monitor_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_monitor(monitor_id: int, db: Session = Depends(get_db)):
    db_monitor = db.query(models.Monitor).filter(models.Monitor.id == monitor_id).first()
    if not db_monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    db.delete(db_monitor)
    db.commit()

from tasks import run_check

@router.post("/{monitor_id}/test", dependencies=[Depends(require_operator)])
def test_monitor(monitor_id: int, db: Session = Depends(get_db)):
    db_monitor = db.query(models.Monitor).filter(models.Monitor.id == monitor_id).first()
    if not db_monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
        
    check_id = run_check(db, monitor_id)
    if not check_id:
        raise HTTPException(status_code=500, detail="Failed to run check")
        
    check_result = db.query(models.CheckResult).filter(models.CheckResult.id == check_id).first()
    
    return {
        "status_code": check_result.status_code,
        "response_time_ms": check_result.response_time_ms,
        "is_up": check_result.is_up,
        "error_message": check_result.error_message
    }

@router.get("/{monitor_id}/checks", response_model=List[schemas.CheckResult], dependencies=[Depends(require_viewer)])
def get_monitor_checks(monitor_id: int, limit: int = 50, db: Session = Depends(get_db)):
    db_monitor = db.query(models.Monitor).filter(models.Monitor.id == monitor_id).first()
    if not db_monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
        
    checks = db.query(models.CheckResult).filter(models.CheckResult.monitor_id == monitor_id).order_by(models.CheckResult.timestamp.desc()).limit(limit).all()
    return checks
