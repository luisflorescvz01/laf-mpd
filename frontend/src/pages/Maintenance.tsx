import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { MaintenanceTable } from '../components/MaintenanceTable';
import { MaintenanceDetail } from '../components/MaintenanceDetail';
import { SearchBox, Pagination } from '../components/ui';
import { statusLabels, taskName } from '../utils/format';
import type { MaintenanceTask } from '../types';
export function Maintenance() {
  const { data } = useDashboard();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MaintenanceTask | null>(null);
  if (!data) return null;
  const aircraft = params.get('aircraft') || '',
    status = params.get('status') || '';
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
    setPage(1);
  };
  const tasks = data.maintenance.filter(
    (t) =>
      (!aircraft || t.aircraft_id === aircraft) &&
      (!status ||
        (status === 'urgent'
          ? ['OVERDUE', 'DUE'].includes(t.alert_status)
          : status === 'attention'
            ? ['OVERDUE', 'DUE', 'NEAR_LIMIT', 'DATA_ERROR', 'MISSING_INTERVAL'].includes(
                t.alert_status,
              )
            : status === 'review'
              ? ['DATA_ERROR', 'MISSING_INTERVAL'].includes(t.alert_status)
              : t.alert_status === status)) &&
      `${t.aircraft_id} ${t.mpd_number} ${taskName(t.mpd_number)} ${t.description_original}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(tasks.length / 8)));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Control de mantenimiento<span>.</span>
          </h1>
          <p>Intervalos, saldos y vencimientos de cada tarea asignada.</p>
        </div>
        <span className="outline-pill">Aviso al {data.warning_ratio * 100}% restante</span>
      </div>
      <div className="toolbar">
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Buscar tarea o aeronave…"
        />
        <select
          aria-label="Filtrar por aeronave"
          value={aircraft}
          onChange={(e) => change('aircraft', e.target.value)}
        >
          <option value="">Todas las aeronaves</option>
          {data.aircrafts.map((a) => (
            <option key={a.aircraft_id}>{a.aircraft_id}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar por estado"
          value={status}
          onChange={(e) => change('status', e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="attention">Requieren atención</option>
          <option value="urgent">Vencidas / en límite</option>
          <option value="review">Revisar datos</option>
          {['OVERDUE', 'DUE', 'NEAR_LIMIT', 'WITHIN_LIMIT', 'NOT_STARTED'].map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
        <button
          className="button secondary"
          onClick={() => {
            setParams({});
            setQ('');
            setPage(1);
          }}
        >
          Limpiar
        </button>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>
            Tareas asignadas <span className="count-pill">{tasks.length}</span>
          </h2>
          <span className="help">Prioridad más urgente primero</span>
        </div>
        <MaintenanceTable
          tasks={tasks.slice((current - 1) * 8, current * 8)}
          onSelect={setSelected}
        />
        <Pagination page={current} setPage={setPage} total={tasks.length} />
      </section>
      <p className="help">
        Los límites se conservan por unidad. La prioridad visual usa el estado más urgente; no
        cambia el requisito de mantenimiento.
      </p>
      {selected && (
        <MaintenanceDetail
          task={
            data.maintenance.find(
              (t) => t.aircraft_id === selected.aircraft_id && t.mpd_number === selected.mpd_number,
            ) || selected
          }
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
