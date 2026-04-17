from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app import models

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class CatalogBase(BaseModel):
    name: str
    price: float
    commission_value: float
    active: bool = True


class CatalogCreate(CatalogBase):
    pass


class CatalogUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    commission_value: Optional[float] = None
    active: Optional[bool] = None


class CatalogOut(CatalogBase):
    id: int

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[CatalogOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(models.Catalog).all()


@router.get("/{item_id}", response_model=CatalogOut)
def get_one(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Catalog).filter(models.Catalog.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")
    return item


@router.post("/", response_model=CatalogOut, status_code=201)
def create(payload: CatalogCreate, db: Session = Depends(get_db)):
    item = models.Catalog(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=CatalogOut)
def update(item_id: int, payload: CatalogUpdate, db: Session = Depends(get_db)):
    item = db.query(models.Catalog).filter(models.Catalog.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Catalog).filter(models.Catalog.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")
    db.delete(item)
    db.commit()
