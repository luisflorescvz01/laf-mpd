import { useRef, useState, type FormEvent } from 'react';
import { Drawer } from './ui';
import { useDashboard } from '../hooks/useDashboard';
import { saveFlight } from '../api/client';
import type { Flight } from '../types';

function monterreyInput(value: string) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Monterrey',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
  return parts.replace(' ', 'T');
}

export function FlightForm({
  flight,
  onClose,
  onSaved,
}: {
  flight?: Flight;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { data } = useDashboard();
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState('');
  const [aircraftId, setAircraftId] = useState(
    flight?.aircraft_id || data?.aircrafts[0]?.aircraft_id || '',
  );
  const [routeId, setRouteId] = useState('');
  const [departure, setDeparture] = useState('');
  const request = useRef({ id: crypto.randomUUID(), body: '' });
  if (!data) return null;
  const duration = data.routes.find((r) => r.route_id === routeId)?.estimated_duration_minutes;
  const departureMs = departure ? new Date(`${departure}:00-06:00`).getTime() : NaN;
  const arrival =
    duration && Number.isFinite(departureMs)
      ? monterreyInput(new Date(departureMs + duration * 60000).toISOString())
      : '';
  const aircraft = data.aircrafts.find((a) => a.aircraft_id === aircraftId);
  const close = () => {
    if (!submitting.current) onClose();
  };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    const fields = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    fields.forEach((value, key) => {
      payload[key] = key.endsWith('_at')
        ? `${value}:00-06:00`
        : [
              'passengers',
              'payload_kg',
              'fuel_at_departure_kg',
              'fuel_at_arrival_kg',
              'flight_distance_nm',
            ].includes(key)
          ? Number(value)
          : value;
    });
    if (!flight) {
      const body = JSON.stringify(payload);
      if (request.current.body && request.current.body !== body)
        request.current.id = crypto.randomUUID();
      request.current.body = body;
      payload.request_id = request.current.id;
    }
    try {
      const result = await saveFlight(flight ? `/${flight.flight_id}/complete` : '', payload);
      onSaved(result.flight_id);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo conectar. Reintenta con los mismos datos para evitar duplicados.',
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Drawer
      title={flight ? `Finalizar ${flight.flight_id}` : 'Nuevo vuelo planeado'}
      subtitle="Horarios de Monterrey · UTC−06"
      onClose={close}
    >
      <p className="muted">
        {flight
          ? `${flight.aircraft_id} · ${flight.departure} → ${flight.arrival}. Registra el despegue y aterrizaje reales; las FH y FC se actualizarán al guardar.`
          : 'El identificador LAF se asignará automáticamente. Un vuelo planeado todavía no suma horas ni ciclos.'}
      </p>
      <form onSubmit={submit} className="flight-form">
        <fieldset disabled={busy}>
          {!flight && (
            <>
              <label>
                Aeronave
                <select
                  name="aircraft_id"
                  required
                  value={aircraftId}
                  onChange={(e) => setAircraftId(e.target.value)}
                >
                  {data.aircrafts.map((a) => (
                    <option key={a.aircraft_id}>{a.aircraft_id}</option>
                  ))}
                </select>
              </label>
              <label>
                Ruta
                <select
                  name="route_id"
                  required
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                >
                  <option value="" disabled>
                    Selecciona una ruta
                  </option>
                  {data.routes.map((r) => (
                    <option key={r.route_id} value={r.route_id}>
                      {r.departure} → {r.arrival} · {r.distance_nm} NM
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <div className="form-grid">
            <label>
              {flight ? 'Despegue real' : 'Salida programada'}
              <input
                required
                type="datetime-local"
                name={flight ? 'actual_departure_at' : 'planned_departure_at'}
                defaultValue={flight ? monterreyInput(flight.planned_departure_at) : undefined}
                onChange={flight ? undefined : (e) => setDeparture(e.target.value)}
              />
            </label>
            <label>
              {flight ? 'Aterrizaje real' : 'Llegada programada'}
              <input
                required
                type="datetime-local"
                name={flight ? 'actual_arrival_at' : undefined}
                readOnly={!flight}
                value={flight ? undefined : arrival}
                defaultValue={flight ? monterreyInput(flight.planned_arrival_at) : undefined}
              />
            </label>
          </div>
          {!flight && (
            <p className="help">
              {duration
                ? `Llegada automática: salida + ${duration} minutos (promedio de vuelos completados de esta ruta).`
                : 'Selecciona una ruta con historial para calcular la llegada automáticamente.'}
            </p>
          )}
          {flight && (
            <>
              <div className="form-grid">
                <label>
                  Distancia real (NM)
                  <input
                    required
                    type="number"
                    name="flight_distance_nm"
                    min="0.01"
                    max="999999.99"
                    step="0.01"
                    defaultValue={
                      data.routes.find((r) => r.route_id === flight.route_id)?.distance_nm
                    }
                  />
                </label>
                <label>
                  Pasajeros
                  <input
                    required
                    type="number"
                    name="passengers"
                    min="0"
                    step="1"
                    max={aircraft?.passenger_capacity ?? undefined}
                  />
                </label>
                <label>
                  Combustible al despegue (kg)
                  <input
                    required
                    type="number"
                    name="fuel_at_departure_kg"
                    min="0"
                    max="99999999.99"
                    step="0.01"
                  />
                </label>
                <label>
                  Combustible al aterrizaje (kg)
                  <input
                    required
                    type="number"
                    name="fuel_at_arrival_kg"
                    min="0"
                    max="99999999.99"
                    step="0.01"
                  />
                </label>
              </div>
              <label>
                Carga útil: pasajeros, equipaje y carga (kg)
                <input
                  required
                  type="number"
                  name="payload_kg"
                  min="0"
                  step="0.01"
                  max={aircraft?.max_payload_kg ?? undefined}
                />
              </label>
              <p className="help">
                No incluyas combustible en la carga útil. Capacidad: {aircraft?.passenger_capacity}{' '}
                pasajeros · {aircraft?.max_payload_kg} kg de carga. El backend verifica también el
                peso máximo al despegue.
              </p>
              <p className="help">
                El aterrizaje debe haber ocurrido y ser posterior al último mantenimiento
                registrado, para conservar la coherencia del historial.
              </p>
            </>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="error-banner">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={close} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className="button primary" disabled={busy || (!flight && !arrival)}>
            {busy ? 'Guardando…' : flight ? 'Completar vuelo' : 'Crear vuelo planeado'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
