import type { DashboardData } from '../types';
export async function saveFlight(
  path: string,
  payload: Record<string, unknown>,
): Promise<{ flight_id: string }> {
  const response = await fetch(`/api/flights${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok) {
    const detail = result.detail;
    throw new Error(
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((e: { msg: string }) => e.msg.replace('Value error, ', '')).join(' · ')
          : 'No se pudo guardar el vuelo. Intenta nuevamente.',
    );
  }
  return result;
}
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
