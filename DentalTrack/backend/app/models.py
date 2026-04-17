from sqlalchemy import Boolean, Column, Float, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Catalog(Base):
    __tablename__ = "catalog"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    price = Column(Float, nullable=False)
    commission_value = Column(Float, nullable=False)
    active = Column(Boolean, default=True, nullable=False)

    records = relationship("DailyRecord", back_populates="treatment")


class DailyRecord(Base):
    __tablename__ = "daily_records"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    treatment_id = Column(Integer, ForeignKey("catalog.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    total_commission = Column(Float, nullable=False)

    treatment = relationship("Catalog", back_populates="records")


class MonthlyReport(Base):
    __tablename__ = "monthly_reports"

    id = Column(Integer, primary_key=True, index=True)
    month_year = Column(String(7), nullable=False, unique=True)  # Ej: "2024-06"
    file_path = Column(String(500), nullable=False)
    total_earned = Column(Float, nullable=False)
