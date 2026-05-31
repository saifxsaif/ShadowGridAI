// ShadowGrid AI — Supabase service layer
// All data access functions. Falls back to mock data if Supabase is unavailable.

import { supabase } from '@/db/supabase';
import { DATA_MODE } from '@/lib/appConfig';
import type {
  Zone,
  RiskScore,
  CitizenReport,
  CitizenReportInsert,
  ExternalSignal,
  Recommendation,
  FailureChain,
  TeamAllocation,
} from '@/types/types';
import {
  DEMO_ZONES,
  DEMO_RISK_SCORES,
  DEMO_CITIZEN_REPORTS,
  DEMO_EXTERNAL_SIGNALS,
  DEMO_RECOMMENDATIONS,
  DEMO_FAILURE_CHAINS,
  DEMO_TEAM_ALLOCATIONS,
} from '@/lib/mockData';

// ─── Zones ─────────────────────────────────────────────────────────────────────

export async function fetchZones(): Promise<Zone[]> {
  if (DATA_MODE === 'mock') return DEMO_ZONES;
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .order('name');
    if (error) throw error;
    return Array.isArray(data) ? data : DEMO_ZONES;
  } catch {
    // TODO: Add error logging/monitoring
    return DEMO_ZONES;
  }
}

export async function fetchZoneById(id: string): Promise<Zone | null> {
  if (DATA_MODE === 'mock') return DEMO_ZONES.find(z => z.id === id) ?? null;
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ?? DEMO_ZONES.find(z => z.id === id) ?? null;
  } catch {
    return DEMO_ZONES.find(z => z.id === id) ?? null;
  }
}

// ─── Risk Scores ───────────────────────────────────────────────────────────────

export async function fetchRiskScores(zoneId?: string): Promise<RiskScore[]> {
  if (DATA_MODE === 'mock') {
    return zoneId ? DEMO_RISK_SCORES.filter(r => r.zone_id === zoneId) : DEMO_RISK_SCORES;
  }
  try {
    let query = supabase.from('risk_scores').select('*').order('score', { ascending: false });
    if (zoneId) query = query.eq('zone_id', zoneId);
    const { data, error } = await query;
    if (error) throw error;
    const results = Array.isArray(data) ? data : [];
    if (results.length === 0) {
      return zoneId ? DEMO_RISK_SCORES.filter(r => r.zone_id === zoneId) : DEMO_RISK_SCORES;
    }
    return results;
  } catch {
    return zoneId ? DEMO_RISK_SCORES.filter(r => r.zone_id === zoneId) : DEMO_RISK_SCORES;
  }
}

// ─── Citizen Reports ──────────────────────────────────────────────────────────

export async function fetchCitizenReports(limit = 20): Promise<CitizenReport[]> {
  if (DATA_MODE === 'mock') return DEMO_CITIZEN_REPORTS.slice(0, limit);
  try {
    const { data, error } = await supabase
      .from('citizen_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const results = Array.isArray(data) ? data : [];
    return results.length > 0 ? results : DEMO_CITIZEN_REPORTS;
  } catch {
    return DEMO_CITIZEN_REPORTS;
  }
}

export async function submitCitizenReport(report: CitizenReportInsert): Promise<{ success: boolean; error?: string }> {
  if (DATA_MODE === 'mock') return { success: true };
  try {
    const { error } = await supabase
      .from('citizen_reports')
      .insert({
        report_type: report.report_type,
        zone_id: report.zone_id,
        severity: report.severity,
        description: report.description,
        image_url: report.image_url || null,
        contact_info: report.contact_info || null,
        source: 'citizen',
        status: 'pending',
      });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to submit report';
    return { success: false, error: msg };
  }
}

// ─── External Signals ─────────────────────────────────────────────────────────

export async function fetchExternalSignals(limit = 20): Promise<ExternalSignal[]> {
  if (DATA_MODE === 'mock') return DEMO_EXTERNAL_SIGNALS.slice(0, limit);
  try {
    const { data, error } = await supabase
      .from('external_signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const results = Array.isArray(data) ? data : [];
    return results.length > 0 ? results : DEMO_EXTERNAL_SIGNALS;
  } catch {
    return DEMO_EXTERNAL_SIGNALS;
  }
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export async function fetchRecommendations(zoneId?: string): Promise<Recommendation[]> {
  if (DATA_MODE === 'mock') {
    return zoneId ? DEMO_RECOMMENDATIONS.filter(r => r.zone_id === zoneId) : DEMO_RECOMMENDATIONS;
  }
  try {
    let query = supabase.from('recommendations').select('*').order('priority', { ascending: true });
    if (zoneId) query = query.eq('zone_id', zoneId);
    const { data, error } = await query;
    if (error) throw error;
    const results = Array.isArray(data) ? data : [];
    if (results.length === 0) {
      return zoneId ? DEMO_RECOMMENDATIONS.filter(r => r.zone_id === zoneId) : DEMO_RECOMMENDATIONS;
    }
    return results;
  } catch {
    return zoneId ? DEMO_RECOMMENDATIONS.filter(r => r.zone_id === zoneId) : DEMO_RECOMMENDATIONS;
  }
}

export async function updateRecommendationStatus(
  id: string,
  status: Recommendation['status']
): Promise<boolean> {
  if (DATA_MODE === 'mock') return true;
  try {
    const { error } = await supabase
      .from('recommendations')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

// ─── Failure Chains ───────────────────────────────────────────────────────────

export async function fetchFailureChains(): Promise<FailureChain[]> {
  if (DATA_MODE === 'mock') return DEMO_FAILURE_CHAINS;
  try {
    const { data, error } = await supabase
      .from('failure_chains')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const results = Array.isArray(data) ? data : [];
    return results.length > 0 ? results : DEMO_FAILURE_CHAINS;
  } catch {
    return DEMO_FAILURE_CHAINS;
  }
}

// ─── Team Allocations ─────────────────────────────────────────────────────────

export async function fetchTeamAllocations(): Promise<TeamAllocation[]> {
  if (DATA_MODE === 'mock') return DEMO_TEAM_ALLOCATIONS;
  try {
    const { data, error } = await supabase
      .from('team_allocations')
      .select('*')
      .order('priority_rank', { ascending: true });
    if (error) throw error;
    const results = Array.isArray(data) ? data : [];
    return results.length > 0 ? results : DEMO_TEAM_ALLOCATIONS;
  } catch {
    return DEMO_TEAM_ALLOCATIONS;
  }
}

export async function upsertTeamAllocation(
  allocation: Omit<TeamAllocation, 'id' | 'created_at'>
): Promise<boolean> {
  if (DATA_MODE === 'mock') return true;
  try {
    const { error } = await supabase.from('team_allocations').insert(allocation);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}
