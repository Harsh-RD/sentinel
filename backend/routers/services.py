from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from auth import require_admin, require_operator, require_viewer

router = APIRouter(prefix="/api/services", tags=["services"])

@router.post("/", response_model=schemas.Service, dependencies=[Depends(require_admin)])
def create_service(service: schemas.ServiceCreate, db: Session = Depends(get_db)):
    db_service = models.Service(**service.model_dump())
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service

@router.get("/", response_model=List[schemas.Service], dependencies=[Depends(require_viewer)])
def get_services(db: Session = Depends(get_db)):
    return db.query(models.Service).all()

@router.put("/{service_id}", response_model=schemas.Service, dependencies=[Depends(require_admin)])
def update_service(service_id: int, service: schemas.ServiceCreate, db: Session = Depends(get_db)):
    db_service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    for k, v in service.model_dump().items():
        setattr(db_service, k, v)
        
    db.commit()
    db.refresh(db_service)
    return db_service

@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_service(service_id: int, db: Session = Depends(get_db)):
    db_service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not db_service:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(db_service)
    db.commit()
