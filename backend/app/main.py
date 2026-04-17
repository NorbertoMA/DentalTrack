import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import engine, Base, SessionLocal
from app import models
from app.routers import catalog, records, reports

INITIAL_CATALOG = [
    {"name": "Limpieza Normal", "price": 60.0, "commission_value": 10.0},
    {"name": "Limpieza Profunda", "price": 80.0, "commission_value": 10.0},
    {"name": "Limpieza Aeropulidor", "price": 70.0, "commission_value": 10.0},
    {"name": "1º Blanqueamiento", "price": 250.0, "commission_value": 10.0},
    {"name": "2º Blanqueamiento", "price": 0.0, "commission_value": 0.0},
    {"name": "Revelador", "price": 30.0, "commission_value": 10.0},
    {"name": "Fluorizacion", "price": 60.0, "commission_value": 10.0},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Reintentar la conexión a la BD hasta 5 veces
    for attempt in range(5):
        try:
            Base.metadata.create_all(bind=engine)
            print("✅ Tablas creadas correctamente")
            break
        except Exception as e:
            print(f"⏳ Intento {attempt + 1}/5 - BD no lista: {e}")
            time.sleep(2)
    else:
        print("❌ No se pudo conectar a la BD tras 5 intentos")

    # Seed de datos iniciales
    db: Session = SessionLocal()
    try:
        if db.query(models.Catalog).count() == 0:
            for item in INITIAL_CATALOG:
                db.add(models.Catalog(**item))
            db.commit()
            print(f"✅ Catálogo inicial insertado: {len(INITIAL_CATALOG)} tratamientos")
        else:
            print(f"ℹ️  Catálogo ya tiene datos ({db.query(models.Catalog).count()} tratamientos)")
    except Exception as e:
        print(f"❌ Error seeding DB: {e}")
    finally:
        db.close()
    yield


app = FastAPI(
    title="DentalTrack API",
    description="API para gestión de tratamientos y comisiones dentales",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — en producción restringir a la IP del VPS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(catalog.router, prefix="/api/catalog", tags=["Catálogo"])
app.include_router(records.router, prefix="/api/records", tags=["Registros"])
app.include_router(reports.router, prefix="/api/reports", tags=["Informes"])


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "DentalTrack API"}
