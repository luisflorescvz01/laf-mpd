# Registro de vuelos

En Vuelos, pulsa **Nuevo vuelo**, selecciona aeronave y ruta e introduce los
la salida programada en Monterrey. La llegada se calcula automaticamente sumando
el promedio de minutos de vuelos completados de esa ruta, redondeado al minuto.
El campo de llegada es de solo lectura y se actualiza al cambiar ruta o salida.
El backend vuelve a calcularla al guardar; sin historial de ruta rechaza el alta.
No se modifican las llegadas de vuelos ya guardados ni los horarios reales. El backend asigna `LAF` y cinco digitos
aleatorios unicos. El registro nace en PLANNED y no modifica FH/FC.

En la fila o el detalle del vuelo, **Finalizar** abre la captura de despegue,
aterrizaje, distancia real, combustible inicial/final, pasajeros y carga util
(pasajeros, equipaje y carga; sin combustible). La finalizacion pasa a COMPLETED.
No hay edicion ni transicion a IN_PROGRESS en esta entrega.

Los vuelos PLANNED tienen una accion Cancelar con confirmacion. POST
`/api/flights/{flight_id}/cancel` conserva el registro como CANCELLED, sin
sumar FH/FC. Los reintentos son idempotentes. Se rechazan vuelos completados
o en progreso. La cancelacion libera el horario; no cancela ni reprograma
vuelos posteriores, cuya continuidad se valida nuevamente al finalizarlos.

## Actualizacion

`flight_time_minutes` se calcula en PostgreSQL. Las vistas existentes suman
solo vuelos completados: un vuelo completado suma un FC y su duracion / 60 FH.
`maintenance_due` utiliza esa nueva utilizacion. Al guardar, React solicita
un nuevo snapshot completo que actualiza las secciones de la app. Los limites
FH/FC consumen utilizacion; los limites HR/DY siguen avanzando con el reloj.
Si falla ese refresco, el aviso de conexion permite reintentar sin repetir el alta.

## API y validaciones

- POST `/api/flights`: `request_id` UUID, aircraft_id, route_id y planned_departure_at. No recibe planned_arrival_at.
- POST `/api/flights/{flight_id}/complete`: fechas reales y cantidades del formulario.
- Fechas con zona obligatoria; llegada posterior a salida y aterrizaje no futuro.
- El horario real no puede contener un mantenimiento registrado.
- Aeronave y ruta existentes, horarios sin solapamientos y continuidad entre
  aeropuerto de llegada del vuelo anterior y salida del siguiente.
- Pasajeros enteros, cantidades no negativas, distancia positiva y precision
  compatible con PostgreSQL. Se rechazan campos inesperados.
- Capacidad de pasajeros, carga maxima y MTOW: OEW + carga util + combustible.
- Combustible al aterrizaje no mayor al del despegue.
- Solo se finaliza un PLANNED; reenviar exactamente la misma finalizacion
  devuelve el registro completado sin sumar de nuevo. Otros datos devuelven 409.
- Un aterrizaje anterior o igual al ultimo mantenimiento de la aeronave se
  rechaza con 409: agregarlo invalidaria los snapshots historicos de FH/FC.
  No se reescribe el historial automaticamente. La importacion/correccion
  retroactiva requiere un flujo posterior de revision.

Estos son controles del proyecto ficticio, no calculos de performance ni
autorizaciones operacionales. No se bloquean vuelos por alertas de mantenimiento.

## Persistencia y concurrencia

Las lecturas siguen usando el motor SQLAlchemy de solo lectura. Las escrituras
usan otro motor y una transaccion por solicitud que confirma antes de responder.
Se bloquea la fila de aeronave para serializar sus operaciones y validar contra
los vuelos ya confirmados. El identificador de solicitud se bloquea antes de
consultar la idempotencia. Colisiones del ID aleatorio se reintentan.

La migracion `013_flight_creation_requests.sql`, ya aplicada a la base local,
agrega una tabla tecnica con UUID, hash del contenido y vuelo. Un reintento de
creacion con el mismo UUID devuelve el mismo vuelo; si cambia el contenido,
se rechaza. El frontend conserva ese UUID al reintentar el mismo formulario
y deshabilita el envio durante la solicitud. Una nueva apertura del formulario
genera otra solicitud; la validacion de solapamiento sigue protegiendo duplicados.

Para otra base existente, aplicar la migracion antes de iniciar esta version:

```powershell
docker compose cp database/migrations/013_flight_creation_requests.sql db:/tmp/013_flight_creation_requests.sql
docker compose exec -T db psql -U laf -d laf_maintenance -v ON_ERROR_STOP=1 -f /tmp/013_flight_creation_requests.sql
docker compose up -d --build api frontend
```

## Pruebas

`docker compose exec -T api python -m pytest -q`: 20 pruebas aprobadas,
incluyendo ciclo de vida, reintentos, limites de capacidad, fechas, solapamientos,
continuidad, y reduccion exacta de saldos FH/FC. Las integraciones usan la base
de demostracion dentro de transacciones revertidas; no dejan datos nuevos.
La aeronave 008 se aisla temporalmente dentro de la transaccion de cada prueba;
al revertirla, sus vuelos y servicios originales quedan intactos.

Prueba adicional en navegador: vuelo de 75 minutos, resultado +1.25 FH y +1 FC;
se elimino solamente ese vuelo de prueba despues de verificarlo. Los 1120 vuelos
y 809 servicios del escenario se conservaron.
