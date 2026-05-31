// ShadowGrid AI — Core Domain Types

// ─── Risk Categories ──────────────────────────────────────────────────────────

export type RiskCategory =
  | 'drainage'
  | 'road'
  | 'water'
  | 'power'
  | 'traffic'
  | 'emergency_access';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'normal';

export type SignalSource = 'citizen' | 'weather' | 'news' | 'sensor' | 'seeded';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

// ─── Zone ─────────────────────────────────────────────────────────────────────

export interface Zone {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  /** Polygon coordinate pairs [lat, lng][] for Leaflet */
  polygon?: [number, number][];
  vulnerability_score: number; // 0-100
  flood_sensitivity: number;   // 0-100
  historical_failure_rate: number; // 0-100
  elevation_m: number;
  population_density: 'low' | 'medium' | 'high';
  adjacent_zone_ids: string[];
  infrastructure_notes?: string;
  created_at: string;
}

// ─── Risk Score ───────────────────────────────────────────────────────────────

export interface RiskScore {
  id: string;
  zone_id: string;
  category: RiskCategory;
  score: number; // 0-100
  risk_level: RiskLevel;
  citizen_component: number;
  weather_component: number;
  signal_component: number;
  historical_component: number;
  propagation_component: number;
  explanation: string;
  updated_at: string;
}

export interface ZoneRiskSummary {
  zone_id: string;
  zone_name: string;
  overall_score: number;
  risk_level: RiskLevel;
  scores_by_category: Record<RiskCategory, number>;
  top_category: RiskCategory;
  trend: 'rising' | 'stable' | 'falling';
}

// ─── Citizen Reports ──────────────────────────────────────────────────────────

export type ReportType =
  | 'street_flooding'
  | 'blocked_drainage'
  | 'low_water_pressure'
  | 'power_fluctuation'
  | 'road_cracks'
  | 'traffic_jam'
  | 'streetlight_outage'
  | 'fallen_tree';

export interface CitizenReport {
  id: string;
  report_type: ReportType;
  zone_id: string;
  severity: Severity;
  description: string;
  image_url?: string;
  contact_info?: string;
  source: 'citizen';
  status: 'pending' | 'acknowledged' | 'resolved';
  created_at: string;
}

export type CitizenReportInsert = Omit<CitizenReport, 'id' | 'created_at' | 'source' | 'status'>;

// ─── External Signals ─────────────────────────────────────────────────────────

export type SignalType =
  | 'weather_alert'
  | 'heavy_rainfall'
  | 'news_flooding'
  | 'news_power_outage'
  | 'news_road_closure'
  | 'news_water_shortage'
  | 'news_traffic_disruption'
  | 'seeded_incident';

export interface ExternalSignal {
  id: string;
  signal_type: SignalType;
  zone_id: string;
  source: SignalSource;
  severity: Severity;
  confidence: number; // 0-1
  detected_keywords: string[];
  title: string;
  summary: string;
  raw_payload?: Record<string, unknown>;
  created_at: string;
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export type ActionType =
  | 'dispatch_drainage_team'
  | 'alert_residents'
  | 'inspect_power_lines'
  | 'redirect_traffic'
  | 'protect_hospital_access'
  | 'emergency_pump_deployment'
  | 'road_inspection'
  | 'water_supply_check';

export interface Recommendation {
  id: string;
  zone_id: string;
  category: RiskCategory;
  action_type: ActionType;
  title: string;
  description: string;
  priority: number; // 1 = highest
  urgency: 'immediate' | 'urgent' | 'scheduled';
  expected_impact_reduction: number; // percentage
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}

// ─── Failure Chains ───────────────────────────────────────────────────────────

export interface FailureChainStep {
  step: number;
  event: string;
  description: string;
  affected_zone_ids: string[];
  category: RiskCategory;
  probability: number; // 0-1
}

export interface FailureChain {
  id: string;
  title: string;
  trigger: string;
  trigger_zone_id: string;
  steps: FailureChainStep[];
  overall_risk_level: RiskLevel;
  is_active: boolean;
  created_at: string;
}

// ─── Team Allocations ─────────────────────────────────────────────────────────

export interface TeamAllocation {
  id: string;
  zone_id: string;
  team_type: string;
  team_count: number;
  priority_rank: number;
  expected_risk_reduction: number;
  deployment_notes: string;
  status: 'planned' | 'deployed' | 'completed';
  created_at: string;
}

// ─── Dashboard Summary ────────────────────────────────────────────────────────

export interface DashboardSummary {
  total_active_signals: number;
  critical_zones_count: number;
  most_common_failure_type: RiskCategory;
  estimated_failures_prevented: number;
  citizen_reports_today: number;
  external_signals_today: number;
  response_improvement_pct: number;
  last_updated: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface RiskTrendPoint {
  date: string;
  drainage: number;
  road: number;
  water: number;
  power: number;
  traffic: number;
  emergency_access: number;
  overall: number;
}

export interface SignalCountPoint {
  date: string;
  citizen: number;
  weather: number;
  news: number;
}
