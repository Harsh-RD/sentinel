from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime

class ServiceBase(BaseModel):
    name: str
    description: Optional[str] = None
    slo_target: float = 0.999

class ServiceCreate(ServiceBase):
    pass

class Service(ServiceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class MonitorBase(BaseModel):
    name: str
    url: str
    method: str = "GET"
    interval_seconds: int = 60
    timeout_seconds: int = 10
    failure_threshold: int = 3

class MonitorCreate(MonitorBase):
    service_id: int

class MonitorUpdate(MonitorBase):
    pass

class Monitor(MonitorBase):
    id: int
    service_id: int
    consecutive_failures: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class CheckResult(BaseModel):
    id: int
    monitor_id: int
    timestamp: datetime
    status_code: Optional[int]
    response_time_ms: Optional[int]
    is_up: bool
    error_message: Optional[str]
    
    class Config:
        from_attributes = True

class IncidentCommentCreate(BaseModel):
    text: str

class IncidentComment(BaseModel):
    id: int
    incident_id: int
    user_id: int
    text: str
    created_at: datetime
    class Config:
        from_attributes = True

class Incident(BaseModel):
    id: int
    service_id: int
    monitor_id: Optional[int]
    status: str
    severity: str
    summary: str
    created_at: datetime
    acknowledged_at: Optional[datetime]
    resolved_at: Optional[datetime]
    acknowledged_by_user_id: Optional[int]
    mtta_seconds: Optional[float]
    mttr_seconds: Optional[float]
    class Config:
        from_attributes = True

class MaintenanceWindowCreate(BaseModel):
    service_id: int
    reason: str
    start_time: datetime
    end_time: datetime

class MaintenanceWindow(MaintenanceWindowCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True
