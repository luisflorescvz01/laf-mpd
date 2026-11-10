import { ArrowUpRight } from 'lucide-react';
import type { MaintenanceTask } from '../types';
import { Badge, Empty } from './ui';
import { num, taskName } from '../utils/format';
export function MaintenanceTable({
  tasks,
  onSelect,
}: {
  tasks: MaintenanceTask[];
  onSelect: (t: MaintenanceTask) => void;
}) {
  if (!tasks.length) return <Empty message="No hay tareas que coincidan con esta selección." />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Aeronave / Tarea</th>
            <th>Estado</th>
            <th>Límite determinante</th>
            <th>Saldo</th>
            <th>
              <span className="sr-only">Detalle</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const l = t.limits[0];
            return (
              <tr key={t.aircraft_id + t.mpd_number}>
                <td>
                  <button className="table-link" onClick={() => onSelect(t)}>
                    {t.aircraft_id}
                    <span>
                      {t.mpd_number} · {taskName(t.mpd_number)}
                    </span>
                  </button>
                </td>
                <td>
                  <Badge status={t.alert_status} />
                </td>
                <td>
                  <strong>
                    {num(l.interval_value)} {l.interval_unit}
                  </strong>
                  <small>
                    {t.interval_type === 'REPEAT' ? 'Repetitivo' : 'Umbral inicial'}
                    {t.limits.length > 1 ? ` · ${t.limits.length} límites` : ''}
                  </small>
                </td>
                <td
                  className={l.remaining_value != null && l.remaining_value < 0 ? 'negative' : ''}
                >
                  {num(l.remaining_value, 2)} <span className="muted">{l.interval_unit}</span>
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`Ver ${t.mpd_number} de ${t.aircraft_id}`}
                    onClick={() => onSelect(t)}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
