import type { DashboardData } from '../types';
export async function fetchDashboard(signal: AbortSignal): Promise<DashboardData> {
  const response = await fetch('/api/dashboard', {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok)
    throw new Error(
      'No fue posible actualizar los datos. Comprueba que PostgreSQL y la API estén activos.',
    );
  return response.json();
}
