import type { MaintenanceTask } from '../types';
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
  const { data } = useDashboard();
  const history =
    data?.history.filter(
      (r) => r.aircraft_id === task.aircraft_id && r.mpd_number === task.mpd_number,
    ) || [];
  return (
    <Drawer
      title={taskName(task.mpd_number)}
      subtitle={`${task.aircraft_id} · MPD ${task.mpd_number}`}
      onClose={onClose}
    >
      <Badge status={task.alert_status} />
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
