# Base de datos

- `migrations/`: scripts SQL numerados existentes (estructura, datos ficticios y vistas).
- `queries/consultas.sql`: consultas de solo lectura para VSCode.
- `seeds/`: escenario ampliado de demostracion, catalogo revisado y resultado de carga.
- `backups/`: respaldos locales previos a cambios de datos (archivos dump excluidos de Git).

Estos son scripts SQL manuales, no migraciones Alembic. Ejecutarlos en orden
solo al preparar una base nueva; la base local ya los tiene aplicados.
No volver a ejecutar seeds sobre registros existentes. No eliminar el volumen Docker.

El dashboard no cambia esquemas ni ejecuta seeds al iniciar. Las consultas que
consume la API estan separadas en `backend/app/queries/`.

La configuracion del motor y la conexion SQLAlchemy estan en
`backend/app/database/connection.py`. El archivo `.env` de la raiz conserva
la contrasena local; nunca se incluye en frontend ni Git.

El escenario ampliado aplicado el 9 de noviembre de 2026 se explica en
`../docs/demo-data.md`. Su script reemplaza los vuelos, servicios y asignaciones
ficticios; no se ejecuta automaticamente al iniciar Docker.
