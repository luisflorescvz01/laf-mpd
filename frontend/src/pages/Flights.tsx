import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { Badge, Empty, Pagination, SearchBox, Drawer, DetailGrid } from '../components/ui';
import { date, num, localDay, statusLabels } from '../utils/format';
import type { Flight } from '../types';
import { FlightForm } from '../components/FlightForm';
import { CancelFlight } from '../components/CancelFlight';
export function Flights() {
  const { data, refresh } = useDashboard();
  const [form, setForm] = useState<Flight | 'new' | null>(null);
  const [notice, setNotice] = useState('');
  const [cancelFlight, setCancelFlight] = useState<Flight | null>(null);
  const [params, setParams] = useSearchParams();
  const [route, setRoute] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Flight | null>(null);
  if (!data) return null;
  const aircraft = params.get('aircraft') || '';
  const flights = data.flights.filter(
    (f) =>
      (!aircraft || f.aircraft_id === aircraft) &&
      (!route || f.route_id === route) &&
      (!status || f.status === status) &&
      (!from || localDay(f.planned_departure_at) >= from) &&
      (!to || localDay(f.planned_departure_at) <= to) &&
      `${f.flight_id} ${f.aircraft_id}`.toLowerCase().includes(q.toLowerCase()),
  );
  const current = Math.min(page, Math.max(1, Math.ceil(flights.length / 8)));
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Registro de vuelos<span>.</span>
          </h1>
          <p>Consulta la operación por aeronave, ruta y fecha.</p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setNotice('');
            setForm('new');
          }}
        >
          + Nuevo vuelo
        </button>
      </div>
      {notice && (
        <p role="status" className="success-banner">
          {notice}
        </p>
      )}
      <div className="toolbar">
        <SearchBox
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Buscar vuelo o aeronave…"
        />
        <select
          aria-label="Aeronave del vuelo"
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
        <select
          aria-label="Ruta"
          value={route}
          onChange={(e) => {
            setRoute(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas las rutas</option>
          {data.routes.map((r) => (
            <option value={r.route_id} key={r.route_id}>
              {r.departure} → {r.arrival}
            </option>
          ))}
        </select>
        <select
          aria-label="Estado del vuelo"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los estados</option>
          {['COMPLETED', 'PLANNED', 'IN_PROGRESS', 'CANCELLED'].map((s) => (
            <option value={s} key={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="date-filters">
        <label>
          Desde{' '}
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Hasta{' '}
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <span className="help">Salida programada · Hora de Monterrey</span>
        <button
          className="text-link"
          onClick={() => {
            setParams({});
            setQ('');
            setStatus('');
            setRoute('');
            setFrom('');
            setTo('');
            setPage(1);
          }}
        >
          Limpiar filtros
        </button>
      </div>
      {from && to && from > to && (
        <p role="alert" className="negative">
          La fecha inicial debe ser anterior o igual a la final.
        </p>
      )}
      <section className="panel">
        {flights.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vuelo / Aeronave</th>
                  <th>Ruta</th>
                  <th>Salida / Despegue</th>
                  <th>Duración</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {flights.slice((current - 1) * 8, current * 8).map((f) => (
                  <tr key={f.flight_id}>
                    <td>
                      <button className="table-link" onClick={() => setSelected(f)}>
                        {f.flight_id}
                        <span>{f.aircraft_id}</span>
                      </button>
                    </td>
                    <td>
                      <span className="route-cell">
                        {f.departure}
                        <ArrowRight size={13} />
                        {f.arrival}
                      </span>
                      <small>{f.route_id}</small>
                    </td>
                    <td>
                      {date(f.actual_departure_at || f.planned_departure_at)}
                      {!f.actual_departure_at && <small>Programado</small>}
                    </td>
                    <td>{num(f.flight_time_minutes, 0)} min</td>
                    <td>
                      <Badge status={f.status} />
                    </td>
                    <td>
                      {f.status === 'PLANNED' && (
                        <>
                          <button className="button secondary" onClick={() => setForm(f)}>
                            Finalizar
                          </button>
                          <button className="button secondary" onClick={() => setCancelFlight(f)}>
                            Cancelar
                          </button>
                        </>
                      )}
                      <button
                        className="icon-button"
                        aria-label={`Ver vuelo ${f.flight_id}`}
                        onClick={() => setSelected(f)}
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
        <Pagination page={current} setPage={setPage} total={flights.length} />
      </section>
      {selected && (
        <Drawer
          title={selected.flight_id}
          subtitle={`${selected.aircraft_id} · ${selected.departure} → ${selected.arrival}`}
          onClose={() => setSelected(null)}
        >
          <Badge status={selected.status} />
          {selected.status === 'PLANNED' && (
            <button
              className="button secondary"
              onClick={() => {
                setCancelFlight(selected);
                setSelected(null);
              }}
            >
              Cancelar vuelo
            </button>
          )}
          {selected.status === 'PLANNED' && (
            <button
              className="button primary"
              onClick={() => {
                setForm(selected);
                setSelected(null);
              }}
            >
              Finalizar vuelo
            </button>
          )}
          <h3>Horarios · Monterrey</h3>
          <DetailGrid
            items={[
              ['Salida programada', date(selected.planned_departure_at)],
              ['Llegada programada', date(selected.planned_arrival_at)],
              ['Despegue real', date(selected.actual_departure_at)],
              ['Aterrizaje real', date(selected.actual_arrival_at)],
              ['Tiempo de vuelo', `${num(selected.flight_time_minutes, 2)} min`],
              ['Distancia real', `${num(selected.flight_distance_nm, 2)} NM`],
              ['Combustible al despegue', `${num(selected.fuel_at_departure_kg)} kg`],
              ['Combustible al aterrizaje', `${num(selected.fuel_at_arrival_kg)} kg`],
              ['Pasajeros', num(selected.passengers)],
              ['Carga útil sin combustible', `${num(selected.payload_kg)} kg`],
            ]}
          />
        </Drawer>
      )}
      {cancelFlight && (
        <CancelFlight
          flight={cancelFlight}
          onClose={() => setCancelFlight(null)}
          onSaved={() => {
            setNotice(`Vuelo ${cancelFlight.flight_id} cancelado. No suma FH ni FC.`);
            setQ(cancelFlight.flight_id);
            setStatus('');
            setPage(1);
            setSelected(null);
            setCancelFlight(null);
            refresh();
          }}
        />
      )}
      {form && (
        <FlightForm
          flight={form === 'new' ? undefined : form}
          onClose={() => setForm(null)}
          onSaved={(id) => {
            setNotice(
              form === 'new'
                ? `Vuelo ${id} planeado. Todavía no suma FH ni FC.`
                : `Vuelo ${id} completado. Actualizando utilización y mantenimiento…`,
            );
            setForm(null);
            setSelected(null);
            setPage(1);
            setParams({});
            setRoute('');
            setStatus('');
            setFrom('');
            setTo('');
            setQ(id);
            refresh();
          }}
        />
      )}
    </>
  );
}
