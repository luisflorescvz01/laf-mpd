# Dashboard local

## Pantallas

1. Resumen: tarjetas de aeronaves, vuelos completados y alertas; prioridad,
   estado de tareas, utilizacion y ultimos mantenimientos.
2. Aeronaves: busqueda y ficha con caracteristicas, tareas, vuelos e historial.
3. Vuelos: filtros de aeronave, ruta, estado y fechas de salida programada en
   hora de Monterrey, paginacion, detalle y formularios de planeacion/finalizacion.
4. Mantenimiento: busqueda, filtro por aeronave/estado, limites por unidad,
   referencias AMM y ejecuciones previas en un panel de detalle.
5. Historial: busqueda, filtro por aeronave, paginacion y observaciones.

## Alertas

Las 144 filas de `maintenance_due` se agrupan en 120 pares aeronave/tarea.
El margen de proximidad es configurable mediante `WARNING_RATIO` (0.10 por
defecto en compose.yaml). Es una regla visual de la demostracion, no un cambio
de requisitos del MPD.

- OVERDUE / DUE: se conserva el estado calculado por la vista.
- NEAR_LIMIT: estado WITHIN_LIMIT con saldo <= intervalo * margen.
- DATA_ERROR / MISSING_INTERVAL: se muestran como datos para revisar.
- NOT_STARTED: seguimiento aun no iniciado.

El estado mas urgente representa cada asignacion; todos los limites se conservan
en el detalle. Los datos inconsistentes tienen prioridad para evitar mostrar una
asignacion incompleta como correcta. No se predicen fechas para limites FH/FC.
Las fechas se presentan en America/Monterrey y las FH son decimales.

## Flujo de datos

React -> GET /api/dashboard -> FastAPI -> SQLAlchemy/psycopg -> PostgreSQL.
Nginx sirve React y reenvia /api al backend. En desarrollo Vite usa el mismo
patron mediante su proxy. No hay credenciales de base de datos en el navegador.

La consulta del dashboard abre una transaccion REPEATABLE READ y de solo lectura para un snapshot
coherente. El navegador actualiza cada 60 segundos cuando la pagina esta visible,
al volver a ella y al pulsar Actualizar. Una consulta fallida conserva el ultimo
snapshot y lo identifica como desactualizado con un aviso visible.

## Alcance y siguientes iteraciones

Esta version es exclusivamente local y sin autenticacion. Los endpoints de vuelos
permiten crear planeados y completarlos; ver `flight-registration.md`.
Los filtros y la paginacion se realizan sobre el snapshot completo en React;
es apropiado para la pequena base actual. Antes de aumentar sustancialmente el
volumen, dividir los endpoints y mover filtros/paginacion a PostgreSQL.

Se utiliza SQLAlchemy Core para consultas SQL; no se recrean tablas ni se generan
modelos ORM en esta fase. Alembic, formularios de mantenimiento, usuarios y notificaciones externas
quedan para etapas posteriores. Las fuentes web tienen alternativas de sistema
si no hay acceso a Internet.
