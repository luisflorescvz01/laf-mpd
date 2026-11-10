# Escenario ampliado de demostracion

Aplicado el 2026-11-09, con referencia inicial 2026-08-11 00:00 America/Monterrey.
Los vuelos abarcan del 11 de agosto al 8 de noviembre (90 dias completos).
Los registros operativos son sinteticos; no representan mantenimiento real.

## Resultado

| Datos | Antes | Despues |
|---|---:|---:|
| Aeronaves | 8 | 8 |
| Rutas | 6 | 6 |
| Tareas MPD | 5 | 15 |
| Intervalos (umbral y repeticion) | 12 | 36 |
| Asignaciones aeronave/tarea | 40 | 120 |
| Vuelos | 20 | 1120 |
| Servicios realizados | 10 | 809 |

Total: 1808.97 FH y 1120 FC. La suma de horas redondeadas por aeronave
puede diferir por 0.01 del total calculado desde los minutos originales.
Al verificar la carga, la API devolvio 13 tareas urgentes (11 vencidas y 2
en el limite), 12 proximas y 0 errores de datos. Los estados de calendario
cambian con el reloj; estos conteos no son constantes.

## Procedencia de las tareas

Las diez adiciones estan transcritas en `database/seeds/additional_mpd_tasks.json`.
Fuente: ZIP entregado por el usuario, D626A011, edicion 2026-05-15,
`01___056.PDF`, paginas impresas 1.1-26, 1.1-73, 1.1-79 y 1.1-84
(paginas PDF 34, 81, 87 y 92). Se verificaron visualmente las filas,
referencias AMM, zonas, horas de labor y ambas columnas de intervalos.
Se conserva la revision de cada pagina en el JSON y en las notas de la tarea.
Todos estos datos siguen pendientes de validacion aeronautica.

Las tareas originales y sus intervalos se conservaron. Las nuevas tareas
utilizan solo unidades ya soportadas: FH, FC y DY; no se convirtieron meses
o anos a dias. La tarea original de neumaticos conserva sus 48 HR.
La asignacion a toda la flota es una simplificacion del proyecto ficticio.

## Reglas del escenario

- Se preservaron y compararon todos los atributos de aeronaves y rutas.
- Cada jornada activa tiene ida y regreso a MTY, sin vuelos superpuestos y
  con al menos 55 minutos programados entre tramos.
- Diferentes dias activos por avion: 90, 86, 82, 78, 70, 62, 54 y 38.
- Duraciones aproximadas: MEX 70-85 minutos, GDL 65-80 y CUN 135-150.
- Pasajeros, carga y combustible son valores ficticios consistentes con
  las capacidades guardadas. No constituyen calculos de performance.
- Las horas y ciclos de cada servicio se derivan de vuelos ya aterrizados
  a la fecha del servicio, usando el mismo redondeo que las vistas.
- Las inspecciones de neumaticos frecuentes explican gran parte del historial.
- Se incluyen servicios preventivos anticipados y omisiones deliberadas
  para demostrar avisos. No se alteran los intervalos MPD para obtenerlos.
- Hay tareas sin servicio previo que siguen evaluandose por umbral inicial.
- Se verifico que ningun servicio ocurra durante un vuelo. No se modelan
  duraciones de inmovilizacion ni capacidad de talleres.
- No se han agregado horas anteriores al comienzo de este escenario.

## Ejecucion y validacion

`database/seeds/refresh_demo.py` es un generador de datos demostrativos,
no un parser de MPD ni una migracion de estructura. Usa semilla 20261109;
las fechas se anclan al dia de ejecucion y los ultimos servicios HR al reloj.
Reejecutarlo otro dia cambia las fechas del escenario.

Por defecto ejecuta la carga y las validaciones dentro de una transaccion
que termina en ROLLBACK. `--apply` confirma el reemplazo completo de los
registros operativos. Cualquier validacion fallida revierte la transaccion.
No ejecutar con `--apply` para una simple consulta o despues de introducir
datos propios sin preparar antes otro respaldo.

Desde la raiz del proyecto:

```powershell
docker compose cp database/seeds api:/tmp/laf-demo-seeds
docker compose exec -T api python /tmp/laf-demo-seeds/refresh_demo.py
# Solo para reemplazar nuevamente el escenario, con respaldo previo:
docker compose exec -T api python /tmp/laf-demo-seeds/refresh_demo.py --apply
docker compose exec -T api python -m pytest -q
```

La carga aplicada y sus conteos estan en `database/seeds/demo-refresh-result.json`.
Se probaron integridad, continuidad, pesos, snapshots, fechas y estados;
las cuatro pruebas del backend pasaron y la API publicada por el frontend
entrego todos los registros nuevos.

## Respaldo anterior

`database/backups/laf-before-demo-expansion-20261109.dump` es un respaldo
completo en formato custom de PostgreSQL, anterior al reemplazo.
No se borro el volumen Docker. Para inspeccionar o recuperar datos, restaurar
primero en una base separada; no sobreescribir la base activa directamente.

```powershell
docker compose cp database/backups/laf-before-demo-expansion-20261109.dump db:/tmp/laf-before-demo-expansion.dump
docker compose exec -T db createdb -U laf laf_restore_review
docker compose exec -T db pg_restore -U laf -d laf_restore_review --exit-on-error /tmp/laf-before-demo-expansion.dump
```

El comando createdb requiere que el nombre de destino no exista. Esta
restauracion separada no cambia la conexion ni los datos del dashboard.
