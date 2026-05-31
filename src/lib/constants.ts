// ShadowGrid AI — App-wide constants

import type { RiskCategory, RiskLevel, ReportType, ActionType } from '@/types/types';

// ─── Risk Category Labels ──────────────────────────────────────────────────────

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  drainage: 'Drainage Overflow',
  road: 'Road Blockage',
  water: 'Water Supply',
  power: 'Power Outage',
  traffic: 'Traffic Congestion',
  emergency_access: 'Emergency Access',
};

export const RISK_CATEGORY_ICONS: Record<RiskCategory, string> = {
  drainage: 'Droplets',
  road: 'Construction',
  water: 'Pipette',
  power: 'Zap',
  traffic: 'Car',
  emergency_access: 'Ambulance',
};

// ─── Risk Level Config ─────────────────────────────────────────────────────────

export const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string; threshold: number }> = {
  critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/20', threshold: 80 },
  high:     { label: 'High',     color: 'text-orange-400', bgColor: 'bg-orange-500/20', threshold: 60 },
  medium:   { label: 'Medium',   color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', threshold: 40 },
  low:      { label: 'Low',      color: 'text-green-400', bgColor: 'bg-green-500/20', threshold: 20 },
  normal:   { label: 'Normal',   color: 'text-primary', bgColor: 'bg-primary/10', threshold: 0 },
};

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'normal';
}

// Risk score color for map polygons
export function getRiskColor(score: number): string {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f97316';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#22c55e';
  return '#00d9ff';
}

// ─── Report Type Labels ────────────────────────────────────────────────────────

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  street_flooding: 'Street Flooding',
  blocked_drainage: 'Blocked Drainage',
  low_water_pressure: 'Low Water Pressure',
  power_fluctuation: 'Power Fluctuation',
  road_cracks: 'Road Cracks / Potholes',
  traffic_jam: 'Traffic Jam',
  streetlight_outage: 'Streetlight Outage',
  fallen_tree: 'Fallen Tree / Blocked Route',
};

export const REPORT_TYPE_TO_CATEGORY: Record<ReportType, RiskCategory> = {
  street_flooding: 'drainage',
  blocked_drainage: 'drainage',
  low_water_pressure: 'water',
  power_fluctuation: 'power',
  road_cracks: 'road',
  traffic_jam: 'traffic',
  streetlight_outage: 'power',
  fallen_tree: 'road',
};

// ─── Action Type Labels ────────────────────────────────────────────────────────

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  dispatch_drainage_team: 'Dispatch Drainage Team',
  alert_residents: 'Alert Residents',
  inspect_power_lines: 'Inspect Power Lines',
  redirect_traffic: 'Redirect Traffic',
  protect_hospital_access: 'Protect Hospital Access Routes',
  emergency_pump_deployment: 'Deploy Emergency Pumps',
  road_inspection: 'Road Inspection',
  water_supply_check: 'Water Supply Check',
};

// ─── Demo City Config ──────────────────────────────────────────────────────────

export const DEMO_CITY_CONFIG = {
  name: 'Metroville',
  lat: 40.7128,
  lng: -74.006,
  zoom: 12,
};

// ─── Risk Scoring Weights ──────────────────────────────────────────────────────
// Formula: Final Risk Score = 0.30×Citizen + 0.25×Weather + 0.20×Signal + 0.15×Historical + 0.10×Propagation

export const RISK_WEIGHTS = {
  citizen: 0.30,
  weather: 0.25,
  signal: 0.20,
  historical: 0.15,
  propagation: 0.10,
} as const;

// ─── Nav Links ─────────────────────────────────────────────────────────────────

export const NAV_LINKS = [
  { href: '/',           label: 'Overview',   icon: 'Home' },
  { href: '/dashboard',  label: 'Dashboard',  icon: 'LayoutDashboard' },
  { href: '/analytics',  label: 'Analytics',  icon: 'BarChart3' },
  { href: '/report',     label: 'Report',     icon: 'FileWarning' },
  { href: '/operations', label: 'Operations', icon: 'Settings2' },
] as const;
