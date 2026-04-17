from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app import models

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class RecordCreate(BaseModel):
    date: date
    treatment_id: int
    quantity: int


class RecordOut(BaseModel):
    id: int
    date: date
    treatment_id: int
    quantity: int
    total_commission: float

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[RecordOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(models.DailyRecord).order_by(models.DailyRecord.date.desc()).all()


@router.get("/today", response_model=list[RecordOut])
def get_today(db: Session = Depends(get_db)):
    today = date.today()
    return db.query(models.DailyRecord).filter(models.DailyRecord.date == today).all()


@router.get("/by-date", response_model=list[RecordOut])
def get_by_date(target_date: date, db: Session = Depends(get_db)):
    return db.query(models.DailyRecord).filter(models.DailyRecord.date == target_date).all()


@router.post("/", response_model=RecordOut, status_code=201)
def create(payload: RecordCreate, db: Session = Depends(get_db)):
    treatment = db.query(models.Catalog).filter(models.Catalog.id == payload.treatment_id).first()
    if not treatment:
        raise HTTPException(status_code=404, detail="Tratamiento no encontrado")

    # Comisión = porcentaje del precio × cantidad
    commission_per_unit = treatment.price * (treatment.commission_value / 100)

    # Buscar si ya existe un registro para este tratamiento en la misma fecha
    existing = db.query(models.DailyRecord).filter(
        models.DailyRecord.date == payload.date,
        models.DailyRecord.treatment_id == payload.treatment_id,
    ).first()

    if existing:
        # Sumar la cantidad y recalcular comisión
        existing.quantity += payload.quantity
        existing.total_commission = commission_per_unit * existing.quantity
        db.commit()
        db.refresh(existing)
        return existing
    else:
        total_commission = commission_per_unit * payload.quantity
        record = models.DailyRecord(
            date=payload.date,
            treatment_id=payload.treatment_id,
            quantity=payload.quantity,
            total_commission=total_commission,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record


@router.delete("/{record_id}", status_code=204)
def delete(record_id: int, db: Session = Depends(get_db)):
    record = db.query(models.DailyRecord).filter(models.DailyRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    db.delete(record)
    db.commit()
