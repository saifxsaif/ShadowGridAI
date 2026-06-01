// ShadowGrid AI — Seeded Demo Data
// Used as fallback when Supabase is unavailable or during local development

import type {
  Zone,
  RiskScore,
  CitizenReport,
  ExternalSignal,
  Recommendation,
  FailureChain,
  TeamAllocation,
} from '@/types/types';

// ─── Zones ─────────────────────────────────────────────────────────────────────

export const DEMO_ZONES: Zone[] = [
  {
    id: 'zone-01',
    name: 'Riverside District',
    city: 'Metroville',
    lat: 40.730,
    lng: -74.010,
    polygon: [[40.725, -74.018], [40.725, -74.002], [40.735, -74.002], [40.735, -74.018]],
    vulnerability_score: 85,
    flood_sensitivity: 92,
    historical_failure_rate: 78,
    elevation_m: 2,
    population_density: 'high',
    adjacent_zone_ids: ['zone-02', 'zone-03'],
    infrastructure_notes: 'Aging drainage system, low elevation, frequent flooding reports.',
    created_at: '2024-01-01T00:00:00Z',
    dataset_type: 'demo',
  },
  {
    id: 'zone-02',
    name: 'Central Business Hub',
    city: 'Metroville',
    lat: 40.715,
    lng: -74.005,
    polygon: [[40.710, -74.012], [40.710, -73.998], [40.720, -73.998], [40.720, -74.012]],
    vulnerability_score: 62,
    flood_sensitivity: 45,
    historical_failure_rate: 55,
    elevation_m: 12,
    population_density: 'high',
    adjacent_zone_ids: ['zone-01', 'zone-04', 'zone-05'],
    infrastructure_notes: 'Power grid under stress during peak hours. Road congestion hotspot.',
    created_at: '2024-01-01T00:00:00Z',
    dataset_type: 'demo',
  },
  {
    id: 'zone-03',
    name: 'Old Harbor Quarter',
    city: 'Metroville',
    lat: 40.700,
    lng: -74.020,
    polygon: [[40.695, -74.028], [40.695, -74.012], [40.705, -74.012], [40.705, -74.028]],
    vulnerability_score: 78,
    flood_sensitivity: 88,
    historical_failure_rate: 70,
    elevation_m: 1,
    population_density: 'medium',
    adjacent_zone_ids: ['zone-01', 'zone-06'],
    infrastructure_notes: 'Coastal zone with tidal flooding risk. Water supply infrastructure aging.',
    created_at: '2024-01-01T00:00:00Z',
    dataset_type: 'demo',
  },
  {
    id: 'zone-04',
    name: 'Northern Suburbs',
    city: 'Metroville',
    lat: 40.750,
    lng: -73.995,
    polygon: [[40.745, -74.002], [40.745, -73.988], [40.755, -73.988], [40.755, -74.002]],
    vulnerability_score: 40,
    flood_sensitivity: 30,
    historical_failure_rate: 28,
    elevation_m: 32,
    population_density: 'medium',
    adjacent_zone_ids: ['zone-02', 'zone-07'],
    infrastructure_notes: 'Newer infrastructure; occasional traffic congestion near school zones.',
    created_at: '2024-01-01T00:00:00Z',
    dataset_type: 'demo',
  },
  {
    id: 'zone-05',
    name: 'Industrial East Zone',
    city: 'Metroville',
    lat: 40.720,
    lng: -73.985,
    polygon: [[40.715, -73.992], [40.715, -73.978], [40.725, -73.978], [40.725, -73.992]],
    vulnerability_score: 70,
    flood_sensitivity: 40,
    historical_failure_rate: 65,
    elevation_m: 8,
    population_density: 'low',
    adjacent_zone_ids: ['zone-02', 'zone-04'],
    infrastructure_notes: 'Heavy machinery causes road wear. Power demand peaks unpredictably.',
    created_at: '2024-01-01T00:00:00Z',
    dataset_type: 'demo',
  },
  {
    id: 'zone-06',
    name: 'Westbank Residential',
    city: 'Metroville',
    lat: 40.695,
    lng: -74.030,
    polygon: [[40.690, -74.038], [40.690, -74.022], [40.700, -74.022], [40.700, -74.038]],
    vulnerability_score: 55,
    flood_sensitivity: 60,
    historical_failure_rate: 42,
    elevation_m: 6,
    population_density: 'high',
    adjacent_zone_ids: ['zone-03', 'zone-07'],
    infrastructure_notes: 'Dense residential area. Water pressure issues during summer.',
    created_at: '2024-01-01T00:00:00Z',
    dataset_type: 'demo',
  },
  {
    id: 'zone-07',
    name: 'University Hill',
    city: 'Metroville',
    lat: 40.760,
    lng: -74.010,
    polygon: [[40.755, -74.018], [40.755, -74.002], [40.765, -74.002], [40.765, -74.018]],
    vulnerability_score: 35,
    flood_sensitivity: 25,
    historical_failure_rate: 22,
    elevation_m: 45,
    population_density: 'medium',
    adjacent_zone_ids: ['zone-04', 'zone-06'],
    infrastructure_notes: 'Elevated terrain provides natural drainage advantage.',
    created_at: '2024-01-01T00:00:00Z',
    dataset_type: 'demo',
  },
];

// ─── Risk Scores ───────────────────────────────────────────────────────────────

export const DEMO_RISK_SCORES: RiskScore[] = [
  // Riverside District — CRITICAL
  { id: 'rs-01', zone_id: 'zone-01', category: 'drainage', score: 88, risk_level: 'critical', citizen_component: 90, weather_component: 85, signal_component: 80, historical_component: 78, propagation_component: 60, explanation: 'Heavy rainfall combined with 12 citizen flooding reports and aging drainage pipes elevate drainage risk to critical. Adjacent Old Harbor Zone propagating additional overflow risk.', updated_at: new Date().toISOString() },
  { id: 'rs-02', zone_id: 'zone-01', category: 'road', score: 72, risk_level: 'high', citizen_component: 75, weather_component: 65, signal_component: 60, historical_component: 70, propagation_component: 55, explanation: 'Road cracking reported by 5 citizens. Weather impact from recent rainfall weakening road surface.', updated_at: new Date().toISOString() },
  { id: 'rs-03', zone_id: 'zone-01', category: 'emergency_access', score: 65, risk_level: 'high', citizen_component: 60, weather_component: 70, signal_component: 55, historical_component: 65, propagation_component: 80, explanation: 'Road blockage and flooding elevating emergency access risk. Hospital route through zone may be impacted.', updated_at: new Date().toISOString() },
  { id: 'rs-04', zone_id: 'zone-01', category: 'water', score: 38, risk_level: 'medium', citizen_component: 35, weather_component: 40, signal_component: 30, historical_component: 45, propagation_component: 25, explanation: 'Moderate water pressure variations reported. Monitoring required.', updated_at: new Date().toISOString() },
  // Old Harbor Quarter — HIGH
  { id: 'rs-05', zone_id: 'zone-03', category: 'drainage', score: 76, risk_level: 'high', citizen_component: 80, weather_component: 85, signal_component: 70, historical_component: 70, propagation_component: 72, explanation: 'Coastal zone with high tide risk. Multiple drainage blockage reports. Weather forecast shows continued rainfall.', updated_at: new Date().toISOString() },
  { id: 'rs-06', zone_id: 'zone-03', category: 'water', score: 68, risk_level: 'high', citizen_component: 65, weather_component: 45, signal_component: 60, historical_component: 72, propagation_component: 40, explanation: 'Aging water supply pipes. 3 low-pressure reports in past 24 hours.', updated_at: new Date().toISOString() },
  // Medical Mile — HIGH (emergency access)
  { id: 'rs-07', zone_id: 'zone-05', category: 'emergency_access', score: 74, risk_level: 'high', citizen_component: 55, weather_component: 60, signal_component: 75, historical_component: 35, propagation_component: 88, explanation: 'Propagated road blockage from Central Hub and Riverside District threatening hospital access corridor. City General Hospital access route at risk.', updated_at: new Date().toISOString() },
  { id: 'rs-08', zone_id: 'zone-05', category: 'power', score: 52, risk_level: 'medium', citizen_component: 50, weather_component: 55, signal_component: 45, historical_component: 35, propagation_component: 60, explanation: 'Power fluctuation reports from adjacent industrial zone propagating risk.', updated_at: new Date().toISOString() },
  // Central Business Hub — MEDIUM
  { id: 'rs-09', zone_id: 'zone-02', category: 'traffic', score: 68, risk_level: 'high', citizen_component: 70, weather_component: 50, signal_component: 72, historical_component: 55, propagation_component: 65, explanation: 'High traffic density, 8 jam reports. Road diversions from Riverside adding congestion pressure.', updated_at: new Date().toISOString() },
  { id: 'rs-10', zone_id: 'zone-02', category: 'power', score: 58, risk_level: 'medium', citizen_component: 60, weather_component: 55, signal_component: 50, historical_component: 55, propagation_component: 40, explanation: 'Peak-hour power demand exceeding stable thresholds. Two fluctuation reports.', updated_at: new Date().toISOString() },
  // Northgate Industrial — MEDIUM
  { id: 'rs-11', zone_id: 'zone-04', category: 'power', score: 62, risk_level: 'high', citizen_component: 45, weather_component: 50, signal_component: 55, historical_component: 42, propagation_component: 70, explanation: 'Substation showing instability. Industrial load shedding risk.', updated_at: new Date().toISOString() },
  // Westfield — LOW
  { id: 'rs-12', zone_id: 'zone-06', category: 'water', score: 44, risk_level: 'medium', citizen_component: 45, weather_component: 35, signal_component: 38, historical_component: 30, propagation_component: 25, explanation: 'Periodic low-pressure reports from residential area. Monitoring recommended.', updated_at: new Date().toISOString() },
  // Tech Corridor — NORMAL
  { id: 'rs-13', zone_id: 'zone-07', category: 'road', score: 18, risk_level: 'normal', citizen_component: 15, weather_component: 20, signal_component: 10, historical_component: 22, propagation_component: 12, explanation: 'Modern infrastructure. No active signals. Routine monitoring.', updated_at: new Date().toISOString() },
];

// ─── Citizen Reports ──────────────────────────────────────────────────────────

export const DEMO_CITIZEN_REPORTS: CitizenReport[] = [
  { id: 'cr-01', report_type: 'street_flooding',   zone_id: 'zone-01', severity: 'critical', description: 'Water rising on Riverside Ave near bridge. Cannot pass by car.', source: 'citizen', status: 'acknowledged', created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 'cr-02', report_type: 'blocked_drainage',  zone_id: 'zone-01', severity: 'high',     description: 'Drain on Park St completely blocked. Water pooling fast.', source: 'citizen', status: 'pending', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'cr-03', report_type: 'power_fluctuation', zone_id: 'zone-02', severity: 'medium',   description: 'Lights flickering on Main St. Office had two short outages this morning.', source: 'citizen', status: 'pending', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 'cr-04', report_type: 'low_water_pressure', zone_id: 'zone-03', severity: 'medium',  description: 'Almost no water pressure since 6am. Entire building affected.', source: 'citizen', status: 'acknowledged', created_at: new Date(Date.now() - 9000000).toISOString() },
  { id: 'cr-05', report_type: 'traffic_jam',        zone_id: 'zone-02', severity: 'high',    description: 'Total gridlock near downtown interchange. Accident and flooding both.',   source: 'citizen', status: 'pending', created_at: new Date(Date.now() - 1200000).toISOString() },
  { id: 'cr-06', report_type: 'street_flooding',    zone_id: 'zone-03', severity: 'high',    description: 'Harbor Rd flooded again. Cars stranded near the old pier.', source: 'citizen', status: 'pending', created_at: new Date(Date.now() - 4500000).toISOString() },
  { id: 'cr-07', report_type: 'road_cracks',        zone_id: 'zone-01', severity: 'medium',  description: 'Large pothole opened on North Bridge Rd. Dangerous for cyclists.', source: 'citizen', status: 'resolved', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'cr-08', report_type: 'streetlight_outage', zone_id: 'zone-06', severity: 'low',     description: 'Three streetlights out on Westfield Crescent. Dark and unsafe.', source: 'citizen', status: 'pending', created_at: new Date(Date.now() - 18000000).toISOString() },
];

// ─── External Signals ─────────────────────────────────────────────────────────

export const DEMO_EXTERNAL_SIGNALS: ExternalSignal[] = [
  { id: 'es-01', signal_type: 'heavy_rainfall',        zone_id: 'zone-01', source: 'weather', severity: 'critical', confidence: 0.95, detected_keywords: ['heavy rainfall', 'storm', 'flooding'], title: 'Severe Rainfall Warning', summary: 'Open-Meteo forecast: 85mm rainfall expected in next 6h. Flood threshold exceeded.', created_at: new Date(Date.now() - 600000).toISOString() },
  { id: 'es-02', signal_type: 'news_flooding',          zone_id: 'zone-01', source: 'news',    severity: 'high',     confidence: 0.88, detected_keywords: ['flooding', 'Riverside', 'emergency'], title: 'Riverside Flooding Reported by Local Media', summary: 'Multiple outlets reporting street flooding in Riverside District. Emergency services on standby.', created_at: new Date(Date.now() - 2700000).toISOString() },
  { id: 'es-03', signal_type: 'news_road_closure',      zone_id: 'zone-02', source: 'news',    severity: 'high',     confidence: 0.82, detected_keywords: ['road closure', 'Central', 'diversion'], title: 'Road Closure — Central District', summary: 'Main arterial route closed due to flooding overflow from adjacent zones.', created_at: new Date(Date.now() - 5400000).toISOString() },
  { id: 'es-04', signal_type: 'news_power_outage',      zone_id: 'zone-04', source: 'news',    severity: 'medium',   confidence: 0.75, detected_keywords: ['power outage', 'industrial', 'substation'], title: 'Industrial Zone Substation Alert', summary: 'Grid monitoring detects instability at Northgate substation. Risk of scheduled shutdown.', created_at: new Date(Date.now() - 8100000).toISOString() },
  { id: 'es-05', signal_type: 'weather_alert',          zone_id: 'zone-03', source: 'weather', severity: 'high',     confidence: 0.90, detected_keywords: ['coastal flooding', 'tidal surge', 'storm'], title: 'Coastal Storm Surge Warning', summary: 'Tidal surge of 1.2m forecast. Old Harbor and Westfield at elevated flood risk.', created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 'es-06', signal_type: 'news_water_shortage',    zone_id: 'zone-03', source: 'news',    severity: 'medium',   confidence: 0.70, detected_keywords: ['water shortage', 'supply', 'pressure'], title: 'Water Supply Pressure Drop — Harbor Quarter', summary: 'Utility reports pipe stress and pressure loss in Old Harbor zone.', created_at: new Date(Date.now() - 10800000).toISOString() },
  { id: 'es-07', signal_type: 'news_traffic_disruption', zone_id: 'zone-05', source: 'news',  severity: 'high',     confidence: 0.85, detected_keywords: ['hospital', 'ambulance', 'access', 'blocked'], title: 'Hospital Access Route Threatened', summary: 'Road closures near Central Hub may block ambulance route to City General Hospital.', created_at: new Date(Date.now() - 3900000).toISOString() },
];

// ─── Recommendations ──────────────────────────────────────────────────────────

export const DEMO_RECOMMENDATIONS: Recommendation[] = [
  { id: 'rec-01', zone_id: 'zone-01', category: 'drainage', action_type: 'dispatch_drainage_team',    title: 'Deploy Drainage Response Team',      description: 'Immediately dispatch drainage team to Riverside District. Clear blocked drains on Park St and Riverside Ave to prevent overflow cascade.', priority: 1, urgency: 'immediate', expected_impact_reduction: 35, status: 'pending', created_at: new Date().toISOString() },
  { id: 'rec-02', zone_id: 'zone-01', category: 'drainage', action_type: 'emergency_pump_deployment', title: 'Deploy Emergency Pumps',             description: 'Position 2 mobile pumps at Riverside Ave low point. Activate before water level exceeds 15cm.', priority: 2, urgency: 'immediate', expected_impact_reduction: 28, status: 'in_progress', created_at: new Date().toISOString() },
  { id: 'rec-03', zone_id: 'zone-05', category: 'emergency_access', action_type: 'protect_hospital_access', title: 'Secure Hospital Access Corridor', description: 'Assign traffic management to Medical Mile entry routes. Ensure ambulance path to City General remains clear. Coordinate with Central Hub traffic authority.', priority: 3, urgency: 'immediate', expected_impact_reduction: 45, status: 'pending', created_at: new Date().toISOString() },
  { id: 'rec-04', zone_id: 'zone-01', category: 'drainage', action_type: 'alert_residents',            title: 'Alert Riverside Residents',          description: 'Issue advisory to Riverside District residents to avoid low-lying areas. Recommend preparation of flood barriers for ground-floor properties.', priority: 4, urgency: 'urgent', expected_impact_reduction: 15, status: 'pending', created_at: new Date().toISOString() },
  { id: 'rec-05', zone_id: 'zone-04', category: 'power', action_type: 'inspect_power_lines',          title: 'Inspect Northgate Substation',       description: 'Technical inspection of grid connection points at Northgate industrial substation. Identify stress points before planned shutdown is needed.', priority: 5, urgency: 'urgent', expected_impact_reduction: 40, status: 'pending', created_at: new Date().toISOString() },
  { id: 'rec-06', zone_id: 'zone-02', category: 'traffic', action_type: 'redirect_traffic',            title: 'Activate Traffic Diversion — Central', description: 'Reroute Central Business Hub inbound traffic via northbound bypass. Reduce gridlock pressure and prevent ambulance blockages.', priority: 6, urgency: 'urgent', expected_impact_reduction: 20, status: 'in_progress', created_at: new Date().toISOString() },
  { id: 'rec-07', zone_id: 'zone-03', category: 'water', action_type: 'water_supply_check',           title: 'Inspect Harbor Quarter Pipes',       description: 'Field inspection of aging water supply network in Old Harbor. Identify fracture points before tidal surge increases pressure differential.', priority: 7, urgency: 'scheduled', expected_impact_reduction: 30, status: 'pending', created_at: new Date().toISOString() },
];

// ─── Failure Chains ───────────────────────────────────────────────────────────

export const DEMO_FAILURE_CHAINS: FailureChain[] = [
  {
    id: 'fc-01',
    title: 'Storm → Emergency Access Failure',
    trigger: 'Heavy Rainfall Event',
    trigger_zone_id: 'zone-01',
    overall_risk_level: 'critical',
    is_active: true,
    steps: [
      { step: 1, event: 'Heavy Rainfall', description: '85mm rainfall in 6h exceeds drainage capacity threshold.', affected_zone_ids: ['zone-01', 'zone-03'], category: 'drainage', probability: 0.95 },
      { step: 2, event: 'Drainage Overflow', description: 'Riverside District drains overflow, flooding streets.', affected_zone_ids: ['zone-01'], category: 'drainage', probability: 0.88 },
      { step: 3, event: 'Road Blockage', description: 'Flooded roads block main arterial routes through Central Hub.', affected_zone_ids: ['zone-01', 'zone-02'], category: 'road', probability: 0.78 },
      { step: 4, event: 'Traffic Cascade', description: 'Blocked routes create gridlock across Central and Medical zones.', affected_zone_ids: ['zone-02', 'zone-05'], category: 'traffic', probability: 0.72 },
      { step: 5, event: 'Ambulance Delay', description: 'Emergency vehicles unable to reach City General Hospital in time.', affected_zone_ids: ['zone-05'], category: 'emergency_access', probability: 0.65 },
      { step: 6, event: 'Hospital Access Risk', description: 'City General Hospital effectively isolated. Critical life-safety risk.', affected_zone_ids: ['zone-05'], category: 'emergency_access', probability: 0.58 },
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'fc-02',
    title: 'Substation Failure → Power Cascade',
    trigger: 'Northgate Substation Overload',
    trigger_zone_id: 'zone-04',
    overall_risk_level: 'high',
    is_active: true,
    steps: [
      { step: 1, event: 'Substation Overload', description: 'Industrial zone substation exceeds capacity due to peak demand.', affected_zone_ids: ['zone-04'], category: 'power', probability: 0.72 },
      { step: 2, event: 'Grid Instability', description: 'Cascading instability propagates to connected Central Business Hub grid.', affected_zone_ids: ['zone-02', 'zone-04'], category: 'power', probability: 0.62 },
      { step: 3, event: 'Medical Equipment Risk', description: 'Power fluctuations affect hospital and clinic equipment in Medical Mile.', affected_zone_ids: ['zone-05'], category: 'power', probability: 0.52 },
    ],
    created_at: new Date().toISOString(),
  },
];

// ─── Team Allocations ─────────────────────────────────────────────────────────

export const DEMO_TEAM_ALLOCATIONS: TeamAllocation[] = [
  { id: 'ta-01', zone_id: 'zone-01', team_type: 'Drainage Response',   team_count: 3, priority_rank: 1, expected_risk_reduction: 35, deployment_notes: 'Focus on Park St drain and Riverside Ave flood control.', status: 'deployed',  created_at: new Date().toISOString() },
  { id: 'ta-02', zone_id: 'zone-05', team_type: 'Traffic Management',  team_count: 2, priority_rank: 2, expected_risk_reduction: 45, deployment_notes: 'Secure all access routes to City General Hospital.', status: 'deployed',  created_at: new Date().toISOString() },
  { id: 'ta-03', zone_id: 'zone-04', team_type: 'Electrical Engineers', team_count: 2, priority_rank: 3, expected_risk_reduction: 40, deployment_notes: 'Inspect Northgate substation grid connections.', status: 'planned',  created_at: new Date().toISOString() },
  { id: 'ta-04', zone_id: 'zone-03', team_type: 'Water Supply Team',   team_count: 1, priority_rank: 4, expected_risk_reduction: 30, deployment_notes: 'Inspect aging pipes before tidal surge.', status: 'planned',  created_at: new Date().toISOString() },
  { id: 'ta-05', zone_id: 'zone-02', team_type: 'Traffic Management',  team_count: 2, priority_rank: 5, expected_risk_reduction: 20, deployment_notes: 'Activate Central Hub bypass routes to reduce gridlock.', status: 'deployed',  created_at: new Date().toISOString() },
];
