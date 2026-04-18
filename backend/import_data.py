import csv
import io
import os
from datetime import date
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

def import_from_csv(year: int, month: int, csv_text: str):
    db: Session = SessionLocal()
    try:
        # 1. Obtener catálogo para mapear nombres a IDs
        treatments = db.query(models.Catalog).all()
        treatment_map = {t.name.upper().strip(): t.id for t in treatments}
        
        # 2. Leer CSV
        lines = csv_text.strip().split('\n')
        if not lines:
            return
            
        # Buscar la línea de cabecera (la que contiene "DIA")
        header_index = 0
        for i, line in enumerate(lines):
            if 'DIA' in line.upper():
                header_index = i
                break
        
        f = io.StringIO('\n'.join(lines[header_index:]))
        reader = csv.DictReader(f)
        
        # Limpiar nombres de columnas (quitar espacios y pasar a mayúsculas)
        fieldnames_upper = {name: name.upper().strip() for name in reader.fieldnames}
        
        records_added = 0
        for row in reader:
            try:
                # Si la fila no tiene día o es una fila de totales, saltar
                day_raw = row.get('DIA') or row.get('dia') or row.get('Dia')
                if not day_raw or not day_raw.strip().isdigit():
                    continue
                
                day = int(day_raw)
                record_date = date(year, month, day)
                
                for col_name, raw_val in row.items():
                    col_upper = col_name.upper().strip()
                    if col_upper == 'DIA' or not raw_val:
                        continue
                    
                    # Intentar convertir cantidad a número
                    try:
                        quantity = int(raw_val)
                        if quantity <= 0:
                            continue
                    except ValueError:
                        continue
                        
                    # Buscar ID del tratamiento
                    treatment_id = treatment_map.get(col_upper)
                    if not treatment_id:
                        print(f"⚠️ Tratamiento no encontrado en catálogo: '{col_upper}'")
                        continue
                        
                    # Crear registro
                    treatment = db.query(models.Catalog).get(treatment_id)
                    commission = treatment.commission_value * quantity
                    
                    new_record = models.Record(
                        date=record_date,
                        treatment_id=treatment_id,
                        quantity=quantity,
                        total_commission=commission
                    )
                    db.add(new_record)
                    records_added += 1
                    
            except Exception as e:
                print(f"❌ Error procesando fila {row}: {e}")
                
        db.commit()
        print(f"✅ Importación completada: {records_added} registros añadidos para {month}/{year}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error general en la importación: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 4:
        print("Uso: python import_data.py <year> <month> <csv_content_file>")
    else:
        y = int(sys.argv[1])
        m = int(sys.argv[2])
        with open(sys.argv[3], 'r', encoding='utf-8') as f:
            content = f.read()
        import_from_csv(y, m, content)
