import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Plane,
  Route,
  Wrench,
  History,
  RefreshCw,
  Menu,
  X,
  ShieldCheck,
  Radio,
  ArrowUpRight,
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { date } from '../utils/format';
const links = [
  { path: '/', label: 'Resumen', icon: LayoutDashboard },
  { path: '/aeronaves', label: 'Aeronaves', icon: Plane },
  { path: '/vuelos', label: 'Vuelos', icon: Route },
  { path: '/mantenimiento', label: 'Mantenimiento', icon: Wrench },
  { path: '/historial', label: 'Historial', icon: History },
];
export function Layout() {
  const { data, error, loading, refresh } = useDashboard();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const active = links.find((l) =>
    l.path === '/' ? location.pathname === '/' : location.pathname.startsWith(l.path),
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">
            <Plane size={25} />
          </span>
          <div>
            <strong>
              LAF<span> INTELLIGENCE</span>
            </strong>
            <small>Aircraft Maintenance</small>
          </div>
        </NavLink>
        <div className="workspace">
          <span className="workspace-icon">LF</span>
          <div>
            Líneas Aéreas Foráneas<small>Centro de operaciones · MTY</small>
          </div>
          <ShieldCheck size={16} />
        </div>
        <span className="nav-label">ESPACIO DE TRABAJO</span>
        <nav>
          {links.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
              {path === '/mantenimiento' && !!data?.summary.urgent_tasks && (
                <b>{data.summary.urgent_tasks}</b>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <Radio size={19} />
          <h4>Una flota. Toda la información.</h4>
          <p>Operación e historial de mantenimiento en un solo lugar.</p>
          <span>
            BOEING 737 <ArrowUpRight size={13} />
          </span>
        </div>
        <div className="sidebar-bottom">
          <span className={`connection-dot ${error ? 'offline' : ''}`} />
          <div>
            {error ? 'Conexión interrumpida' : data ? 'Base de datos conectada' : 'Conectando…'}
            <small>Entorno local · Registro de vuelos</small>
          </div>
        </div>
        <div className="profile">
          <span>LF</span>
          <div>
            Proyecto LAF<small>Demostración académica</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
            <span>Workspace</span>
            <span>/</span>
            <strong>{active?.label || 'Aeronave'}</strong>
          </div>
          <span className="demo-label">
            <span />
            Datos ficticios · Operación local
          </span>
        </header>
        <main id="main">
          <div className="page-topline">
            <span className="eyebrow">LAF / MAINTENANCE CONTROL</span>
            <div className="update">
              <span>
                {data ? `Actualizado ${date(data.evaluated_at)}` : 'Esperando datos'}
                <small>Monterrey · UTC−06 · cada 60 s</small>
              </span>
              <button className="button secondary" disabled={loading} onClick={refresh}>
                <RefreshCw size={15} className={loading ? 'spin' : ''} />
                {loading ? 'Actualizando' : 'Actualizar'}
              </button>
            </div>
          </div>
          {error && (
            <div role="alert" className="error-banner">
              <strong>No se pudo actualizar.</strong> {error}{' '}
              {data && 'Se muestran los últimos datos disponibles.'}
              <button onClick={refresh}>Reintentar</button>
            </div>
          )}
          {!data ? (
            loading ? (
              <div className="loading-state">
                <div className="loader" />
                <h2>Preparando tu centro de operaciones</h2>
                <p>Consultando aeronaves, vuelos y mantenimiento…</p>
              </div>
            ) : (
              <div className="empty">
                <h2>Sin conexión a los datos</h2>
                <p>Inicia los servicios de Docker y vuelve a intentar.</p>
                <button className="button primary" onClick={refresh}>
                  Reintentar conexión
                </button>
              </div>
            )
          ) : (
            <Outlet />
          )}
          <footer className="page-footer">
            <span>LAF Aircraft Maintenance Intelligence</span>
            <span>
              Utilización registrada en el proyecto · No es un sistema operativo de
              aeronavegabilidad
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
