from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from routers import services, monitors
import models
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from config import SECRET_KEY, ALGORITHM

# DB schema managed strictly via Alembic migrations per AGENTS.md rule 3

app = FastAPI(title="Sentinel API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str

class LoginData(BaseModel):
    email: str
    password: str

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=60)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

from sqlalchemy.exc import IntegrityError

@app.on_event("startup")
def seed_demo_data():
    db = next(get_db())
    try:
        if not db.query(models.User).first():
            users = [
                models.User(email="admin@local.test", hashed_password=pwd_context.hash("admin"), role="admin"),
                models.User(email="operator@local.test", hashed_password=pwd_context.hash("operator"), role="operator"),
                models.User(email="viewer@local.test", hashed_password=pwd_context.hash("viewer"), role="viewer")
            ]
            db.add_all(users)
            db.commit()

        if not db.query(models.Service).first():
            svc_payments = models.Service(
                name="Payments Gateway",
                description="Core payment card processing & settlement pipeline",
                slo_target=0.999
            )
            svc_auth = models.Service(
                name="Auth & Identity API",
                description="User session, JWT issuance & OAuth provider",
                slo_target=0.9995
            )
            svc_edge = models.Service(
                name="Edge Ingress Router",
                description="Public CDN edge and reverse proxy routing",
                slo_target=0.995
            )
            db.add_all([svc_payments, svc_auth, svc_edge])
            db.commit()

            m1 = models.Monitor(
                service_id=svc_payments.id,
                name="Payments Healthcheck",
                url="https://httpbin.org/status/200",
                method="GET",
                interval_seconds=60,
                timeout_seconds=10,
                failure_threshold=2
            )
            m2 = models.Monitor(
                service_id=svc_auth.id,
                name="Auth Status Check",
                url="https://httpbin.org/status/200",
                method="GET",
                interval_seconds=60,
                timeout_seconds=10,
                failure_threshold=3
            )
            m3 = models.Monitor(
                service_id=svc_edge.id,
                name="Edge Ping Check",
                url="https://httpbin.org/status/200",
                method="GET",
                interval_seconds=60,
                timeout_seconds=10,
                failure_threshold=3
            )
            db.add_all([m1, m2, m3])
            db.commit()

            now = datetime.utcnow()
            for m in [m1, m2, m3]:
                cr = models.CheckResult(
                    monitor_id=m.id,
                    timestamp=now,
                    status_code=200,
                    response_time_ms=42,
                    is_up=True,
                    error_message=None
                )
                db.add(cr)
                db.commit()
                m.last_check_id = cr.id
                db.commit()
    except Exception as e:
        db.rollback()

@app.post("/api/token", response_model=Token)
def login(login_data: LoginData, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not pwd_context.verify(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=60)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
    }

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

from routers import services, monitors, incidents, operations, status, analytics

app.include_router(services.router)
app.include_router(monitors.router)
app.include_router(incidents.router)
app.include_router(operations.router)
app.include_router(status.router)
app.include_router(analytics.router)
