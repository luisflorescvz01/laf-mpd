"""Replace fictional operation data atomically; preserve aircraft and routes.

Dry-run by default. Execute inside the API container with psycopg installed.
The JSON alongside this script contains manually reviewed MPD additions.
"""
import argparse
import json
import os
import random
from datetime import datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from zoneinfo import ZoneInfo

import psycopg
from psycopg.rows import dict_row

TZ = ZoneInfo("America/Monterrey")
SEED = 20261109


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(conn, aircraft_before, routes_before, now):
    require(conn.execute("SELECT * FROM aircrafts ORDER BY aircraft_id").fetchall() == aircraft_before,
            "Aircraft changed")
    require(conn.execute("SELECT * FROM flight_routes ORDER BY route_id").fetchall() == routes_before,
            "Routes changed")
    checks = {
        "flight_overlap_or_discontinuous_route": """
          WITH ordered AS (
            SELECT f.*, r.departure, lag(r.arrival) OVER w AS prior_airport,
                   lag(f.actual_arrival_at) OVER w AS prior_arrival
            FROM flight_records f JOIN flight_routes r USING(route_id)
            WINDOW w AS (PARTITION BY aircraft_id ORDER BY actual_departure_at)
          ) SELECT count(*) FROM ordered WHERE actual_departure_at < prior_arrival + interval '45 minutes'
             OR departure <> prior_airport""",
        "capacity_or_weight": """
          SELECT count(*) FROM flight_records f JOIN aircrafts a USING(aircraft_id)
          WHERE passengers > passenger_capacity OR payload_kg > max_payload_kg
             OR payload_kg + fuel_at_departure_kg + operational_empty_weight_kg > max_takeoff_weight_kg
             OR fuel_at_arrival_kg >= fuel_at_departure_kg OR payload_kg < passengers * 95""",
        "maintenance_during_flight": """
          SELECT count(*) FROM maintenance_records m JOIN flight_records f USING(aircraft_id)
          WHERE m.performed_at BETWEEN f.actual_departure_at AND f.actual_arrival_at""",
        "incorrect_maintenance_snapshot": """
          SELECT count(*) FROM maintenance_records m CROSS JOIN LATERAL
          (SELECT round(coalesce(sum(flight_time_minutes),0)/60,2) AS hours, count(*) AS cycles
           FROM flight_records f WHERE f.aircraft_id=m.aircraft_id
           AND f.status='COMPLETED' AND f.actual_arrival_at<=m.performed_at) u
          WHERE (m.flight_hours_at_maintenance,m.flight_cycles_at_maintenance)
            IS DISTINCT FROM (u.hours,u.cycles)""",
        "maintenance_before_tracking": """
          SELECT count(*) FROM maintenance_records m JOIN aircraft_maintenance_tasks a
          USING(aircraft_id,mpd_number) WHERE performed_at < tracking_start_at""",
        "invalid_due_state": "SELECT count(*) FROM maintenance_due WHERE status IN ('DATA_ERROR','MISSING_INTERVAL','NOT_STARTED')",
    }
    for name, sql in checks.items():
        require(conn.execute(sql).fetchone()['count'] == 0, name)
    require(conn.execute("SELECT count(*) FROM flight_records WHERE actual_arrival_at > %s", (now,)).fetchone()['count'] == 0,
            "Future completed flights")
    require(conn.execute("SELECT count(*) FROM maintenance_records WHERE performed_at > %s", (now,)).fetchone()['count'] == 0,
            "Future maintenance")


def run(apply=False, database=None):
    rng = random.Random(SEED)
    source = json.loads(Path(__file__).with_name('additional_mpd_tasks.json').read_text(encoding='utf-8'))
    with psycopg.connect(host=os.environ['POSTGRES_HOST'], dbname=database or os.environ['POSTGRES_DB'],
                         user=os.environ['POSTGRES_USER'], password=os.environ['POSTGRES_PASSWORD'],
                         row_factory=dict_row) as conn:
        # Prevent concurrent writes while taking the source snapshot and replacing the demo.
        conn.execute("LOCK TABLE aircrafts, flight_routes, mpd_tasks, task_intervals, aircraft_maintenance_tasks, maintenance_records, flight_records IN SHARE ROW EXCLUSIVE MODE")
        now = conn.execute('SELECT current_timestamp AS now').fetchone()['now'].astimezone(TZ)
        start = datetime.combine(now.date() - timedelta(days=90), time(), TZ)
        aircraft = conn.execute('SELECT * FROM aircrafts ORDER BY aircraft_id').fetchall()
        routes = conn.execute('SELECT * FROM flight_routes ORDER BY route_id').fetchall()
        require([a['aircraft_id'] for a in aircraft] == [f'LAF-737-{i:03}' for i in range(1,9)], 'Unexpected fleet')
        require({r['route_id']: (r['departure'], r['arrival']) for r in routes} == {
            'LAFr01a':('MTY','MEX'),'LAFr01b':('MEX','MTY'),
            'LAFr02a':('MTY','GDL'),'LAFr02b':('GDL','MTY'),
            'LAFr03a':('MTY','CUN'),'LAFr03b':('CUN','MTY')}, 'Unexpected routes')
        route_map = {r['route_id']: r for r in routes}
        # Existing tasks and their interval definitions are preserved.
        for t in source['tasks']:
            notes = (f"D626A011; edition {source['edition']}; {source['file']}; page {t['page']}; "
                     f"page revision {t['page_revision']}. Pending aeronautical validation. Fictional airline demonstration.")
            conn.execute("""INSERT INTO mpd_tasks VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (mpd_number) DO NOTHING""", (t['mpd_number'], t['mpd_number'][:2],t['task_type'],
                t['description_original'],t['amm_references'],t['zones'],notes,Decimal(t['labor_hours'])))
            for kind in ('THRESHOLD','REPEAT'):
                for unit, value in t['intervals'].items():
                    conn.execute("INSERT INTO task_intervals VALUES (%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                                 (t['mpd_number'],kind,value,unit))
                    actual = conn.execute("SELECT interval_value FROM task_intervals WHERE mpd_number=%s AND interval_type=%s AND interval_unit=%s",
                                          (t['mpd_number'],kind,unit)).fetchone()
                    require(actual['interval_value'] == value, 'Existing interval differs from reviewed source')
        tasks = conn.execute('SELECT * FROM mpd_tasks ORDER BY mpd_number').fetchall()
        require(len(tasks) == 15, 'Unexpected task catalog; review before replacing demo')
        conn.execute('DELETE FROM maintenance_records')
        conn.execute('DELETE FROM flight_records')
        conn.execute('DELETE FROM aircraft_maintenance_tasks')
        conn.execute("INSERT INTO aircraft_maintenance_tasks SELECT aircraft_id,mpd_number,%s FROM aircrafts CROSS JOIN mpd_tasks", (start,))

        flights = []
        flights_by_aircraft = {}
        ids = iter(rng.sample(range(100000),1120))
        for index, (a, operating_days) in enumerate(zip(aircraft,[90,86,82,78,70,62,54,38])):
            schedule = []
            days = sorted(rng.sample(range(89), operating_days-1) + [89])
            for day in days:
                destination = rng.choice([1,2,3])
                departure = start + timedelta(days=day,hours=8,minutes=index*7+rng.randrange(15))
                for direction in ('a','b'):
                    route = route_map[f'LAFr{destination:02}{direction}']
                    planned = departure
                    departure += timedelta(minutes=rng.randrange(0,21))
                    minutes = {1:75,2:70,3:140}[destination] + rng.randrange(-5,11)
                    arrival = departure + timedelta(minutes=minutes)
                    passengers = rng.randrange(115,190)
                    payload = passengers*95 + rng.randrange(200,1801)
                    fuel_arrival = rng.randrange(2200,3101)
                    fuel_departure = fuel_arrival + round(minutes/60*rng.randrange(2300,2651))
                    row = (f'LAF{next(ids):05}',route['route_id'],a['aircraft_id'],planned,
                           planned+timedelta(minutes=minutes),departure,arrival,
                           round(float(route['distance_nm'])*rng.uniform(1.01,1.07),2),
                           fuel_departure,fuel_arrival,passengers,payload,'COMPLETED')
                    flights.append(row)
                    schedule.append((arrival, minutes))
                    departure = arrival+timedelta(minutes=55+rng.randrange(16))
            flights_by_aircraft[a['aircraft_id']] = schedule
        with conn.cursor() as cur:
            cur.executemany("""INSERT INTO flight_records (flight_id,route_id,aircraft_id,planned_departure_at,
                planned_arrival_at,actual_departure_at,actual_arrival_at,flight_distance_nm,
                fuel_at_departure_kg,fuel_at_arrival_kg,passengers,payload_kg,status)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", flights)

        records = []
        for index,a in enumerate(aircraft):
            schedule = flights_by_aircraft[a['aircraft_id']]
            for task_index,t in enumerate(tasks):
                number = t['mpd_number']
                events = []
                if number == '32-350-00':
                    # Daily fictional inspections, with final omissions for calendar alerts.
                    cutoff = now - timedelta(hours=[76,70,46,45,24,20,18,12][index])
                    events = [start+timedelta(days=d,hours=6) for d in range(90)
                              if start+timedelta(days=d,hours=6) < cutoff]
                    events.append(cutoff)
                elif number in ('32-010-01','32-010-02'):
                    # 50 FC task: demonstrate overdue, due, near and within-limit cases.
                    remaining_cycles = [54,52,50,48,46,20,10,4][index]
                    if number.endswith('02'):
                        remaining_cycles = max(2,remaining_cycles-2)
                    last_cycle = len(schedule)-remaining_cycles
                    cycles = list(range(48,last_cycle,48)) + [last_cycle]
                    events = [schedule[c-1][0]+timedelta(hours=1,minutes=task_index) for c in cycles]
                elif number in ('32-080-00','32-030-01','32-030-02'):
                    # Some threshold-based tasks, some early preventive services.
                    if index >= 2:
                        day = 5 if index in (2,3) else 60+index
                        events = [start+timedelta(days=day,hours=6,minutes=task_index)]
                elif (index+task_index)%3 == 0:
                    # Optional early preventive service, not an invented requirement.
                    events = [start+timedelta(days=30+index*3,hours=6,minutes=task_index)]
                for at in sorted(set(events)):
                    completed = [minutes for arrival,minutes in schedule if arrival <= at]
                    fh = (Decimal(sum(completed))/60).quantize(Decimal('.01'),rounding=ROUND_HALF_UP)
                    records.append((f'MNT{len(records)+1:05}',a['aircraft_id'],number,at,fh,len(completed),
                                    t['labor_hours'], 'SIMULATED: fictional demonstration service; utilization derived from flight history. Early services are illustrative, not additional MPD requirements.'))
        with conn.cursor() as cur:
            cur.executemany('INSERT INTO maintenance_records VALUES (%s,%s,%s,%s,%s,%s,%s,%s)',records)
        validate(conn, aircraft, routes, now)
        summary = {
            'applied': apply, 'seed': SEED, 'evaluated_at': now.isoformat(), 'tracking_start_at': start.isoformat(),
            'counts': {table:conn.execute(f'SELECT count(*) FROM {table}').fetchone()['count'] for table in
                       ['aircrafts','flight_routes','mpd_tasks','task_intervals','aircraft_maintenance_tasks','flight_records','maintenance_records']},
            'utilization':conn.execute('SELECT * FROM aircraft_utilization ORDER BY aircraft_id').fetchall(),
            'interval_states':conn.execute('SELECT status,count(*) FROM maintenance_due GROUP BY status ORDER BY status').fetchall(),
            'near_intervals':conn.execute("SELECT count(*) FROM maintenance_due WHERE status='WITHIN_LIMIT' AND remaining_value <= interval_value * 0.1").fetchone()['count'],
            'validation': 'All invariants passed; fleet and routes unchanged',
        }
        if apply:
            conn.commit()
        else:
            conn.rollback()
        print(json.dumps(summary,default=str,indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply',action='store_true',help='Commit replacement of fictional operational records')
    parser.add_argument('--database',help='Optional rehearsal database')
    args = parser.parse_args()
    run(args.apply,args.database)
