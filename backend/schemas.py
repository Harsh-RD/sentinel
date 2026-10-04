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
