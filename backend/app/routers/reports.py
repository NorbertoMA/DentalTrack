import os
import calendar
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from pydantic import BaseModel
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from app.database import get_db
from app.config import settings
from app import models, auth

router = APIRouter(dependencies=[Depends(auth.get_current_user)])

MONTHS_ES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

DAYS_ES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]


# ── Schemas ───────────────────────────────────────────────────────────────────

class ReportOut(BaseModel):
    id: int
    month_year: str
    file_path: str
    total_earned: float

    class Config:
        from_attributes = True


class DayReportRow(BaseModel):
    date: date
    total_treatments: int
    total_commission: float


class MonthReportRow(BaseModel):
    month_year: str
    total_treatments: int
    total_commission: float


class TreatmentReportRow(BaseModel):
    treatment_id: int
    treatment_name: str
    total_quantity: int
    total_commission: float


class DayDetailRow(BaseModel):
    treatment_name: str
    quantity: int
    total_commission: float


# ── Endpoints ─────────────────────────────────────────────────────────────────

# --- Informe por día: resumen de cada día que tiene registros ---
@router.get("/by-day", response_model=list[DayReportRow])
def report_by_day(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020),
    db: Session = Depends(get_db),
):
    query = db.query(
        models.DailyRecord.date,
        func.sum(models.DailyRecord.quantity).label("total_treatments"),
        func.sum(models.DailyRecord.total_commission).label("total_commission"),
    ).group_by(models.DailyRecord.date).order_by(models.DailyRecord.date.desc())

    if year is not None:
        query = query.filter(extract("year", models.DailyRecord.date) == year)
    if month is not None:
        query = query.filter(extract("month", models.DailyRecord.date) == month)

    rows = query.all()
    return [
        DayReportRow(date=r.date, total_treatments=r.total_treatments, total_commission=r.total_commission)
        for r in rows
    ]


# --- Detalle de un día concreto ---
@router.get("/day-detail", response_model=list[DayDetailRow])
def report_day_detail(
    target_date: date,
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            models.Catalog.name.label("treatment_name"),
            models.DailyRecord.quantity,
            models.DailyRecord.total_commission,
        )
        .join(models.Catalog, models.DailyRecord.treatment_id == models.Catalog.id)
        .filter(models.DailyRecord.date == target_date)
        .order_by(models.Catalog.name)
        .all()
    )
    return [
        DayDetailRow(treatment_name=r.treatment_name, quantity=r.quantity, total_commission=r.total_commission)
        for r in rows
    ]


# --- Informe por mes: resumen mensual ---
@router.get("/by-month", response_model=list[MonthReportRow])
def report_by_month(db: Session = Depends(get_db)):
    rows = (
        db.query(
            func.to_char(models.DailyRecord.date, "YYYY-MM").label("month_year"),
            func.sum(models.DailyRecord.quantity).label("total_treatments"),
            func.sum(models.DailyRecord.total_commission).label("total_commission"),
        )
        .group_by(func.to_char(models.DailyRecord.date, "YYYY-MM"))
        .order_by(func.to_char(models.DailyRecord.date, "YYYY-MM").desc())
        .all()
    )
    return [
        MonthReportRow(
            month_year=r.month_year,
            total_treatments=r.total_treatments,
            total_commission=r.total_commission,
        )
        for r in rows
    ]


# --- Informe por tratamiento: totales acumulados por tipo ---
@router.get("/by-treatment", response_model=list[TreatmentReportRow])
def report_by_treatment(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020),
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            models.Catalog.id.label("treatment_id"),
            models.Catalog.name.label("treatment_name"),
            func.sum(models.DailyRecord.quantity).label("total_quantity"),
            func.sum(models.DailyRecord.total_commission).label("total_commission"),
        )
        .join(models.Catalog, models.DailyRecord.treatment_id == models.Catalog.id)
        .group_by(models.Catalog.id, models.Catalog.name)
        .order_by(func.sum(models.DailyRecord.total_commission).desc())
    )

    if year is not None:
        query = query.filter(extract("year", models.DailyRecord.date) == year)
    if month is not None:
        query = query.filter(extract("month", models.DailyRecord.date) == month)

    rows = query.all()
    return [
        TreatmentReportRow(
            treatment_id=r.treatment_id,
            treatment_name=r.treatment_name,
            total_quantity=r.total_quantity,
            total_commission=r.total_commission,
        )
        for r in rows
    ]


class TreatmentDetailRecordRow(BaseModel):
    date: date
    quantity: int
    total_commission: float


@router.get("/treatment-records", response_model=list[TreatmentDetailRecordRow])
def get_treatment_records(
    treatment_id: int,
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    day_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(
        models.DailyRecord.date,
        models.DailyRecord.quantity,
        models.DailyRecord.total_commission,
    ).filter(models.DailyRecord.treatment_id == treatment_id)

    if day_date is not None:
        query = query.filter(models.DailyRecord.date == day_date)
    else:
        if year is not None:
            query = query.filter(extract("year", models.DailyRecord.date) == year)
        if month is not None:
            query = query.filter(extract("month", models.DailyRecord.date) == month)

    query = query.order_by(models.DailyRecord.date.desc())
    rows = query.all()

    return [
        TreatmentDetailRecordRow(
            date=r.date, quantity=r.quantity, total_commission=r.total_commission
        )
        for r in rows
    ]


# ══════════════════════════════════════════════════════════════════════════════
# ── Generación de PDF mensual ─────────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/export-month/{month_year}")
def export_month_pdf(month_year: str, db: Session = Depends(get_db)):
    """
    Genera y descarga un PDF con el desglose diario del mes indicado (YYYY-MM).
    """
    # Validar formato
    try:
        parts = month_year.split("-")
        year_val = int(parts[0])
        month_val = int(parts[1])
        if month_val < 1 or month_val > 12:
            raise ValueError
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Formato inválido. Usa YYYY-MM (ej: 2026-04)")

    month_name = MONTHS_ES[month_val]

    # Obtener todos los registros del mes, agrupados por día
    records = (
        db.query(
            models.DailyRecord.date,
            models.Catalog.name.label("treatment_name"),
            models.DailyRecord.quantity,
            models.DailyRecord.total_commission,
        )
        .join(models.Catalog, models.DailyRecord.treatment_id == models.Catalog.id)
        .filter(extract("year", models.DailyRecord.date) == year_val)
        .filter(extract("month", models.DailyRecord.date) == month_val)
        .order_by(models.DailyRecord.date.asc(), models.Catalog.name.asc())
        .all()
    )

    if not records:
        raise HTTPException(status_code=404, detail=f"No hay registros para {month_name} {year_val}")

    # Agrupar por día
    days_data: dict[date, list] = {}
    for r in records:
        if r.date not in days_data:
            days_data[r.date] = []
        days_data[r.date].append({
            "name": r.treatment_name,
            "qty": r.quantity,
            "commission": r.total_commission,
        })

    # ── Construir el PDF ──────────────────────────────────────────────────────
    os.makedirs(settings.PDF_OUTPUT_DIR, exist_ok=True)
    filename = f"DentalTrack_{month_year}.pdf"
    filepath = os.path.join(settings.PDF_OUTPUT_DIR, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        topMargin=20 * mm,
        bottomMargin=15 * mm,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
    )

    styles = getSampleStyleSheet()

    # Estilos personalizados
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Title"],
        fontSize=20,
        textColor=colors.HexColor("#0077B6"),
        spaceAfter=4 * mm,
    )
    subtitle_style = ParagraphStyle(
        "CustomSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#666666"),
        spaceAfter=8 * mm,
    )
    day_header_style = ParagraphStyle(
        "DayHeader",
        parent=styles["Heading2"],
        fontSize=12,
        textColor=colors.HexColor("#0077B6"),
        spaceBefore=6 * mm,
        spaceAfter=2 * mm,
    )

    # Colores para las tablas
    header_bg = colors.HexColor("#0077B6")
    header_fg = colors.white
    row_alt = colors.HexColor("#F0F7FB")
    border_color = colors.HexColor("#DDE8EF")

    elements = []

    # ── Título ────────────────────────────────────────────────────────────────
    elements.append(Paragraph(f"🦷 DentalTrack", title_style))
    elements.append(Paragraph(
        f"Informe mensual — {month_name} {year_val}",
        subtitle_style,
    ))

    # ── Resumen general ──────────────────────────────────────────────────────
    grand_total_qty = sum(t["qty"] for day_list in days_data.values() for t in day_list)
    grand_total_com = sum(t["commission"] for day_list in days_data.values() for t in day_list)

    summary_data = [
        ["Días trabajados", "Total tratamientos", "Total comisiones"],
        [str(len(days_data)), str(grand_total_qty), f"{grand_total_com:.2f} €"],
    ]
    summary_table = Table(summary_data, colWidths=[60 * mm, 60 * mm, 60 * mm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), header_fg),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTSIZE", (0, 1), (-1, -1), 11),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, 1), (-1, -1), row_alt),
        ("GRID", (0, 0), (-1, -1), 0.5, border_color),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 6 * mm))

    # ── Desglose por día ─────────────────────────────────────────────────────
    for day_date in sorted(days_data.keys()):
        treatments = days_data[day_date]
        # Día de la semana
        # weekday(): 0=lunes ... 6=domingo
        day_name = DAYS_ES[day_date.weekday()]
        day_num = day_date.day

        elements.append(Paragraph(
            f"{day_name} {day_num} de {month_name}",
            day_header_style,
        ))

        # Tabla de tratamientos
        table_data = [["Tratamiento", "Cantidad", "Comisión"]]
        day_total = 0.0
        for t in treatments:
            table_data.append([t["name"], str(t["qty"]), f"{t['commission']:.2f} €"])
            day_total += t["commission"]

        # Fila de total del día
        table_data.append(["TOTAL DÍA", "", f"{day_total:.2f} €"])

        col_widths = [90 * mm, 35 * mm, 45 * mm]
        tbl = Table(table_data, colWidths=col_widths)

        style_commands = [
            # Cabecera
            ("BACKGROUND", (0, 0), (-1, 0), header_bg),
            ("TEXTCOLOR", (0, 0), (-1, 0), header_fg),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("ALIGN", (0, 0), (0, -1), "LEFT"),
            # Cuerpo
            ("FONTSIZE", (0, 1), (-1, -2), 9),
            ("FONTNAME", (0, 1), (-1, -2), "Helvetica"),
            # Fila total
            ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, -1), (-1, -1), 9),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#E6F2F8")),
            ("LINEABOVE", (0, -1), (-1, -1), 1, header_bg),
            # Grid
            ("GRID", (0, 0), (-1, -1), 0.4, border_color),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]

        # Filas alternas
        for i in range(1, len(table_data) - 1):
            if i % 2 == 0:
                style_commands.append(("BACKGROUND", (0, i), (-1, i), row_alt))

        tbl.setStyle(TableStyle(style_commands))
        elements.append(tbl)
        elements.append(Spacer(1, 2 * mm))

    # ── Generar ──────────────────────────────────────────────────────────────
    doc.build(elements)

    # Guardar referencia en BD (upsert)
    existing = db.query(models.MonthlyReport).filter(
        models.MonthlyReport.month_year == month_year
    ).first()
    if existing:
        existing.file_path = filepath
        existing.total_earned = grand_total_com
    else:
        db.add(models.MonthlyReport(
            month_year=month_year,
            file_path=filepath,
            total_earned=grand_total_com,
        ))
    db.commit()

    return FileResponse(
        path=filepath,
        media_type="application/pdf",
        filename=filename,
    )


# --- Descarga de PDF (existente) ---
@router.get("/", response_model=list[ReportOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(models.MonthlyReport).order_by(models.MonthlyReport.month_year.desc()).all()


@router.get("/{report_id}/download")
def download(report_id: int, db: Session = Depends(get_db)):
    report = db.query(models.MonthlyReport).filter(models.MonthlyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    return FileResponse(
        path=report.file_path,
        media_type="application/pdf",
        filename=f"DentalTrack_{report.month_year}.pdf",
    )
