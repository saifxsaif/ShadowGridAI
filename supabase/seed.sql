-- ShadowGrid AI — Seed Data (DEMO dataset)
-- Run this AFTER applying the schema migrations (00001 → 00003).
-- Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING.
--
-- Every row is tagged dataset_type='demo'. This is the stable, presentation-safe
-- dataset shown when the app is in Demo mode. The Live dataset (dataset_type='live')
-- starts empty and is populated at runtime via the Operations → Ingest Signals flow.

-- ─── Zones (shared infrastructure — not dataset-scoped) ─────────────────────────
INSERT INTO zones (id, name, city, lat, lng, polygon, vulnerability_score, flood_sensitivity, historical_failure_rate, elevation_m, population_density, adjacent_zone_ids, infrastructure_notes)
VALUES
('zone-01', 'Riverside District',    'Metroville', 40.730, -74.010,
 '[[40.725,-74.018],[40.725,-74.002],[40.735,-74.002],[40.735,-74.018]]',
 85, 92, 78, 2, 'high', '["zone-02","zone-03"]',
 'Aging drainage system, low elevation, frequent flooding reports.'),
('zone-02', 'Central Business Hub',  'Metroville', 40.715, -74.005,
 '[[40.710,-74.012],[40.710,-73.998],[40.720,-73.998],[40.720,-74.012]]',
 62, 45, 55, 12, 'high', '["zone-01","zone-04","zone-05"]',
 'Power grid under stress during peak hours. Road congestion hotspot.'),
('zone-03', 'Old Harbor Quarter',    'Metroville', 40.700, -74.020,
 '[[40.695,-74.028],[40.695,-74.012],[40.705,-74.012],[40.705,-74.028]]',
 78, 88, 70, 1, 'medium', '["zone-01","zone-06"]',
 'Historic seawall infrastructure needs urgent inspection.'),
('zone-04', 'Northern Suburbs',      'Metroville', 40.750, -73.995,
 '[[40.745,-74.002],[40.745,-73.988],[40.755,-73.988],[40.755,-74.002]]',
 40, 30, 28, 32, 'medium', '["zone-02","zone-07"]',
 'Newer infrastructure; occasional traffic congestion near school zones.'),
('zone-05', 'Industrial East Zone',  'Metroville', 40.720, -73.985,
 '[[40.715,-73.992],[40.715,-73.978],[40.725,-73.978],[40.725,-73.992]]',
 70, 40, 65, 8, 'low', '["zone-02","zone-04"]',
 'Heavy machinery causes road wear. Power demand peaks unpredictably.'),
('zone-06', 'Westbank Residential',  'Metroville', 40.695, -74.030,
 '[[40.690,-74.038],[40.690,-74.022],[40.700,-74.022],[40.700,-74.038]]',
 55, 60, 42, 6, 'high', '["zone-03","zone-07"]',
 'Dense residential area. Water pressure issues during summer.'),
('zone-07', 'University Hill',       'Metroville', 40.760, -74.010,
 '[[40.755,-74.018],[40.755,-74.002],[40.765,-74.002],[40.765,-74.018]]',
 35, 25, 22, 45, 'medium', '["zone-04","zone-06"]',
 'Elevated terrain provides natural drainage advantage.')
ON CONFLICT (id) DO NOTHING;

-- ─── Citizen Reports (demo) ─────────────────────────────────────────────────────
INSERT INTO citizen_reports (id, report_type, zone_id, severity, description, source, status, dataset_type, created_at)
VALUES
('cr-01', 'street_flooding',    'zone-01', 'critical', 'Water level rising on Elm Street near the underpass — cars unable to pass.', 'citizen', 'pending',      'demo', NOW() - INTERVAL '2 hours'),
('cr-02', 'blocked_drainage',   'zone-01', 'high',     'Drain cover on River Ave completely blocked by debris after last night rain.', 'citizen', 'pending',    'demo', NOW() - INTERVAL '5 hours'),
('cr-03', 'power_fluctuation',  'zone-02', 'high',     'Lights flickering on 4th and Main. Multiple residents reporting same issue.', 'citizen', 'acknowledged', 'demo', NOW() - INTERVAL '3 hours'),
('cr-04', 'road_cracks',        'zone-02', 'medium',   'Large crack appearing on Central Ave near the bus terminal.', 'citizen', 'pending',                   'demo', NOW() - INTERVAL '8 hours'),
('cr-05', 'street_flooding',    'zone-03', 'high',     'Harbor Rd completely flooded. Access to the port is blocked.', 'citizen', 'acknowledged',              'demo', NOW() - INTERVAL '1 hour'),
('cr-06', 'low_water_pressure', 'zone-06', 'medium',   'Water barely trickling from taps in the entire west block since this morning.', 'citizen', 'pending',   'demo', NOW() - INTERVAL '4 hours'),
('cr-07', 'traffic_jam',        'zone-05', 'medium',   'Industrial access road completely gridlocked due to truck breakdown.', 'citizen', 'pending',            'demo', NOW() - INTERVAL '6 hours'),
('cr-08', 'streetlight_outage', 'zone-04', 'low',      'Three consecutive streetlights out on Northern Blvd since yesterday.', 'citizen', 'pending',            'demo', NOW() - INTERVAL '18 hours')
ON CONFLICT (id) DO NOTHING;

-- ─── External Signals (demo) ──────────────────────────────────────────────────
INSERT INTO external_signals (id, signal_type, zone_id, source, severity, confidence, detected_keywords, title, summary, dataset_type, created_at)
VALUES
('es-01', 'heavy_rainfall',       'zone-01', 'weather', 'high',     0.90, '["heavy rain","flood risk","drainage overflow"]',
 'Heavy rainfall warning — Metroville',
 '18mm precipitation in last 3 hours. Flood risk elevated for low-elevation zones.',
 'demo', NOW() - INTERVAL '1 hour'),
('es-02', 'weather_alert',        'zone-03', 'weather', 'critical', 0.95, '["storm","strong winds","coastal flooding"]',
 'Severe weather alert — Metroville',
 'Storm system approaching coastal areas. Wind gusts up to 85 km/h. Coastal flood risk critical.',
 'demo', NOW() - INTERVAL '30 minutes'),
('es-03', 'news_flooding',        'zone-01', 'seeded',  'high',     0.80, '["flood","riverside","emergency pump"]',
 'Flash flooding reported in Riverside District',
 'Local emergency services responding to flood events near river. Emergency pumps deployed.',
 'demo', NOW() - INTERVAL '2 hours'),
('es-04', 'news_power_outage',    'zone-02', 'seeded',  'high',     0.75, '["power outage","grid failure","blackout"]',
 'Power grid instability reported in business district',
 'Multiple businesses report intermittent power failures. Grid operator investigating substation overload.',
 'demo', NOW() - INTERVAL '4 hours'),
('es-05', 'news_road_closure',    'zone-03', 'seeded',  'medium',   0.70, '["road closure","harbor","emergency access"]',
 'Harbor access road partially closed',
 'Road closure near harbor after structural inspection flagged deterioration. Single-lane traffic.',
 'demo', NOW() - INTERVAL '6 hours'),
('es-06', 'news_water_shortage',  'zone-06', 'seeded',  'medium',   0.65, '["water shortage","pressure","residential"]',
 'Low water pressure in Westbank area',
 'Water utility issued advisory for reduced pressure in residential zones. Repair crews dispatched.',
 'demo', NOW() - INTERVAL '5 hours'),
('es-07', 'news_traffic_disruption', 'zone-05', 'seeded', 'low',    0.60, '["traffic","industrial","gridlock"]',
 'Traffic disruption in Industrial East Zone',
 'Heavy vehicle incident causing delays on main industrial access routes.',
 'demo', NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;

-- ─── Initial Risk Scores (demo) ───────────────────────────────────────────────
INSERT INTO risk_scores (id, zone_id, category, score, risk_level, citizen_component, weather_component, signal_component, historical_component, propagation_component, explanation, dataset_type, updated_at)
VALUES
('rs-01', 'zone-01', 'drainage',  88, 'critical', 75, 80, 70, 78, 45, 'Critical drainage risk from heavy rainfall and multiple citizen reports.', 'demo', NOW()),
('rs-02', 'zone-01', 'emergency_access', 72, 'high', 60, 65, 55, 60, 40, 'Emergency access risk elevated due to road flooding.', 'demo', NOW()),
('rs-03', 'zone-02', 'power',     65, 'high',     55, 40, 60, 55, 30, 'Power fluctuation signals from citizens and external data.', 'demo', NOW()),
('rs-04', 'zone-02', 'traffic',   58, 'medium',   40, 30, 45, 50, 25, 'Moderate traffic risk in central business area.', 'demo', NOW()),
('rs-05', 'zone-03', 'drainage',  82, 'critical', 65, 90, 65, 70, 55, 'Storm alert and coastal flooding driving critical drainage risk.', 'demo', NOW()),
('rs-06', 'zone-03', 'road',      70, 'high',     45, 60, 55, 65, 35, 'Road damage and harbor closure elevating road risk.', 'demo', NOW()),
('rs-07', 'zone-04', 'power',     38, 'medium',   25, 20, 30, 28, 15, 'Minor power risk from streetlight outages.', 'demo', NOW()),
('rs-08', 'zone-05', 'traffic',   62, 'high',     45, 20, 55, 65, 20, 'Traffic disruption from industrial vehicle incident.', 'demo', NOW()),
('rs-09', 'zone-05', 'road',      55, 'medium',   35, 15, 40, 60, 18, 'Road wear from heavy machinery traffic.', 'demo', NOW()),
('rs-10', 'zone-06', 'water',     60, 'high',     50, 25, 55, 42, 20, 'Water pressure shortage affecting residential area.', 'demo', NOW()),
('rs-11', 'zone-06', 'drainage',  48, 'medium',   35, 45, 35, 40, 30, 'Moderate drainage risk from elevated flood sensitivity.', 'demo', NOW()),
('rs-12', 'zone-07', 'drainage',  22, 'low',      10, 15, 10, 22, 12, 'Low drainage risk due to elevated terrain.', 'demo', NOW()),
('rs-13', 'zone-07', 'traffic',   28, 'low',      20, 10, 15, 22, 10, 'Minor traffic congestion near university campus.', 'demo', NOW())
ON CONFLICT (id) DO NOTHING;

-- ─── Recommendations (demo) ────────────────────────────────────────────────────
INSERT INTO recommendations (id, zone_id, category, action_type, title, description, priority, urgency, expected_impact_reduction, status, dataset_type)
VALUES
('rec-01', 'zone-01', 'drainage',         'emergency_pump_deployment', 'Deploy Emergency Drainage Pumps — Riverside District',
 'Activate mobile drainage pumps at River Ave and Elm Street. Current drain blockage and rainfall create critical overflow risk.', 1, 'immediate', 35, 'pending', 'demo'),
('rec-02', 'zone-03', 'drainage',         'emergency_pump_deployment', 'Emergency Pump Deployment — Old Harbor Quarter',
 'Storm alert and coastal flooding require immediate pump activation near harbor entrance.', 2, 'immediate', 40, 'pending', 'demo'),
('rec-03', 'zone-02', 'power',            'inspect_power_lines',       'Inspect Substation Overload — Central Business Hub',
 'Multiple reports of power fluctuation. Grid operator should inspect primary substation for overload conditions.', 3, 'urgent', 30, 'pending', 'demo'),
('rec-04', 'zone-01', 'emergency_access', 'protect_hospital_access',   'Clear Emergency Routes — Riverside District',
 'Verify all emergency vehicle routes remain accessible. Coordinate with flood response teams to maintain hospital access.', 4, 'urgent', 25, 'pending', 'demo'),
('rec-05', 'zone-06', 'water',            'water_supply_check',        'Pressure Investigation — Westbank Residential',
 'Dispatch water utility team to identify source of pressure drop. Check distribution node at West Main junction.', 5, 'urgent', 20, 'pending', 'demo'),
('rec-06', 'zone-05', 'traffic',          'redirect_traffic',          'Traffic Diversion — Industrial East Zone',
 'Activate alternate route signage for industrial access road. Coordinate with traffic management centre.', 6, 'scheduled', 15, 'pending', 'demo'),
('rec-07', 'zone-03', 'road',             'road_inspection',           'Road Structural Inspection — Harbor Access',
 'Full structural assessment of Harbor Rd required before normal traffic is restored.', 7, 'scheduled', 20, 'pending', 'demo')
ON CONFLICT (id) DO NOTHING;

-- ─── Failure Chains (demo) ─────────────────────────────────────────────────────
INSERT INTO failure_chains (id, title, trigger, trigger_zone_id, steps, overall_risk_level, is_active, dataset_type)
VALUES
('fc-01', 'Riverside Storm Cascade', 'Heavy rainfall + blocked drains in zone-01',
 'zone-01',
 '[{"step":1,"event":"Drain overflow","description":"Blocked drains cause street flooding at River Ave","affected_zone_ids":["zone-01"],"category":"drainage","probability":0.92},{"step":2,"event":"Emergency access blocked","description":"Flood water prevents emergency vehicle access to Riverside","affected_zone_ids":["zone-01","zone-03"],"category":"emergency_access","probability":0.75},{"step":3,"event":"Power substation risk","description":"Floodwater encroaches on ground-level electrical infrastructure","affected_zone_ids":["zone-01","zone-02"],"category":"power","probability":0.55},{"step":4,"event":"City-wide cascade","description":"Combined drainage and power failures propagate risk to adjacent zones","affected_zone_ids":["zone-01","zone-02","zone-03","zone-06"],"category":"emergency_access","probability":0.40}]',
 'critical', true, 'demo'),
('fc-02', 'Harbor Coastal Storm', 'Severe weather alert at Old Harbor Quarter',
 'zone-03',
 '[{"step":1,"event":"Coastal flooding","description":"Storm surge enters harbor quarter through seawall gaps","affected_zone_ids":["zone-03"],"category":"drainage","probability":0.88},{"step":2,"event":"Harbor access closure","description":"Harbor Rd closes due to flooding and road damage","affected_zone_ids":["zone-03","zone-01"],"category":"road","probability":0.80},{"step":3,"event":"Emergency response delay","description":"Blocked harbor access delays fire and ambulance response","affected_zone_ids":["zone-03","zone-01","zone-06"],"category":"emergency_access","probability":0.60}]',
 'high', true, 'demo')
ON CONFLICT (id) DO NOTHING;

-- ─── Team Allocations (demo) ───────────────────────────────────────────────────
INSERT INTO team_allocations (id, zone_id, team_type, team_count, priority_rank, expected_risk_reduction, deployment_notes, status, dataset_type)
VALUES
('ta-01', 'zone-01', 'Drainage Response Team',   3, 1, 32, 'Deploy to River Ave and Elm Street outfall points. Bring 2 mobile pumps.', 'planned', 'demo'),
('ta-02', 'zone-03', 'Coastal Emergency Unit',   2, 2, 38, 'Focus on harbor entrance seawall. Coordinate with port authority.', 'planned', 'demo'),
('ta-03', 'zone-02', 'Power Grid Inspection',    1, 3, 28, 'Inspect Central substation and 4th/Main junction box.', 'planned', 'demo'),
('ta-04', 'zone-06', 'Water Utility Team',       1, 4, 22, 'Locate pressure fault at West Main distribution node.', 'planned', 'demo'),
('ta-05', 'zone-05', 'Traffic Management Unit',  1, 5, 14, 'Set up diversion signage on industrial access road.', 'planned', 'demo')
ON CONFLICT (id) DO NOTHING;
