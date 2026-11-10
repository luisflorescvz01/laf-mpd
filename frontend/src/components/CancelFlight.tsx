import { useRef, useState } from 'react';
import { Drawer } from './ui';
import { saveFlight } from '../api/client';
import { date } from '../utils/format';
import type { Flight } from '../types';

export function CancelFlight({
  flight,
  onClose,
  onSaved,
}: {
  flight: Flight;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const close = () => {
    if (!pending.current) onClose();
  };
  async function cancel() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await saveFlight(`/${flight.flight_id}/cancel`, {});
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cancelar. Intenta nuevamente.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Drawer
      title={`Cancelar ${flight.flight_id}`}
      subtitle={`${flight.aircraft_id} · ${flight.departure} → ${flight.arrival}`}
      onClose={close}
    >
      <p>
        ¿Confirmas la cancelación del vuelo programado para {date(flight.planned_departure_at)}?
      </p>
      <p className="muted">
        El registro permanecerá en el historial como cancelado. No sumará horas ni ciclos. Los demás
        vuelos conservarán su programación.
      </p>
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="button secondary" disabled={busy} onClick={close}>
          Volver
        </button>
        <button className="button primary" disabled={busy} onClick={cancel}>
          {busy ? 'Cancelando…' : 'Confirmar cancelación'}
        </button>
      </div>
    </Drawer>
  );
}
