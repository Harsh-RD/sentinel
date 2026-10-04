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

# Initialize DB
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sentinel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginData(BaseModel):
    email: str
    password: str

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

from sqlalchemy.exc import IntegrityError

@app.on_event("startup")
def seed_users():
    db = next(get_db())
    if not db.query(models.User).first():
        try:
            users = [
                models.User(email="admin@local.test", hashed_password=pwd_context.hash("admin"), role="admin"),
                models.User(email="operator@local.test", hashed_password=pwd_context.hash("operator"), role="operator"),
                models.User(email="viewer@local.test", hashed_password=pwd_context.hash("viewer"), role="viewer")
            ]
            db.add_all(users)
            db.commit()
        except IntegrityError:
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
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

app.include_router(services.router)
app.include_router(monitors.router)
