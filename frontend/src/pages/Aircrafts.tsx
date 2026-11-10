import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plane, ArrowUpRight } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { num, date } from '../utils/format';
import { Badge, Empty, SearchBox } from '../components/ui';
export function Aircrafts() {
  const { data } = useDashboard();
  const [q, setQ] = useState('');
  if (!data) return null;
  const aircrafts = data.aircrafts.filter((a) =>
    `${a.aircraft_id} ${a.model} ${a.engine_type}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Nuestra flota<span>.</span>
          </h1>
          <p>Ocho aeronaves. Una ficha completa para cada una.</p>
        </div>
        <span className="outline-pill">{data.aircrafts.length} aeronaves registradas</span>
      </div>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar aeronave, modelo o motor…" />
        <span className="help">Especificaciones de la aerolínea ficticia</span>
      </div>
      <div className="aircraft-grid">
        {aircrafts.map((a) => {
          const tasks = data.maintenance.filter((t) => t.aircraft_id === a.aircraft_id);
          const urgent = tasks.filter((t) => ['OVERDUE', 'DUE'].includes(t.alert_status)).length;
          return (
            <Link to={`/aeronaves/${a.aircraft_id}`} className="aircraft-card" key={a.aircraft_id}>
              <div className="aircraft-art">
                <Plane strokeWidth={1} size={110} />
                <span>737</span>
                <small>BOEING / LAF</small>
              </div>
              <div className="aircraft-body">
                <div className="section-heading">
                  <div>
                    <h2>{a.aircraft_id}</h2>
                    <p>
                      {a.manufacturer} {a.model} · {a.engine_type}
                    </p>
                  </div>
                  <ArrowUpRight size={20} />
                </div>
                <div className="aircraft-stats">
                  <div>
                    <strong>{num(a.total_flight_hours, 2)}</strong>
                    <small>Horas de vuelo</small>
                  </div>
                  <div>
                    <strong>{num(a.total_flight_cycles)}</strong>
                    <small>Ciclos</small>
                  </div>
                  <div>
                    <strong>{num(a.passenger_capacity)}</strong>
                    <small>Pasajeros</small>
                  </div>
                </div>
                <div className="aircraft-bottom">
                  <Badge status={tasks[0]?.alert_status || 'NOT_STARTED'} />
                  <small>
                    {urgent
                      ? `${urgent} tarea${urgent > 1 ? 's' : ''} en atención`
                      : `${tasks.length} tareas asignadas`}
                  </small>
                </div>
                <p className="help">Último vuelo: {date(a.last_flight_at)}</p>
              </div>
            </Link>
          );
        })}
      </div>
      {!aircrafts.length && <Empty />}
    </>
  );
}
