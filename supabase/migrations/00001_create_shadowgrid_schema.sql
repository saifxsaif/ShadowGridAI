-- ShadowGrid AI — Core Schema

-- Zones
CREATE TABLE zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Metroville',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  polygon JSONB,
  vulnerability_score INTEGER NOT NULL DEFAULT 50 CHECK (vulnerability_score BETWEEN 0 AND 100),
  flood_sensitivity INTEGER NOT NULL DEFAULT 50 CHECK (flood_sensitivity BETWEEN 0 AND 100),
  historical_failure_rate INTEGER NOT NULL DEFAULT 30 CHECK (historical_failure_rate BETWEEN 0 AND 100),
  elevation_m INTEGER NOT NULL DEFAULT 10,
  population_density TEXT NOT NULL DEFAULT 'medium' CHECK (population_density IN ('low','medium','high')),
  adjacent_zone_ids JSONB NOT NULL DEFAULT '[]',
  infrastructure_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Risk Scores
CREATE TABLE risk_scores (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('drainage','road','water','power','traffic','emergency_access')),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  risk_level TEXT NOT NULL DEFAULT 'normal' CHECK (risk_level IN ('critical','high','medium','low','normal')),
  citizen_component INTEGER NOT NULL DEFAULT 0,
  weather_component INTEGER NOT NULL DEFAULT 0,
  signal_component INTEGER NOT NULL DEFAULT 0,
  historical_component INTEGER NOT NULL DEFAULT 0,
  propagation_component INTEGER NOT NULL DEFAULT 0,
  explanation TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_scores_zone_id ON risk_scores(zone_id);
CREATE INDEX idx_risk_scores_category ON risk_scores(category);

-- Citizen Reports
CREATE TABLE citizen_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  report_type TEXT NOT NULL CHECK (report_type IN ('street_flooding','blocked_drainage','low_water_pressure','power_fluctuation','road_cracks','traffic_jam','streetlight_outage','fallen_tree')),
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  description TEXT NOT NULL,
  image_url TEXT,
  contact_info TEXT,
  source TEXT NOT NULL DEFAULT 'citizen',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','acknowledged','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_citizen_reports_zone_id ON citizen_reports(zone_id);
CREATE INDEX idx_citizen_reports_created_at ON citizen_reports(created_at DESC);

-- External Signals
CREATE TABLE external_signals (
  id TEXT PRIMARY KEY,
  signal_type TEXT NOT NULL,
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('citizen','weather','news','sensor','seeded')),
  severity TEXT NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  detected_keywords JSONB NOT NULL DEFAULT '[]',
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_external_signals_zone_id ON external_signals(zone_id);
CREATE INDEX idx_external_signals_created_at ON external_signals(created_at DESC);

-- Recommendations
CREATE TABLE recommendations (
  id TEXT PRIMARY KEY,
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('drainage','road','water','power','traffic','emergency_access')),
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  urgency TEXT NOT NULL DEFAULT 'scheduled' CHECK (urgency IN ('immediate','urgent','scheduled')),
  expected_impact_reduction INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recommendations_zone_id ON recommendations(zone_id);
CREATE INDEX idx_recommendations_priority ON recommendations(priority ASC);

-- Failure Chains
CREATE TABLE failure_chains (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  trigger TEXT NOT NULL,
  trigger_zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  steps JSONB NOT NULL DEFAULT '[]',
  overall_risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (overall_risk_level IN ('critical','high','medium','low','normal')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team Allocations
CREATE TABLE team_allocations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  team_type TEXT NOT NULL,
  team_count INTEGER NOT NULL DEFAULT 1,
  priority_rank INTEGER NOT NULL DEFAULT 1,
  expected_risk_reduction INTEGER NOT NULL DEFAULT 0,
  deployment_notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','deployed','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_allocations_zone_id ON team_allocations(zone_id);

-- Enable RLS (public read for demo; citizen reports writable by anyone)
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizen_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE failure_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_allocations ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "public_read_zones" ON zones FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_risk_scores" ON risk_scores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_citizen_reports" ON citizen_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_external_signals" ON external_signals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_recommendations" ON recommendations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_failure_chains" ON failure_chains FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_team_allocations" ON team_allocations FOR SELECT TO anon, authenticated USING (true);

-- Citizens can insert reports
CREATE POLICY "public_insert_citizen_reports" ON citizen_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
