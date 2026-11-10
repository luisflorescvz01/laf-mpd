export type AlertStatus =
  | 'OVERDUE'
  | 'DUE'
  | 'NEAR_LIMIT'
  | 'WITHIN_LIMIT'
  | 'NOT_STARTED'
  | 'DATA_ERROR'
  | 'MISSING_INTERVAL';
export interface Aircraft {
  aircraft_id: string;
  manufacturer: string;
  model: string;
  year_manufactured: number | null;
  engine_type: string | null;
  passenger_capacity: number | null;
  basic_empty_weight_kg: number | null;
  operational_empty_weight_kg: number | null;
  max_payload_kg: number | null;
  max_takeoff_weight_kg: number | null;
  cruise_speed_kmph: number | null;
  range_nm: number | null;
  ceiling_limit_ft: number | null;
  total_flights: number;
  total_flight_cycles: number;
  total_flight_hours: number;
  last_flight_at: string | null;
}
export interface Flight {
  flight_id: string;
  route_id: string;
  aircraft_id: string;
  departure: string;
  arrival: string;
  planned_departure_at: string;
  planned_arrival_at: string;
  actual_departure_at: string | null;
  actual_arrival_at: string | null;
  flight_time_minutes: number | null;
  flight_distance_nm: number | null;
  fuel_at_departure_kg: number | null;
  fuel_at_arrival_kg: number | null;
  passengers: number | null;
  payload_kg: number | null;
  status: string;
}
export interface HistoryRecord {
  maintenance_id: string;
  aircraft_id: string;
  mpd_number: string;
  performed_at: string;
  flight_hours_at_maintenance: number;
  flight_cycles_at_maintenance: number;
  actual_labor_hours: number | null;
  notes: string | null;
  description_original: string;
  task_type: string;
}
export interface Limit {
  interval_unit: string | null;
  interval_value: number | null;
  elapsed_value: number | null;
  remaining_value: number | null;
  due_at_usage: number | null;
  due_at: string | null;
  status: string;
  alert_status: AlertStatus;
  reference_at: string;
  reference_flight_hours: number;
  reference_flight_cycles: number;
}
export interface MaintenanceTask {
  aircraft_id: string;
  mpd_number: string;
  description_original: string;
  task_type: string;
  ata_chapter: string;
  amm_references: string[];
  zones: string[];
  notes: string | null;
  labor_hours: number | null;
  last_maintenance_at: string | null;
  last_maintenance_id: string | null;
  interval_type: string;
  reference_at: string;
  alert_status: AlertStatus;
  limits: Limit[];
}
export interface DashboardData {
  aircrafts: Aircraft[];
  flights: Flight[];
  history: HistoryRecord[];
  maintenance: MaintenanceTask[];
  routes: { route_id: string; departure: string; arrival: string; distance_nm: number }[];
  evaluated_at: string;
  warning_ratio: number;
  summary: {
    aircrafts: number;
    completed_flights: number;
    urgent_tasks: number;
    near_tasks: number;
    review_tasks: number;
    total_tasks: number;
  };
}
