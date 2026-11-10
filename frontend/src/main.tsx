import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardProvider } from './hooks/useDashboard';
import { Layout } from './components/Layout';
import { Overview } from './pages/Overview';
import { Aircrafts } from './pages/Aircrafts';
import { AircraftDetail } from './pages/AircraftDetail';
import { Flights } from './pages/Flights';
import { Maintenance } from './pages/Maintenance';
import { HistoryPage } from './pages/History';
import './styles/global.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DashboardProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="aeronaves" element={<Aircrafts />} />
            <Route path="aeronaves/:id" element={<AircraftDetail />} />
            <Route path="vuelos" element={<Flights />} />
            <Route path="mantenimiento" element={<Maintenance />} />
            <Route path="historial" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </DashboardProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
