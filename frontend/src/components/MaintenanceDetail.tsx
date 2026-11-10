import type { MaintenanceTask } from '../types';
import { useRef, useState } from 'react';
import { Badge, DetailGrid, Drawer } from './ui';
import { date, num, taskName } from '../utils/format';
import { useDashboard } from '../hooks/useDashboard';
export function MaintenanceDetail({
  task,
  onClose,
}: {
  task: MaintenanceTask;
  onClose: () => void;
}) {
  const { data, refresh } = useDashboard();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const pending = useRef(false);
  const request = useRef(crypto.randomUUID());
  task =
    data?.maintenance.find(
      (t) => t.aircraft_id === task.aircraft_id && t.mpd_number === task.mpd_number,
    ) || task;
  async function perform() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          request_id: request.current,
          aircraft_id: task.aircraft_id,
          mpd_number: task.mpd_number,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          typeof result.detail === 'string'
            ? result.detail
            : 'No se pudo registrar el mantenimiento.',
        );
      setSaved(result.maintenance_id);
      setConfirm(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar. Intenta nuevamente.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const history =
    data?.history.filter(
      (r) => r.aircraft_id === task.aircraft_id && r.mpd_number === task.mpd_number,
    ) || [];
  return (
    <Drawer
      title={taskName(task.mpd_number)}
      subtitle={`${task.aircraft_id} · MPD ${task.mpd_number}`}
      onClose={() => {
        if (!pending.current) onClose();
      }}
    >
      <Badge status={task.alert_status} />
      {saved ? (
        <p role="status" className="success-banner">
          Mantenimiento {saved} registrado. Se actualizaron las referencias de todos los límites de
          esta tarea.
        </p>
      ) : confirm ? (
        <section className="limit-card">
          <h3>Confirmar mantenimiento</h3>
          <p>
            Se registrará la tarea {task.mpd_number} en {task.aircraft_id} con la fecha, horas y
            ciclos actuales.
          </p>
          <p className="help">
            Todos sus límites usarán este servicio como referencia para los intervalos repetitivos.
            Los acumulados de la aeronave se conservan.
          </p>
          <div className="form-actions">
            <button className="button secondary" disabled={busy} onClick={() => setConfirm(false)}>
              Volver
            </button>
            <button className="button primary" disabled={busy} onClick={perform}>
              {busy ? 'Registrando…' : 'Confirmar mantenimiento'}
            </button>
          </div>
        </section>
      ) : (
        <button className="button primary" onClick={() => setConfirm(true)}>
          Realizar mantenimiento
        </button>
      )}
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      <h3>Límites de mantenimiento</h3>
      {task.limits.map((l) => (
        <div className="limit-card" key={l.interval_unit}>
          <div className="section-heading">
            <strong>
              {num(l.interval_value, 2)} {l.interval_unit}
            </strong>
            <Badge status={l.alert_status} />
          </div>
          <DetailGrid
            items={[
              ['Saldo', `${num(l.remaining_value, 2)} ${l.interval_unit || ''}`],
              [
                'Vencimiento',
                l.due_at
                  ? date(l.due_at)
                  : `${num(l.due_at_usage, 2)} ${l.interval_unit} acumulados`,
              ],
              ['Tipo', task.interval_type === 'REPEAT' ? 'Repetitivo' : 'Umbral inicial'],
              ['Referencia', date(l.reference_at)],
            ]}
          />
        </div>
      ))}
      <p className="help">
        HR = horas transcurridas · DY = días · FH = horas de vuelo · FC = ciclos. Saldo negativo:
        límite excedido.
      </p>
      <h3>Descripción original del MPD</h3>
      <p className="original-description">{task.description_original}</p>
      <DetailGrid
        items={[
          ['ATA / Tipo', `${task.ata_chapter} / ${task.task_type}`],
          ['Trabajo estimado', `${num(task.labor_hours, 2)} h`],
          ['Referencias AMM', task.amm_references.join(' · ') || 'No indicadas'],
          ['Zonas', task.zones.join(', ') || 'No indicadas'],
        ]}
      />
      {task.notes && <p>{task.notes}</p>}
      <h3>Historial de esta tarea</h3>
      {history.length ? (
        history.map((r) => (
          <div className="history-item" key={r.maintenance_id}>
            <strong>{r.maintenance_id}</strong>
            <span>{date(r.performed_at)}</span>
            <p>{r.notes || 'Sin observaciones'}</p>
            <small>
              {num(r.flight_hours_at_maintenance, 2)} FH · {num(r.flight_cycles_at_maintenance)} FC
            </small>
          </div>
        ))
      ) : (
        <p className="muted">Sin ejecuciones registradas. Se utiliza el inicio del seguimiento.</p>
      )}
    </Drawer>
  );
}
