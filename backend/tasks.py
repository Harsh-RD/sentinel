from celery_app import celery_app
from database import SessionLocal
import models
import httpx
import time
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

def run_check(db: Session, monitor_id: int):
    monitor = db.query(models.Monitor).filter(models.Monitor.id == monitor_id).first()
    if not monitor:
        return

    start = time.time()
    status_code = None
    response_time_ms = None
    error_message = None
    is_up = False

    try:
        response = httpx.request(
            monitor.method, 
            monitor.url, 
            timeout=monitor.timeout_seconds, 
            follow_redirects=True
        )
        status_code = response.status_code
        is_up = 200 <= response.status_code < 400
        response_time_ms = int((time.time() - start) * 1000)
    except Exception as e:
        error_message = str(e)
        is_up = False

    check_result = models.CheckResult(
        monitor_id=monitor.id,
        status_code=status_code,
        response_time_ms=response_time_ms,
        is_up=is_up,
        error_message=error_message,
        timestamp=datetime.utcnow()
    )
    db.add(check_result)
    
    if not is_up:
        monitor.consecutive_failures += 1
        if monitor.consecutive_failures >= monitor.failure_threshold:
            open_incident = db.query(models.Incident).filter(
                models.Incident.monitor_id == monitor.id,
                models.Incident.status.in_(["open", "acknowledged"])
            ).first()
            if not open_incident:
                incident = models.Incident(
                    service_id=monitor.service_id,
                    monitor_id=monitor.id,
                    status="open",
                    severity="critical",
                    summary=f"Monitor {monitor.name} detected DOWN"
                )
                db.add(incident)
                
                now = datetime.utcnow()
                maintenance = db.query(models.MaintenanceWindow).filter(
                    models.MaintenanceWindow.service_id == monitor.service_id,
                    models.MaintenanceWindow.start_time <= now,
                    models.MaintenanceWindow.end_time >= now
                ).first()
                if not maintenance:
                    alert = models.AlertDelivery(
                        incident=incident,
                        mechanism="in-app",
                        status="pending"
                    )
                    db.add(alert)
    else:
        monitor.consecutive_failures = 0
        open_incident = db.query(models.Incident).filter(
            models.Incident.monitor_id == monitor.id,
            models.Incident.status.in_(["open", "acknowledged"])
        ).first()
        if open_incident:
            open_incident.status = "resolved"
            open_incident.resolved_at = datetime.utcnow()

        
    db.commit()
    db.refresh(check_result)
    
    monitor.last_check_id = check_result.id
    db.commit()
    
    return check_result.id

@celery_app.task
def execute_monitor_check(monitor_id: int):
    db = SessionLocal()
    try:
        run_check(db, monitor_id)
    finally:
        db.close()

@celery_app.task
def schedule_checks():
    db = SessionLocal()
    try:
        monitors = db.query(models.Monitor).all()
        now = datetime.utcnow()
        for monitor in monitors:
            should_run = False
            if monitor.last_check_id:
                last_check = db.query(models.CheckResult).filter(models.CheckResult.id == monitor.last_check_id).first()
                if last_check:
                    if last_check.timestamp + timedelta(seconds=monitor.interval_seconds) <= now:
                        should_run = True
                else:
                    should_run = True
            else:
                should_run = True
                
            if should_run:
                execute_monitor_check.delay(monitor.id)
    finally:
        db.close()
