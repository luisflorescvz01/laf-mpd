export const TZ = 'America/Monterrey';
export const num = (value: number | null | undefined, digits = 0) =>
  value == null
    ? '—'
    : new Intl.NumberFormat('es-MX', {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(value);
export const date = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('es-MX', {
        timeZone: TZ,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(value))
    : 'Sin registro';
export const localDay = (value: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
export const taskNames: Record<string, string> = {
  '27-132-00': 'Nivel de aceite · Flaps',
  '29-070-00': 'Filtro de presurización',
  '32-080-00': 'Lubricación · Tren de nariz',
  '32-350-00': 'Inflado de neumáticos',
  '33-010-00': 'Luces de emergencia',
};
export const taskName = (id: string) => taskNames[id] || id;
export const statusLabels: Record<string, string> = {
  OVERDUE: 'Vencido',
  DUE: 'En límite',
  NEAR_LIMIT: 'Próximo',
  WITHIN_LIMIT: 'Dentro del límite',
  NOT_STARTED: 'Sin iniciar',
  DATA_ERROR: 'Revisar datos',
  MISSING_INTERVAL: 'Sin intervalo',
  COMPLETED: 'Completado',
  PLANNED: 'Programado',
  IN_PROGRESS: 'En vuelo',
  CANCELLED: 'Cancelado',
};
