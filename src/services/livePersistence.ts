// ShadowGrid AI — Live dataset persistence
//
// Persists computed engine output (risk scores, recommendations, failure
// chains, team allocations) as dataset_type='live' rows so the live dataset
// is durable and grows over time. Demo rows are never touched.
//
// All operations are best-effort: failures are swallowed because the live
// dataset is also held in app state, so a failed persist never breaks the UI.

import { supabase } from '@/db/supabase';
import { SUPABASE_CONFIGURED } from '@/lib/appConfig';
import type {
  ExternalSignal, RiskScore, Recommendation, FailureChain, TeamAllocation,
} from '@/types/types';

const LIVE = 'live' as const;

// ─── External signals ─────────────────────────────────────────────────────────

export async function persistLiveSignals(signals: ExternalSignal[]): Promise<boolean> {
  if (!SUPABASE_CONFIGURED || signals.length === 0) return false;
  const rows = signals.map(s => ({
    id:                s.id,
    signal_type:       s.signal_type,
    zone_id:           s.zone_id,
    source:            s.source,
    severity:          s.severity,
    confidence:        s.confidence,
    detected_keywords: s.detected_keywords,
    title:             s.title,
    summary:           s.summary,
    raw_payload:       s.raw_payload ?? null,
    created_at:        s.created_at,
    dataset_type:      LIVE,
  }));
  try {
    const { error } = await supabase
      .from('external_signals')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    return !error;
  } catch {
    return false;
  }
}

// ─── Computed engine output (regenerated each ingest) ───────────────────────────
// We clear prior live derived rows then re-insert the freshly computed set so
// the live dataset always reflects the latest scoring run without duplicates.

export async function persistLiveEngineOutput(params: {
  riskScores: RiskScore[];
  recommendations: Recommendation[];
  failureChains: FailureChain[];
  teamAllocations: TeamAllocation[];
}): Promise<boolean> {
  if (!SUPABASE_CONFIGURED) return false;
  const { riskScores, recommendations, failureChains, teamAllocations } = params;
  try {
    // Clear existing live-derived rows (demo rows are protected by RLS + filter)
    await Promise.all([
      supabase.from('risk_scores').delete().eq('dataset_type', LIVE),
      supabase.from('recommendations').delete().eq('dataset_type', LIVE),
      supabase.from('failure_chains').delete().eq('dataset_type', LIVE),
      supabase.from('team_allocations').delete().eq('dataset_type', LIVE),
    ]);

    await Promise.all([
      riskScores.length > 0 && supabase.from('risk_scores').insert(
        riskScores.map(r => ({
          id: r.id, zone_id: r.zone_id, category: r.category, score: r.score,
          risk_level: r.risk_level, citizen_component: r.citizen_component,
          weather_component: r.weather_component, signal_component: r.signal_component,
          historical_component: r.historical_component, propagation_component: r.propagation_component,
          explanation: r.explanation, updated_at: r.updated_at, dataset_type: LIVE,
        })),
      ),
      recommendations.length > 0 && supabase.from('recommendations').insert(
        recommendations.map(r => ({
          id: r.id, zone_id: r.zone_id, category: r.category, action_type: r.action_type,
          title: r.title, description: r.description, priority: r.priority, urgency: r.urgency,
          expected_impact_reduction: r.expected_impact_reduction, status: r.status,
          created_at: r.created_at, dataset_type: LIVE,
        })),
      ),
      failureChains.length > 0 && supabase.from('failure_chains').insert(
        failureChains.map(fc => ({
          id: fc.id, title: fc.title, trigger: fc.trigger, trigger_zone_id: fc.trigger_zone_id,
          steps: fc.steps, overall_risk_level: fc.overall_risk_level, is_active: fc.is_active,
          created_at: fc.created_at, dataset_type: LIVE,
        })),
      ),
      teamAllocations.length > 0 && supabase.from('team_allocations').insert(
        teamAllocations.map(ta => ({
          id: ta.id, zone_id: ta.zone_id, team_type: ta.team_type, team_count: ta.team_count,
          priority_rank: ta.priority_rank, expected_risk_reduction: ta.expected_risk_reduction,
          deployment_notes: ta.deployment_notes, status: ta.status,
          created_at: ta.created_at, dataset_type: LIVE,
        })),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

// ─── Reset ──────────────────────────────────────────────────────────────────────
// Wipes ALL live dataset rows across every table including live zones.
// Demo rows are untouched.

export async function resetLiveDataset(): Promise<boolean> {
  if (!SUPABASE_CONFIGURED) return false;
  try {
    await Promise.all([
      supabase.from('risk_scores').delete().eq('dataset_type', LIVE),
      supabase.from('recommendations').delete().eq('dataset_type', LIVE),
      supabase.from('failure_chains').delete().eq('dataset_type', LIVE),
      supabase.from('team_allocations').delete().eq('dataset_type', LIVE),
      supabase.from('external_signals').delete().eq('dataset_type', LIVE),
      supabase.from('citizen_reports').delete().eq('dataset_type', LIVE),
      // Live zones are deleted last (other tables FK-reference them)
      supabase.from('zones').delete().eq('dataset_type', LIVE),
    ]);
    return true;
  } catch {
    return false;
  }
}
