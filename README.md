# LAF Aircraft Maintenance Intelligence

Demostracion academica de mantenimiento para una aerolinea ficticia.

## Tablas

## Vista de vencimientos

`maintenance_due` combina asignaciones, vuelos completados, historial e
intervalos. Presenta una fila por aeronave, tarea y unidad (48 filas inicialmente).
Usa el ultimo mantenimiento desde el inicio del seguimiento y hasta el instante
de consulta para REPEAT; sin historial usa THRESHOLD desde `tracking_start_at`.
En el caso inicial, la utilizacion de referencia se calcula con los vuelos
anteriores o iguales al inicio del seguimiento. Los datos futuros no se cuentan.
Para DY se adoptan periodos de 24 horas transcurridas en esta simulacion.

- `elapsed_value` y `remaining_value`: consumo y saldo en `interval_unit`.
- `due_at_usage`: FH o FC acumulados al vencimiento, sin pronosticar una fecha.
- `due_at`: vencimiento por HR/DY; NULL para FH/FC.
- `status`: WITHIN_LIMIT, DUE, OVERDUE, NOT_STARTED, MISSING_INTERVAL o DATA_ERROR.
- `evaluated_at`: instante de calculo. Los resultados se actualizan al consultar.

Las unidades se evaluan por separado; no se suman FH con FC o calendario ni se
infiere una regla global para combinar condiciones. Las FH se manejan con el
redondeo a dos decimales que ya utiliza el historial. El inicio de seguimiento
es una referencia ficticia de la demostracion, no la fecha de fabricacion.

Para reproducir la vista despues del script 011 (ya ejecutado localmente):

```powershell
Get-Content -Raw sql/012_create_maintenance_due.sql | docker compose exec -T db psql -U laf -d laf_maintenance -v ON_ERROR_STOP=1
```

Consultar `sql/consultas.sql` para ver todos los limites o solo los vencidos.
Se verificaron calculos THRESHOLD/REPEAT, calendario y estados DUE/OVERDUE;
las modificaciones de prueba se revirtieron.

## Catalogos y registros

- `aircraft_maintenance_tasks`: 40 asignaciones (cinco tareas por cada una de
  las ocho aeronaves), con inicio ficticio del seguimiento el 1 de noviembre
  de 2026 a las 00:00 de Monterrey (UTC-06). No almacena FH/FC iniciales,
  ejecuciones de mantenimiento ni horas restantes.

- `mpd_tasks`: numero MPD, ATA, tipo, descripcion original, referencias AMM,
  zonas, notas y horas estimadas de trabajo.
- `task_intervals`: numero MPD, tipo (`THRESHOLD` o `REPEAT`), valor y unidad
  (`FH`, `FC`, `DY`, `HR`).
- `aircrafts`: ocho aeronaves ficticias, LAF-737-001 a LAF-737-008, con
  especificaciones definidas por el usuario para la demostracion.
- `flight_routes`: seis rutas direccionales entre MTY y MEX/GDL/CUN, con
  distancias de referencia de 384/361/783 NM respectivamente. No representan
  vuelos especificos ni distancias realmente recorridas.

Los intervalos se almacenan exclusivamente en `task_intervals`. Una tarea puede
tener varias unidades por tipo. Las referencias AMM y zonas son listas de texto.
Las notas y horas de trabajo desconocidas pueden ser NULL. El numero MPD es unico
en esta prueba, limitada a una sola edicion documental. Se incluyen cinco tareas
de demostracion y doce intervalos. No se incluyen calculos de vencimientos.

## Iniciar PostgreSQL

Para reproducir las asignaciones una sola vez, despues de crear y cargar
`aircrafts` y `mpd_tasks` (ya ejecutado en la base local):

```powershell
Get-Content -Raw sql/010_create_aircraft_maintenance_tasks.sql | docker compose exec -T db psql -U laf -d laf_maintenance -v ON_ERROR_STOP=1
```

La creacion y carga son transaccionales; este script no se ejecuta automaticamente
con Docker Compose y no reemplaza tablas existentes. El historial de mantenimiento
permanece en `maintenance_records`.

Requisito: Docker Desktop con Docker Compose y contenedores Linux.
Desde la terminal de VSCode, en la carpeta del proyecto:

```powershell
Copy-Item .env.example .env
```

Editar `.env` y sustituir el valor de `POSTGRES_PASSWORD` por una contrasena local.
Luego ejecutar:

```powershell
docker compose up -d
docker compose ps
```

El script `sql/001_create_tables.sql` crea ambas tablas automaticamente cuando
PostgreSQL inicializa un volumen de datos nuevo. Los datos persisten en el volumen
`postgres_data`. Reiniciar el contenedor no vuelve a ejecutar el script.

## Consultar desde VSCode

Instalar la extension PostgreSQL de Microsoft (`ms-ossdata.vscode-pgsql`).
Crear una conexion con estos valores:

- Host: `localhost`
- Puerto: `5432`
- Base: `laf_maintenance`
- Usuario: `laf`
- Contrasena: el valor configurado en `.env`

```sql
SELECT * FROM public.mpd_tasks;
SELECT * FROM public.task_intervals;
SELECT * FROM public.aircrafts ORDER BY aircraft_id;
SELECT * FROM public.flight_routes ORDER BY route_id;
```

La base local contiene cinco tareas y doce intervalos, pendientes de validacion
aeronautica. Actualizar los resultados de las consultas para verlos.

Para reproducir la carga en una base con las tablas vacias:

```powershell
Get-Content -Raw sql/002_seed_tasks.sql | docker compose exec -T db psql -U laf -d laf_maintenance -v ON_ERROR_STOP=1
```

La carga es transaccional. Ejecutarla una segunda vez genera un error de clave
duplicada y no sobrescribe los registros existentes. No se ejecuta automaticamente
al iniciar Docker Compose.

La tabla `aircrafts` y sus ocho registros se crean con el siguiente script,
una sola vez por base de datos (ya ejecutado en la base local):

```powershell
Get-Content -Raw sql/003_create_aircrafts.sql | docker compose exec -T db psql -U laf -d laf_maintenance -v ON_ERROR_STOP=1
```

Este script tambien es transaccional y no se ejecuta automaticamente al iniciar
Docker Compose. No modifica las tareas ni sus intervalos.

La tabla `flight_routes` y sus seis registros se crean una sola vez con
el siguiente script (ya ejecutado en la base local):

```powershell
Get-Content -Raw sql/004_create_flight_routes.sql | docker compose exec -T db psql -U laf -d laf_maintenance -v ON_ERROR_STOP=1
```

Este script es transaccional y no se ejecuta automaticamente con Docker Compose.
Los identificadores terminados en `a` salen de MTY y los terminados en `b`
regresan a MTY. Las fuentes de las distancias estan documentadas en el script.

Si se utiliza un PostgreSQL ya instalado, ejecutar el archivo SQL en una base
vacia desde la extension. El script es transaccional y se ejecuta una sola vez;
no elimina ni reemplaza tablas existentes.

## Registros de vuelos

`flight_records` contiene veinte vuelos ficticios completados del 1 al 5 de
noviembre de 2026, con las ocho aeronaves y las seis rutas. Los IDs tienen el
formato `LAF` y cinco digitos aleatorios, protegidos por una clave primaria.
Las fechas especifican UTC. Salida real significa despegue y llegada real
significa aterrizaje. `flight_time_minutes` es una columna generada; no se inserta
ni edita manualmente. Los acumulados por aeronave se consultan en la vista
`aircraft_utilization`; no se mantienen contadores almacenados.

Para reproducir en una base donde aun no exista esta tabla, ejecutar una vez,
en este orden (ya ejecutados en la base local):

```powershell
Get-Content -Raw sql/005_create_flight_records.sql | docker compose exec -T db psql -U laf -d laf_maintenance -v ON_ERROR_STOP=1
Get-Content -Raw sql/006_seed_flight_records.sql | docker compose exec -T db psql -U laf -d laf_maintenance -v ON_ERROR_STOP=1
```

Los scripts no se ejecutan automaticamente con Docker Compose. Repetir la carga
produce un error de clave duplicada sin reemplazar los datos.

```sql
SELECT * FROM public.flight_records ORDER BY planned_departure_at, flight_id;
```

## Historial de mantenimiento

La clave foranea compuesta `maintenance_records_assignment_fkey` exige que
cada par `(aircraft_id, mpd_number)` exista en `aircraft_maintenance_tasks`.
No se puede eliminar una asignacion con mantenimientos asociados. Las claves
foraneas individuales hacia aeronaves y tareas se conservan.
Para aplicar este cambio despues del script 010 (ya aplicado localmente):

```powershell
Get-Content -Raw sql/011_link_maintenance_records_assignments.sql | docker compose exec -T db psql -U laf -d laf_maintenance -v ON_ERROR_STOP=1
```

`maintenance_records` registra una tarea completada por aeronave y fecha de
finalizacion. Sus claves foraneas enlazan `aircrafts` y `mpd_tasks`. Los IDs usan
el formato `MNT` seguido de cinco digitos, como `MNT00001`.
Las FH y FC son valores historicos almacenados, no acumulados dinamicos.
Al cargar registros deben obtenerse de los vuelos completados con aterrizaje
anterior o igual a `performed_at`; esta primera tabla no los calcula por trigger.
Las horas reales de trabajo y las notas pueden quedar en NULL si se desconocen.
No se reinician los acumulados de la aeronave al registrar mantenimiento.

La tabla contiene diez mantenimientos ficticios completados el 6 de noviembre
de 2026, con IDs MNT00001 a MNT00010. Los acumulados se calcularon a partir de
los vuelos completados hasta cada mantenimiento y quedaron almacenados.
Para reproducir su creacion una sola vez en otra base:

```powershell
Get-Content -Raw sql/008_create_maintenance_records.sql | docker compose exec -T db psql -U laf -d laf_maintenance -v ON_ERROR_STOP=1
```

El script ya se ejecuto en la base local. No se ejecuta automaticamente con
Docker Compose. La consulta esta incluida en `sql/consultas.sql`.

Para reproducir la carga en una tabla vacia (ya ejecutada en la base local):

```powershell
Get-Content -Raw -Encoding UTF8 sql/009_seed_maintenance_records.sql | docker compose exec -T db psql -U laf -d laf_maintenance -v ON_ERROR_STOP=1
```

La carga es transaccional; repetirla genera un error de clave duplicada sin
sobrescribir registros. Las observaciones y horas de trabajo son ficticias.

## Alcance de implementacion

La vista `aircraft_utilization` muestra las ocho aeronaves y calcula vuelos,
ciclos (uno por vuelo completado), horas decimales redondeadas a dos decimales
y ultimo aterrizaje. Solo considera `COMPLETED`. Sin vuelos completados muestra
ceros y `NULL` para el ultimo aterrizaje. No representa utilizacion anterior
a los vuelos registrados en el proyecto.

Para crearla una vez en otra base con las tablas anteriores disponibles
(ya ejecutado en la base local):

```powershell
Get-Content -Raw sql/007_create_aircraft_utilization.sql | docker compose exec -T db psql -U laf -d laf_maintenance -v ON_ERROR_STOP=1
```

No se ejecuta automaticamente al iniciar Docker Compose. Para consultar:

```sql
SELECT * FROM public.aircraft_utilization ORDER BY aircraft_id;
```

Esta entrega contiene SQL y configuracion local de Docker Compose. No incluye
todavia modelos SQLAlchemy, migraciones Alembic, parser, frontend ni prediccion.
