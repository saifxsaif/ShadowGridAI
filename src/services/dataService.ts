// ShadowGrid AI — Supabase service layer (dataset-aware)
//
// Every read/write is scoped to a DatasetType ('demo' | 'live'):
//   • demo — the stable seeded dataset (dataset_type='demo')
//   • live — the live, ingested dataset (dataset_type='live')
//
// Zones are now also dataset-scoped:
//   • demo zones — the 7 seeded Metroville zones
//   • live zones — procedurally generated for the configured live city
//
// Fallback strategy:
//   • If Supabase is NOT configured, demo reads return seeded mock constants
//     (so the app still works fully offline). Live reads return empty arrays.
//   • If Supabase IS configured but a demo query returns nothing, we fall back
//     to seeded mock data so the demo is never blank.

import { supabase } from '@/db/supabase';
import { SUPABASE_CONFIGURED } from '@/lib/appConfig';
import type {
  Zone,
  RiskScore,
  CitizenReport,
  CitizenReportInsert,
  ExternalSignal,
  Recommendation,
  FailureChain,
  TeamAllocation,
  DatasetType,
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

// Seeded fallbacks are only ever used for the demo dataset.
function demoFallback<T>(dataset: DatasetType, rows: T[]): T[] {
  return dataset === 'demo' ? rows : [];
}

// ─── Zones (dataset-scoped) ──────────────────────────────────────────────────
// demo → the 7 seeded Metroville zones
// live → procedurally generated zones for the configured live city

export async function fetchZones(dataset: DatasetType = 'demo'): Promise<Zone[]> {
  if (!SUPABASE_CONFIGURED) return dataset === 'demo' ? DEMO_ZONES : [];
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('dataset_type', dataset)
      .order('name');
    if (error) throw error;
    const results = Array.isArray(data) ? data : [];
    // Demo fallback: if the DB has no demo zones, use the in-memory seed.
    if (results.length === 0 && dataset === 'demo') return DEMO_ZONES;
    return results;
  } catch {
    return dataset === 'demo' ? DEMO_ZONES : [];
  }
}

export async function fetchZoneById(id: string, dataset: DatasetType = 'demo'): Promise<Zone | null> {
  if (!SUPABASE_CONFIGURED) return DEMO_ZONES.find(z => z.id === id) ?? null;
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('id', id)
      .eq('dataset_type', dataset)
      .maybeSingle();
    if (error) throw error;
    return data ?? (dataset === 'demo' ? DEMO_ZONES.find(z => z.id === id) ?? null : null);
  } catch {
    return dataset === 'demo' ? DEMO_ZONES.find(z => z.id === id) ?? null : null;
  }
}

// ─── Risk Scores ───────────────────────────────────────────────────────────────

export async function fetchRiskScores(dataset: DatasetType, zoneId?: string): Promise<RiskScore[]> {
  const fallback = () =>
    demoFallback(dataset, zoneId ? DEMO_RISK_SCORES.filter(r => r.zone_id === zoneId) : DEMO_RISK_SCORES);
  if (!SUPABASE_CONFIGURED) return fallback();
  try {
    let query = supabase.from('risk_scores').select('*')
      .eq('dataset_type', dataset)
      .order('score', { ascending: false });
    if (zoneId) query = query.eq('zone_id', zoneId);
    const { data, error } = await query;
    if (error) throw error;
    const results = Array.isArray(data) ? data : [];
    return results.length > 0 ? results : fallback();
  } catch {
    return fallback();
  }
}

// ─── Citizen Reports ──────────────────────────────────────────────────────────

export async function fetchCitizenReports(dataset: DatasetType, limit = 20): Promise<CitizenReport[]> {
  if (!SUPABASE_CONFIGURED) return demoFallback(dataset, DEMO_CITIZEN_REPORTS).slice(0, limit);
  try {
    const { data, error } = await supabase
      .from('citizen_reports')
      .select('*')
      .eq('dataset_type', dataset)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const results = Array.isArray(data) ? data : [];
    return results.length > 0 ? results : demoFallback(dataset, DEMO_CITIZEN_REPORTS);
  } catch {
    return demoFallback(dataset, DEMO_CITIZEN_REPORTS);
  }
}

export async function submitCitizenReport(
  dataset: DatasetType,
  report: CitizenReportInsert,
): Promise<{ success: boolean; error?: string }> {
  // Demo dataset is read-only/presentation-safe — never persist into it.
  if (!SUPABASE_CONFIGURED || dataset === 'demo') return { success: true };
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
        dataset_type: 'live',
      });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to submit report';
    return { success: false, error: msg };
  }
}

// ─── External Signals ─────────────────────────────────────────────────────────

export async function fetchExternalSignals(dataset: DatasetType, limit = 20): Promise<ExternalSignal[]> {
  if (!SUPABASE_CONFIGURED) return demoFallback(dataset, DEMO_EXTERNAL_SIGNALS).slice(0, limit);
  try {
    const { data, error } = await supabase
      .from('external_signals')
      .select('*')
      .eq('dataset_type', dataset)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    const results = Array.isArray(data) ? data : [];
    return results.length > 0 ? results : demoFallback(dataset, DEMO_EXTERNAL_SIGNALS);
  } catch {
    return demoFallback(dataset, DEMO_EXTERNAL_SIGNALS);
  }
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export async function fetchRecommendations(dataset: DatasetType, zoneId?: string): Promise<Recommendation[]> {
  const fallback = () =>
    demoFallback(dataset, zoneId ? DEMO_RECOMMENDATIONS.filter(r => r.zone_id === zoneId) : DEMO_RECOMMENDATIONS);
  if (!SUPABASE_CONFIGURED) return fallback();
  try {
    let query = supabase.from('recommendations').select('*')
      .eq('dataset_type', dataset)
      .order('priority', { ascending: true });
    if (zoneId) query = query.eq('zone_id', zoneId);
    const { data, error } = await query;
    if (error) throw error;
    const results = Array.isArray(data) ? data : [];
    return results.length > 0 ? results : fallback();
  } catch {
    return fallback();
  }
}

export async function updateRecommendationStatus(
  dataset: DatasetType,
  id: string,
  status: Recommendation['status']
): Promise<boolean> {
  // Demo recommendations are not persisted; updates are local-only.
  if (!SUPABASE_CONFIGURED || dataset === 'demo') return true;
  try {
    const { error } = await supabase
      .from('recommendations')
      .update({ status })
      .eq('id', id)
      .eq('dataset_type', 'live');
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

// ─── Failure Chains ───────────────────────────────────────────────────────────

export async function fetchFailureChains(dataset: DatasetType): Promise<FailureChain[]> {
  if (!SUPABASE_CONFIGURED) return demoFallback(dataset, DEMO_FAILURE_CHAINS);
  try {
    const { data, error } = await supabase
      .from('failure_chains')
      .select('*')
      .eq('dataset_type', dataset)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const results = Array.isArray(data) ? data : [];
    return results.length > 0 ? results : demoFallback(dataset, DEMO_FAILURE_CHAINS);
  } catch {
    return demoFallback(dataset, DEMO_FAILURE_CHAINS);
  }
}

// ─── Team Allocations ─────────────────────────────────────────────────────────

export async function fetchTeamAllocations(dataset: DatasetType): Promise<TeamAllocation[]> {
  if (!SUPABASE_CONFIGURED) return demoFallback(dataset, DEMO_TEAM_ALLOCATIONS);
  try {
    const { data, error } = await supabase
      .from('team_allocations')
      .select('*')
      .eq('dataset_type', dataset)
      .order('priority_rank', { ascending: true });
    if (error) throw error;
    const results = Array.isArray(data) ? data : [];
    return results.length > 0 ? results : demoFallback(dataset, DEMO_TEAM_ALLOCATIONS);
  } catch {
    return demoFallback(dataset, DEMO_TEAM_ALLOCATIONS);
  }
}

export async function upsertTeamAllocation(
  dataset: DatasetType,
  allocation: Omit<TeamAllocation, 'id' | 'created_at'>
): Promise<boolean> {
  if (!SUPABASE_CONFIGURED || dataset === 'demo') return true;
  try {
    const { error } = await supabase
      .from('team_allocations')
      .insert({ ...allocation, dataset_type: 'live' });
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}
