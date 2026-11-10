# LAF Aircraft Maintenance Intelligence

Dashboard local con registro de vuelos para una aerolinea ficticia: React + TypeScript,
FastAPI, SQLAlchemy y PostgreSQL. Tema oscuro inspirado en la referencia del proyecto.

## Abrir la aplicacion

Con Docker Desktop funcionando y el archivo `.env` existente:

```powershell
docker compose up -d --build
```

- Dashboard: http://localhost:5173
- Documentacion de la API: http://localhost:8000/docs
- Estado de la API: http://localhost:8000/api/health

El escenario base contiene 8 aeronaves, 6 rutas, 1120 vuelos, 15 tareas, 36 intervalos,
809 mantenimientos y 120 asignaciones. Los vuelos nuevos se agregan desde la interfaz. No se alteran los registros al iniciar el
frontend o la API. Los datos persisten en el volumen Docker existente.

No reemplazar `.env` ni eliminar el volumen para iniciar el dashboard.
La contrasena sigue siendo la configurada para PostgreSQL y nunca se envia a React.

## Organizacion

```text
frontend/
  src/
    pages/          Resumen, aeronaves, vuelos, mantenimiento e historial
    components/     Menu, tablas, badges y paneles de detalle reutilizables
    api/            Cliente HTTP del navegador
    hooks/          Snapshot, refresco automatico y estados de conexion
    types/          Tipos de datos TypeScript
    utils/          Fechas de Monterrey, numeros y etiquetas
    styles/         Tema oscuro y adaptacion de pantallas
  nginx.conf        Servidor del frontend y proxy /api
backend/
  app/
    api/            Endpoints de consulta y registro de vuelos
    core/           Configuracion de proximidad
    database/       Conexiones SQLAlchemy de lectura y escritura
    queries/        Consultas SQL utilizadas por la API
    services/       Clasificacion y agrupacion de alertas
  tests/            Pruebas de reglas y API con la base local
  requirements.txt Dependencias directas
  requirements.lock.txt Dependencias resueltas para Docker
database/
  migrations/       Scripts SQL numerados existentes
  queries/          consultas.sql para VSCode
docs/
  dashboard.md      Funcionalidad y decisiones de esta version
  database-history.md Historial de construccion de la base
compose.yaml        PostgreSQL + API + frontend, accesibles solo localmente
```

Los antiguos archivos de `sql/` se organizaron en `database/`. La consulta general
ahora esta en `database/queries/consultas.sql`. `sql/README.md` indica la nueva ubicacion.

## Desarrollo de React con recarga automatica

La version de Docker sirve una compilacion. Para editar React y ver cambios al instante:

```powershell
docker compose stop frontend
docker compose up -d db api
cd frontend
npm ci
npm run dev
```

Abrir http://localhost:5173. El proxy de Vite conecta con la API del puerto 8000.
Al terminar, detener Vite con Ctrl+C y volver a `docker compose up -d --build frontend`.
Node.js 22.12 o superior recomendado. No es necesario instalar Python localmente.

Para aplicar cambios de backend: `docker compose up -d --build api`.

## Comprobaciones

```powershell
docker compose exec -T api python -m pytest -q
cd frontend
npm run build
```

Las pruebas de vuelos utilizan transacciones que se revierten; no dejan registros de prueba.
`npm run format` aplica el formato consistente a los archivos del frontend.

## Reglas y alcance

- Vuelos: crear planeados y registrar finalizacion. Las demas secciones siguen en consulta.
- Aviso de proximidad al 10% restante, configurable con WARNING_RATIO.
- Las alertas cuentan tareas por aeronave, no cada unidad de intervalo.
- Fechas de visualizacion: America/Monterrey. FH en horas decimales.
- Refresco manual y cada 60 segundos con la pagina visible.
- Los acumulados representan los vuelos registrados en la simulacion.
- Filtros/paginacion en el navegador para este conjunto pequeno; llevarlos a
  endpoints paginados cuando crezca el volumen.
- Sin autenticacion; no publicar esta configuracion local directamente en Internet.

Ver `docs/dashboard.md` para detalles. La API usa SQLAlchemy Core sobre las tablas
existentes. No se han implementado Alembic ni modelo predictivo. Ver `docs/flight-registration.md`
para el formulario, sus validaciones y la migracion 013 (ya aplicada localmente).
