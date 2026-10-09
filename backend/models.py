from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String) # "admin", "operator", "viewer"
    created_at = Column(DateTime, default=datetime.utcnow)

class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    slo_target = Column(Float, default=0.999) # 99.9%
    slo_window_days = Column(Integer, default=7)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    monitors = relationship("Monitor", back_populates="service")
    incidents = relationship("Incident", back_populates="service")

class Monitor(Base):
    __tablename__ = "monitors"
    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey("services.id"), index=True)
    name = Column(String)
    url = Column(String) # SSRF-validated
    method = Column(String, default="GET") # GET, POST
    interval_seconds = Column(Integer, default=60)
    timeout_seconds = Column(Integer, default=10)
    failure_threshold = Column(Integer, default=3)
    consecutive_failures = Column(Integer, default=0)
    last_check_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    service = relationship("Service", back_populates="monitors")
    checks = relationship("CheckResult", back_populates="monitor")

class CheckResult(Base):
    __tablename__ = "check_results"
    id = Column(Integer, primary_key=True)
    monitor_id = Column(Integer, ForeignKey("monitors.id"), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    status_code = Column(Integer, nullable=True) # HTTP status or NULL if network error
    response_time_ms = Column(Integer, nullable=True)
    is_up = Column(Boolean) # True if 2xx/3xx, False otherwise
    error_message = Column(Text, nullable=True) # Network error, timeout, etc.
    monitor = relationship("Monitor", back_populates="checks")

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey("services.id"), index=True)
    monitor_id = Column(Integer, ForeignKey("monitors.id"), nullable=True)
    status = Column(String, default="open") # "open", "acknowledged", "resolved"
    severity = Column(String, default="warning") # "warning", "critical"
    summary = Column(String) # Auto-generated: "Service X detected DOWN"
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    acknowledged_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    service = relationship("Service", back_populates="incidents")
    comments = relationship("IncidentComment", back_populates="incident", cascade="all, delete-orphan")
    alerts = relationship("AlertDelivery", back_populates="incident", cascade="all, delete-orphan")

    @property
    def mtta_seconds(self):
        if self.acknowledged_at and self.created_at:
            return (self.acknowledged_at - self.created_at).total_seconds()
        return None

    @property
    def mttr_seconds(self):
        if self.resolved_at and self.created_at:
            return (self.resolved_at - self.created_at).total_seconds()
        return None

class IncidentComment(Base):
    __tablename__ = "incident_comments"
    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    incident = relationship("Incident", back_populates="comments")

class AlertDelivery(Base):
    __tablename__ = "alert_deliveries"
    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), index=True)
    mechanism = Column(String) # "webhook", "email", "in-app"
    target = Column(String, nullable=True) # URL or email address
    status = Column(String, default="pending") # "pending", "sent", "failed"
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)
    incident = relationship("Incident", back_populates="alerts")

class MaintenanceWindow(Base):
    __tablename__ = "maintenance_windows"
    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey("services.id"), index=True)
    reason = Column(String)
    start_time = Column(DateTime, index=True)
    end_time = Column(DateTime, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
