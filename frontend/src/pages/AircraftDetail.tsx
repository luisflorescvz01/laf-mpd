import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plane } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { DetailGrid, Badge } from '../components/ui';
import { MaintenanceTable } from '../components/MaintenanceTable';
import { MaintenanceDetail } from '../components/MaintenanceDetail';
import { date, num, taskName } from '../utils/format';
import type { MaintenanceTask } from '../types';
export function AircraftDetail() {
  const { id } = useParams();
  const { data } = useDashboard();
  const [tab, setTab] = useState('tasks');
  const [selected, setSelected] = useState<MaintenanceTask | null>(null);
  if (!data) return null;
  const a = data.aircrafts.find((a) => a.aircraft_id === id);
  if (!a)
    return (
      <div className="empty">
        <h1>Aeronave no encontrada</h1>
        <Link to="/aeronaves">Volver a la flota</Link>
      </div>
    );
  const tasks = data.maintenance.filter((t) => t.aircraft_id === id),
    flights = data.flights.filter((f) => f.aircraft_id === id),
    history = data.history.filter((r) => r.aircraft_id === id);
  return (
    <>
      <Link to="/aeronaves" className="back-link">
        <ArrowLeft size={15} />
        Volver a aeronaves
      </Link>
      <div className="page-heading">
        <div>
          <h1>
            {a.aircraft_id}
            <span>.</span>
          </h1>
          <p>
            {a.manufacturer} {a.model} · {a.engine_type}
          </p>
        </div>
        <Plane size={44} className="accent" />
      </div>
      <div className="stat-grid aircraft-detail-stats">
        <div className="stat-card">
          <span>Horas registradas</span>
          <strong className="stat-value">
            {num(a.total_flight_hours, 2)} <small>FH</small>
          </strong>
        </div>
        <div className="stat-card">
          <span>Ciclos registrados</span>
          <strong className="stat-value">
            {num(a.total_flight_cycles)} <small>FC</small>
          </strong>
        </div>
        <div className="stat-card">
          <span>Último aterrizaje</span>
          <strong className="date-value">{date(a.last_flight_at)}</strong>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Detalle de aeronave">
        {[
          ['tasks', `Tareas (${tasks.length})`],
          ['specs', 'Características'],
          ['flights', `Vuelos (${flights.length})`],
          ['history', `Historial (${history.length})`],
        ].map(([key, label]) => (
          <button
            role="tab"
            aria-selected={tab === key}
            key={key}
            className={tab === key ? 'active' : ''}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="panel" role="tabpanel">
        {tab === 'tasks' && <MaintenanceTable tasks={tasks} onSelect={setSelected} />}
        {tab === 'specs' && (
          <>
            <div className="section-heading">
              <h2>Configuración de la aeronave</h2>
              <span className="help">Datos ficticios definidos para LAF</span>
            </div>
            <DetailGrid
              items={[
                ['Fabricante', a.manufacturer],
                ['Modelo', a.model],
                ['Año de fabricación', a.year_manufactured ?? '—'],
                ['Motor', a.engine_type || '—'],
                ['Capacidad', `${num(a.passenger_capacity)} pasajeros`],
                ['Peso vacío básico (BEW)', `${num(a.basic_empty_weight_kg)} kg`],
                ['Peso vacío operativo (OEW)', `${num(a.operational_empty_weight_kg)} kg`],
                ['Carga útil máxima', `${num(a.max_payload_kg)} kg`],
                ['Peso máximo de despegue', `${num(a.max_takeoff_weight_kg)} kg`],
                ['Velocidad de crucero', `${num(a.cruise_speed_kmph)} km/h`],
                ['Alcance', `${num(a.range_nm)} NM`],
                ['Techo', `${num(a.ceiling_limit_ft)} ft`],
              ]}
            />
          </>
        )}
        {tab === 'flights' && (
          <>
            <div className="section-heading">
              <h2>Vuelos de la aeronave</h2>
              <Link className="text-link" to={`/vuelos?aircraft=${id}`}>
                Ver detalle de vuelos →
              </Link>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Vuelo</th>
                    <th>Ruta</th>
                    <th>Despegue</th>
                    <th>Duración</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {flights.map((f) => (
                    <tr key={f.flight_id}>
                      <td>{f.flight_id}</td>
                      <td>
                        {f.departure} → {f.arrival}
                      </td>
                      <td>{date(f.actual_departure_at)}</td>
                      <td>{num(f.flight_time_minutes)} min</td>
                      <td>
                        <Badge status={f.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!flights.length && <p className="empty">Sin vuelos registrados.</p>}
          </>
        )}
        {tab === 'history' && (
          <>
            <div className="section-heading">
              <h2>Intervenciones realizadas</h2>
              <Link className="text-link" to={`/historial?aircraft=${id}`}>
                Ver historial completo →
              </Link>
            </div>
            {history.length ? (
              history.map((r) => (
                <div key={r.maintenance_id} className="history-item">
                  <strong>
                    {r.maintenance_id} · {taskName(r.mpd_number)}
                  </strong>
                  <span>{date(r.performed_at)}</span>
                  <p>{r.notes}</p>
                  <small>
                    {num(r.flight_hours_at_maintenance, 2)} FH ·{' '}
                    {num(r.flight_cycles_at_maintenance)} FC
                  </small>
                </div>
              ))
            ) : (
              <p className="empty">Sin mantenimientos registrados.</p>
            )}
          </>
        )}
      </section>
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
