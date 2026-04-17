# PRODUCT REQUIREMENT DOCUMENT (PRD): DentalTrack (VPS Edition)

## 1. ROL DEL ASISTENTE (Meta Prompting)
Eres un experto desarrollador Full Stack Senior especializado en el stack: **React (Vite), TypeScript, Tailwind CSS, FastAPI (Python)** y **Docker**. Tu objetivo es construir una aplicación ligera y eficiente diseñada para ejecutarse en un entorno self-hosted (VPS Oracle Cloud Free Tier).

## 2. DESCRIPCIÓN GENERAL Y VISIÓN
DentalTrack es una Web App privada de uso personal (un solo usuario) para que una higienista dental gestione su registro de trabajos y comisiones.
* **Visión:** Una herramienta rápida, sin login, que centraliza los datos en una base de datos propia.
* **Despliegue:** Contenerizado con Docker para facilitar la migración de local a VPS.
* **Objetivo MVP:** Registro diario de tratamientos, edición de catálogo y generación automática de reportes mensuales en PDF.

## 3. STACK Y RESTRICCIONES TÉCNICAS
* **Frontend:** React + TypeScript + Tailwind CSS (Vite). Diseño Mobile-First.
* **Backend:** FastAPI (Python 3.10+).
* **Base de Datos:** PostgreSQL.
* **Infraestructura:** Docker & Docker Compose.
* **Persistencia:** Volúmenes de Docker para la base de datos y los archivos PDF generados.

## 4. ARQUITECTURA DE DATOS (PostgreSQL)
* **Tabla `catalog`**: `id` (PK), `name` (String), `price` (Float), `commission_value` (Float), `active` (Boolean).
* **Tabla `daily_records`**: `id` (PK), `date` (Date), `treatment_id` (FK), `quantity` (Int), `total_commission` (Float).
* **Tabla `monthly_reports`**: `id` (PK), `month_year` (String), `file_path` (String), `total_earned` (Float).

## 5. FLUJO DE USUARIO DETALLADO
1.  **Pantalla de Registro (Home):** Acceso directo. Formulario para seleccionar tratamiento del catálogo, indicar cantidad y añadir. Muestra el resumen del día actual.
2.  **Pantalla de Configuración:** Interfaz para editar los precios y comisiones de la lista precargada.
3.  **Pantalla de Histórico:** Lista de meses cerrados con botones para descargar los PDFs guardados en el servidor.

## 6. FUNCIONALIDADES CLAVE Y ORDEN DE IMPLEMENTACIÓN
1.  **Infraestructura:** Configuración de `docker-compose.yml` (Frontend, Backend, DB).
2.  **Catálogo Inicial:** El sistema debe arrancar con la lista de precios y tratamientos proporcionada por el usuario ya insertada en la base de datos.
3.  **Lógica de Registro:** Endpoint para guardar entradas diarias y calcular comisión en tiempo real.
4.  **Generación de PDF:** Tarea automática (o vía botón) que consolida el mes, genera el PDF usando ReportLab/Playwright y lo almacena localmente en el volumen del VPS.

## 7. LINEAMIENTOS DE DISEÑO UI/UX
* **Estética:** Minimalista "Dental Blue". Colores: Blanco (#FFFFFF), Azul Dental (#0077B6), Gris muy claro (#F8FAFC).
* **Componentes:** Uso de ShadCN para botones y formularios.
* **UX:** Botones grandes, inputs numéricos optimizados para móvil, navegación simple mediante barra inferior (Registro, Ajustes, Informes).

## 8. ALCANCE DEL PROYECTO (SCOPE)
* **Incluido:** Dockerización, CRUD de tratamientos, persistencia en Postgres, descarga de PDF.
* **Excluido:** Sistema de usuarios/contraseñas (seguridad gestionada por IP/Firewall del VPS), notificaciones push.

## 9. NOTA FINAL (Chat Mode)
Antes de generar código, el modelo debe confirmar que ha leído este PRD y que entiende la estructura de carpetas necesaria para un proyecto dockerizado (backend/, frontend/, docker-compose.yml).