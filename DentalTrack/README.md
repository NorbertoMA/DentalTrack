# 🦷 DentalTrack

Aplicación web privada para gestión de tratamientos y comisiones de higienistas dentales.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS (Vite) |
| Backend | FastAPI (Python 3.11) |
| Base de datos | PostgreSQL 15 |
| Infraestructura | Docker & Docker Compose |

## Arranque en local

```bash
# 1. Clonar e ir al directorio
cd DentalTrack

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar todos los servicios
docker compose up --build
```

| Servicio | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

## Estructura del proyecto

```
DentalTrack/
├── backend/
│   ├── app/
│   │   ├── routers/        # catalog, records, reports
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── database.py
│   │   └── config.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # Layout, UI compartidos
│   │   └── pages/          # RecordPage, SettingsPage, ReportsPage
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## Volúmenes persistentes

- `postgres_data` — Datos de PostgreSQL
- `pdf_reports` — PDFs mensuales generados por el backend
