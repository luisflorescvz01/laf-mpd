# Realizar mantenimiento

En el detalle de una tarea asignada, tanto en Mantenimiento como en la ficha
de aeronave, pulsar **Realizar mantenimiento** y confirmar. POST `/api/maintenance`
recibe request_id (UUID), aircraft_id y mpd_number. El backend genera un MNT
unico, fecha actual del servidor y snapshots de FH/FC de vuelos completados.
actual_labor_hours copia labor_hours de la tarea como valor de demostracion;
la nota indica que el tiempo procede del estimado, no de una medicion.
Si la tarea no tiene tiempo estimado, se conserva NULL sin inventar horas.
La migracion 015 completa los servicios del dashboard que estaban sin horas,
sin reemplazar valores ya registrados.

La vista maintenance_due existente elige ese registro como referencia comun
para TODOS los limites repetitivos de la tarea en esa aeronave (FH, FC, DY, HR).
No cambia intervalos documentales, acumulados de la flota ni otras asignaciones.
El nuevo snapshot del dashboard actualiza historial, detalle y alertas.

Se valida asignacion, comienzo del seguimiento e intervalos repetitivos para
todas las unidades. Se rechazan vuelos IN_PROGRESS, vuelos PLANNED cuyo horario
abarca el momento actual y mantenimientos futuros de la misma asignacion.
Si un vuelo planeado no se realizo, debe cancelarse antes de registrar el servicio.

La transaccion bloquea la aeronave igual que las operaciones de vuelos. La hora
se toma despues del bloqueo. La migracion 014_maintenance_execution_requests.sql
(ya aplicada localmente) agrega la tabla tecnica de idempotencia: reintentar el
mismo UUID devuelve el mismo registro; cambiar aeronave/tarea con ese UUID falla.
El formulario deshabilita confirmaciones mientras envia y conserva el UUID
ante errores. Una nueva apertura representa una nueva ejecucion intencional.

23 pruebas del backend aprobadas, incluyendo una tarea con cuatro unidades,
conservacion de acumulados/otras asignaciones, reintentos sin duplicados,
intervalos faltantes y aeronave en vuelo. Las pruebas revierten sus registros.

Para otras bases existentes, aplicar la migracion 014 antes de desplegar esta
version. No se requiere modificar las vistas ni recargar el escenario ficticio.
