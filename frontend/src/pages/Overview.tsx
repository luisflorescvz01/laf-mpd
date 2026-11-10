import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plane,
  Route,
  TriangleAlert,
  Clock3,
  ArrowUpRight,
  ArrowRight,
  Activity,
  ShieldCheck,
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { num, date, taskName } from '../utils/format';
import { MaintenanceTable } from '../components/MaintenanceTable';
import { MaintenanceDetail } from '../components/MaintenanceDetail';
import type { MaintenanceTask } from '../types';
export function Overview() {
  const { data } = useDashboard();
  const [selected, setSelected] = useState<MaintenanceTask | null>(null);
  if (!data) return null;
  const s = data.summary;
  const attention = data.maintenance.filter((t) =>
    ['OVERDUE', 'DUE', 'NEAR_LIMIT', 'DATA_ERROR', 'MISSING_INTERVAL'].includes(t.alert_status),
  );
  const totalFH =
    data.flights
      .filter((f) => f.status === 'COMPLETED')
      .reduce((sum, f) => sum + Number(f.flight_time_minutes || 0), 0) / 60;
  const totalFC = data.aircrafts.reduce((sum, a) => sum + Number(a.total_flight_cycles), 0);
  const within = data.maintenance.filter((t) => t.alert_status === 'WITHIN_LIMIT').length;
  const notStarted = data.maintenance.filter((t) => t.alert_status === 'NOT_STARTED').length;
  const share = (count: number) => (s.total_tasks ? (count / s.total_tasks) * 100 : 0);
  const greenEnd = share(within),
    redEnd = share(within + s.urgent_tasks);
  const amberEnd = share(within + s.urgent_tasks + s.near_tasks);
  const purpleEnd = share(within + s.urgent_tasks + s.near_tasks + s.review_tasks);
  const cards = [
    {
      label: 'Aeronaves registradas',
      value: s.aircrafts,
      note: 'Flota Boeing 737-8',
      icon: Plane,
      tone: 'blue',
      to: '/aeronaves',
    },
    {
      label: 'Vuelos completados',
      value: s.completed_flights,
      note: 'Historial de la operación',
      icon: Route,
      tone: 'cyan',
      to: '/vuelos',
    },
    {
      label: 'Vencidas / en límite',
      value: s.urgent_tasks,
      note: 'Tareas que requieren atención',
      icon: TriangleAlert,
      tone: 'red',
      to: '/mantenimiento?status=urgent',
    },
    {
      label: 'Próximas al límite',
      value: s.near_tasks,
      note: `Margen de aviso: ${data.warning_ratio * 100}%`,
      icon: Clock3,
      tone: 'amber',
      to: '/mantenimiento?status=NEAR_LIMIT',
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Tu flota, bajo una sola mirada<span>.</span>
          </h1>
          <p>Una visión clara de la operación y el mantenimiento de LAF.</p>
        </div>
        <div className="live-tag">
          <span />
          Vista general de la flota
        </div>
      </div>
      <div className="stat-grid">
        {cards.map(({ label, value, note, icon: Icon, tone, to }) => (
          <Link to={to} className={`stat-card ${tone}`} key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <Icon size={19} />
            </div>
            <div className="stat-value">
              {num(value)}
              <ArrowUpRight size={19} />
            </div>
            <p>
              <span className="stat-indicator" />
              {note}
            </p>
          </Link>
        ))}
      </div>
      {s.review_tasks > 0 && (
        <Link to="/mantenimiento?status=review" className="review-banner">
          Hay {s.review_tasks} tareas con datos que requieren revisión. Ver detalle →
        </Link>
      )}
      <div className="dashboard-grid">
        <section className="panel attention-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MANTENIMIENTO</span>
              <h2>
                Prioridad de atención <span className="count-pill">{attention.length}</span>
              </h2>
              <p className="muted">Cada tarea se cuenta una sola vez por aeronave.</p>
            </div>
            <Link className="text-link" to="/mantenimiento">
              Ver todas <ArrowUpRight size={16} />
            </Link>
          </div>
          <MaintenanceTable tasks={attention.slice(0, 5)} onSelect={setSelected} />
          {attention.length > 5 && (
            <Link className="panel-footer-link" to="/mantenimiento?status=attention">
              Ver las {attention.length} tareas que requieren atención <ArrowRight size={16} />
            </Link>
          )}
        </section>
        <section className="panel fleet-health">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CONTROL DE MANTENIMIENTO</span>
              <h2>Estado de las tareas</h2>
            </div>
            <ShieldCheck size={20} />
          </div>
          <div
            className="ring"
            style={{
              background: `conic-gradient(#57cba7 0% ${greenEnd}%, #ef7e8b ${greenEnd}% ${redEnd}%, #f4c46c ${redEnd}% ${amberEnd}%, #ba97ef ${amberEnd}% ${purpleEnd}%, #697b96 ${purpleEnd}% 100%)`,
            }}
          >
            <div>
              <strong>{s.total_tasks}</strong>
              <span>asignaciones</span>
            </div>
          </div>
          <div className="legend">
            <span>
              <i className="dot green" />
              Dentro del límite
            </span>
            <b>{within}</b>
          </div>
          <div className="legend">
            <span>
              <i className="dot red" />
              Vencidas / en límite
            </span>
            <b>{s.urgent_tasks}</b>
          </div>
          <div className="legend">
            <span>
              <i className="dot amber" />
              Próximas
            </span>
            <b>{s.near_tasks}</b>
          </div>
          {s.review_tasks > 0 && (
            <div className="legend">
              <span>Revisar datos</span>
              <b>{s.review_tasks}</b>
            </div>
          )}
          {notStarted > 0 && (
            <div className="legend">
              <span>Sin iniciar</span>
              <b>{notStarted}</b>
            </div>
          )}
          <p className="help">
            Estado de tareas asignadas; no representa disponibilidad operativa.
          </p>
        </section>
        <section className="panel utilization-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ACTIVIDAD REGISTRADA</span>
              <h2>Utilización de la flota</h2>
            </div>
            <Activity size={20} />
          </div>
          <div className="usage-totals">
            <strong>
              {num(totalFH, 2)} <small>FH</small>
            </strong>
            <span className="separator" />
            <strong>
              {num(totalFC)} <small>FC</small>
            </strong>
            <span className="muted">Acumulados del proyecto</span>
          </div>
          <div className="bar-chart">
            {data.aircrafts.map((a) => (
              <Link to={`/aeronaves/${a.aircraft_id}`} className="bar-row" key={a.aircraft_id}>
                <span>{a.aircraft_id}</span>
                <div className="bar-track">
                  <i
                    style={{
                      width: `${(Number(a.total_flight_hours) / Math.max(1, ...data.aircrafts.map((v) => Number(v.total_flight_hours)))) * 100}%`,
                    }}
                  />
                </div>
                <b>
                  {num(a.total_flight_hours, 2)} <small>FH</small>
                </b>
              </Link>
            ))}
          </div>
          <p className="help">Horas decimales · 1.50 FH equivale a 1 h 30 min.</p>
        </section>
        <section className="panel recent-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">TRAZABILIDAD</span>
              <h2>Últimos mantenimientos</h2>
            </div>
            <Link to="/historial" className="text-link">
              <ArrowUpRight size={18} />
              <span className="sr-only">Ver historial</span>
            </Link>
          </div>
          <div className="timeline">
            {data.history.slice(0, 4).map((r) => (
              <Link
                to={`/historial?aircraft=${r.aircraft_id}`}
                className="timeline-row"
                key={r.maintenance_id}
              >
                <div className="timeline-dot" />
                <div>
                  <strong>{taskName(r.mpd_number)}</strong>
                  <p>
                    {r.aircraft_id} <span>· {r.maintenance_id}</span>
                  </p>
                  <small>{date(r.performed_at)}</small>
                </div>
              </Link>
            ))}
          </div>
          <Link to="/historial" className="panel-footer-link">
            Explorar el historial <ArrowRight size={16} />
          </Link>
        </section>
      </div>
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
