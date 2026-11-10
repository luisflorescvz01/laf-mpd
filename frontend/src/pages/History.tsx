import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { Empty, Pagination, SearchBox, Drawer, DetailGrid } from '../components/ui';
import { date, num, taskName } from '../utils/format';
import type { HistoryRecord } from '../types';
export function HistoryPage() {
  const { data } = useDashboard();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<HistoryRecord | null>(null);
  if (!data) return null;
  const aircraft = params.get('aircraft') || '';
  const rows = data.history.filter(
    (r) =>
      (!aircraft || r.aircraft_id === aircraft) &&
      `${r.maintenance_id} ${r.mpd_number} ${taskName(r.mpd_number)} ${r.notes}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 8)));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Historial de mantenimiento<span>.</span>
          </h1>
          <p>La trazabilidad de cada intervención, en un solo lugar.</p>
        </div>
        <span className="outline-pill">{data.history.length} trabajos completados</span>
      </div>
      <div className="toolbar">
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Buscar mantenimiento, tarea u observación…"
        />
        <select
          aria-label="Aeronave del mantenimiento"
          value={aircraft}
          onChange={(e) => {
            setParams(e.target.value ? { aircraft: e.target.value } : {});
            setPage(1);
          }}
        >
          <option value="">Todas las aeronaves</option>
          {data.aircrafts.map((a) => (
            <option key={a.aircraft_id}>{a.aircraft_id}</option>
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
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Registro / Aeronave</th>
                  <th>Tarea</th>
                  <th>Finalización</th>
                  <th>FH / FC al servicio</th>
                  <th>Trabajo real</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.slice((current - 1) * 8, current * 8).map((r) => (
                  <tr key={r.maintenance_id}>
                    <td>
                      <button className="table-link" onClick={() => setSelected(r)}>
                        {r.maintenance_id}
                        <span>{r.aircraft_id}</span>
                      </button>
                    </td>
                    <td>
                      {taskName(r.mpd_number)}
                      <small>{r.mpd_number}</small>
                    </td>
                    <td>{date(r.performed_at)}</td>
                    <td>
                      {num(r.flight_hours_at_maintenance, 2)} FH
                      <small>{num(r.flight_cycles_at_maintenance)} FC</small>
                    </td>
                    <td>{num(r.actual_labor_hours, 2)} h</td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Ver mantenimiento ${r.maintenance_id}`}
                        onClick={() => setSelected(r)}
                      >
                        <ArrowUpRight size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
        <Pagination page={current} setPage={setPage} total={rows.length} />
      </section>
      <p className="help">
        Las FH y FC son valores históricos guardados al finalizar cada mantenimiento.
      </p>
      {selected && (
        <Drawer
          title={selected.maintenance_id}
          subtitle={`${selected.aircraft_id} · ${taskName(selected.mpd_number)}`}
          onClose={() => setSelected(null)}
        >
          <DetailGrid
            items={[
              ['Finalización', date(selected.performed_at)],
              ['Tarea MPD', selected.mpd_number],
              ['Horas al servicio', `${num(selected.flight_hours_at_maintenance, 2)} FH`],
              ['Ciclos al servicio', `${num(selected.flight_cycles_at_maintenance)} FC`],
              ['Trabajo real', `${num(selected.actual_labor_hours, 2)} h`],
            ]}
          />
          <h3>Observaciones</h3>
          <p className="original-description">{selected.notes || 'Sin observaciones'}</p>
          <h3>Descripción original del MPD</h3>
          <p>{selected.description_original}</p>
        </Drawer>
      )}
    </>
  );
}
