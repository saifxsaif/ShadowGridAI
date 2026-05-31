// ShadowGrid AI — Application State Context
// Single reactive store for computed engine output + raw data.
// All pages read from this context instead of calling services independently.
//
// Lifecycle:
//   1. On mount, AppProvider loads raw data from dataService (Supabase → mock fallback)
//   2. Raw data is fed into runEngine() to produce EngineOutput
//   3. EngineOutput is stored in context and exposed via useAppStore()
//   4. When a citizen report is submitted the new report is appended to raw data
//      and runEngine() is re-invoked — all consumers re-render with updated scores
//   5. ingestAndRefresh() fetches live weather + news signals, merges them, re-runs engine
//   6. Manual refresh (refresh()) re-fetches from Supabase / seeded fallback

import React, {
  createContext, useContext, useEffect, useState, useCallback,
  type ReactNode,
} from 'react';
import type {
  Zone, CitizenReport, ExternalSignal, RiskScore,
  Recommendation, FailureChain, TeamAllocation,
  ZoneRiskSummary, DashboardSummary, RiskTrendPoint, SignalCountPoint,
  CitizenReportInsert,
} from '@/types/types';
import { runEngine, type EngineOutput, type EngineInputs } from '@/engine/index';
import { type ZoneExplanation } from '@/engine/explainer';
import {
  fetchZones,
  fetchCitizenReports,
  fetchExternalSignals,
  submitCitizenReport as persistReport,
} from '@/services/dataService';
import {
  ingestExternalSignals,
  type IngestResult,
} from '@/services/ingestionService';
import { DATA_MODE, DATA_MODE_LABELS, DATA_MODE_DESCRIPTIONS, type DataMode } from '@/lib/appConfig';

// ─── Context shape ────────────────────────────────────────────────────────────

export interface AppState {
  // Loading / ingestion state
  loading: boolean;
  ingesting: boolean;
  lastRefresh: Date;
  lastIngestResult: IngestResult | null;

  // Data mode (mock | hybrid | live) — derived from env vars at startup
  dataMode: DataMode;
  dataModeLabel: string;
  dataModeDescription: string;

  // Raw data
  zones: Zone[];
  citizenReports: CitizenReport[];
  externalSignals: ExternalSignal[];

  // Computed engine output
  riskScores: RiskScore[];
  zoneSummaries: ZoneRiskSummary[];
  recommendations: Recommendation[];
  failureChains: FailureChain[];
  teamAllocations: TeamAllocation[];
  explanations: Map<string, ZoneExplanation>;
  dashboardSummary: DashboardSummary;
  riskTrend: RiskTrendPoint[];
  signalTrend: SignalCountPoint[];

  // Available teams (controlled from OperationsPage)
  availableTeams: number;

  // Actions
  refresh: () => Promise<void>;
  /** Fetch live weather + news signals, merge, re-run engine */
  ingestAndRefresh: () => Promise<IngestResult>;
  setAvailableTeams: (n: number) => void;
  submitReport: (report: CitizenReportInsert) => Promise<{ success: boolean; error?: string }>;
  updateRecommendationStatus: (id: string, status: Recommendation['status']) => void;
  getZoneById: (id: string) => Zone | undefined;
  getRiskScoresForZone: (zoneId: string) => RiskScore[];
  getExplanationForZone: (zoneId: string) => ZoneExplanation | undefined;
  getZoneSummary: (zoneId: string) => ZoneRiskSummary | undefined;
}

const EMPTY_MAP = new Map<string, ZoneExplanation>();

const DEFAULT_SUMMARY: DashboardSummary = {
  total_active_signals: 0,
  critical_zones_count: 0,
  most_common_failure_type: 'drainage',
  estimated_failures_prevented: 0,
  citizen_reports_today: 0,
  external_signals_today: 0,
  response_improvement_pct: 0,
  last_updated: new Date().toISOString(),
};

const DEFAULT_STATE: AppState = {
  loading: true,
  ingesting: false,
  lastRefresh: new Date(),
  lastIngestResult: null,
  dataMode: DATA_MODE,
  dataModeLabel: DATA_MODE_LABELS[DATA_MODE],
  dataModeDescription: DATA_MODE_DESCRIPTIONS[DATA_MODE],
  zones: [],
  citizenReports: [],
  externalSignals: [],
  riskScores: [],
  zoneSummaries: [],
  recommendations: [],
  failureChains: [],
  teamAllocations: [],
  explanations: EMPTY_MAP,
  dashboardSummary: DEFAULT_SUMMARY,
  riskTrend: [],
  signalTrend: [],
  availableTeams: 8,
  refresh: async () => {},
  ingestAndRefresh: async () => ({
    signals: [], newSignalCount: 0, persisted: false, errors: [],
    ingestedAt: new Date().toISOString(),
    weather: { signals: [], snapshots: [], source: 'fallback' },
    news:    { signals: [], articles: 0, matched: 0, source: 'fallback' },
  }),
  setAvailableTeams: () => {},
  submitReport: async () => ({ success: false }),
  updateRecommendationStatus: () => {},
  getZoneById: () => undefined,
  getRiskScoresForZone: () => [],
  getExplanationForZone: () => undefined,
  getZoneSummary: () => undefined,
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppState>(DEFAULT_STATE);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [lastIngestResult, setLastIngestResult] = useState<IngestResult | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>([]);
  const [externalSignals, setExternalSignals] = useState<ExternalSignal[]>([]);
  const [availableTeams, setAvailableTeams] = useState(8);
  const [engineOutput, setEngineOutput] = useState<EngineOutput | null>(null);

  // Re-run engine whenever raw data or availableTeams changes
  const recomputeEngine = useCallback(
    (z: Zone[], cr: CitizenReport[], es: ExternalSignal[], teams: number) => {
      const inputs: EngineInputs = {
        zones: z,
        citizenReports: cr,
        externalSignals: es,
        availableTeams: teams,
      };
      const output = runEngine(inputs);
      setEngineOutput(output);
    },
    [],
  );

  // Load raw data from service layer, then re-run engine
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [z, cr, es] = await Promise.all([
        fetchZones(),
        fetchCitizenReports(50),
        fetchExternalSignals(30),
      ]);
      setZones(z);
      setCitizenReports(cr);
      setExternalSignals(es);
      recomputeEngine(z, cr, es, availableTeams);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, [availableTeams, recomputeEngine]);

  // Fetch live weather + news, merge with current signals, re-run engine
  const ingestAndRefresh = useCallback(async (): Promise<IngestResult> => {
    setIngesting(true);
    try {
      const result = await ingestExternalSignals(zones, externalSignals);
      setExternalSignals(result.signals);
      recomputeEngine(zones, citizenReports, result.signals, availableTeams);
      setLastRefresh(new Date());
      setLastIngestResult(result);
      return result;
    } finally {
      setIngesting(false);
    }
  }, [zones, citizenReports, externalSignals, availableTeams, recomputeEngine]);

  // Initial load
  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-run engine when availableTeams changes (without re-fetching)
  useEffect(() => {
    if (zones.length > 0) {
      recomputeEngine(zones, citizenReports, externalSignals, availableTeams);
    }
  }, [availableTeams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Submit a citizen report: persist to Supabase (best-effort) + update local state
  const submitReport = useCallback(
    async (report: CitizenReportInsert): Promise<{ success: boolean; error?: string }> => {
      // Optimistically add to local state for immediate UI feedback
      const newReport: CitizenReport = {
        id: `local-${Date.now()}`,
        ...report,
        source: 'citizen',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const updatedReports = [newReport, ...citizenReports];
      setCitizenReports(updatedReports);

      // Re-run engine with new report included
      recomputeEngine(zones, updatedReports, externalSignals, availableTeams);

      // Persist to Supabase in background (non-blocking)
      persistReport(report).catch(() => {
        // Supabase persistence failure is non-fatal in MVP
      });

      return { success: true };
    },
    [zones, citizenReports, externalSignals, availableTeams, recomputeEngine],
  );

  // Optimistic recommendation status update
  const updateRecommendationStatus = useCallback(
    (id: string, status: Recommendation['status']) => {
      if (!engineOutput) return;
      const updatedRecs = engineOutput.recommendations.map(r =>
        r.id === id ? { ...r, status } : r
      );
      setEngineOutput(prev => prev ? { ...prev, recommendations: updatedRecs } : prev);
    },
    [engineOutput],
  );

  // Derived selectors
  const getZoneById = useCallback(
    (id: string) => zones.find(z => z.id === id),
    [zones],
  );

  const getRiskScoresForZone = useCallback(
    (zoneId: string) => (engineOutput?.riskScores ?? []).filter(rs => rs.zone_id === zoneId),
    [engineOutput],
  );

  const getExplanationForZone = useCallback(
    (zoneId: string) => engineOutput?.explanations.get(zoneId),
    [engineOutput],
  );

  const getZoneSummary = useCallback(
    (zoneId: string) => engineOutput?.zoneSummaries.find(s => s.zone_id === zoneId),
    [engineOutput],
  );

  const value: AppState = {
    loading,
    ingesting,
    lastRefresh,
    lastIngestResult,
    dataMode:            DATA_MODE,
    dataModeLabel:       DATA_MODE_LABELS[DATA_MODE],
    dataModeDescription: DATA_MODE_DESCRIPTIONS[DATA_MODE],
    zones,
    citizenReports,
    externalSignals,
    riskScores:        engineOutput?.riskScores ?? [],
    zoneSummaries:     engineOutput?.zoneSummaries ?? [],
    recommendations:   engineOutput?.recommendations ?? [],
    failureChains:     engineOutput?.failureChains ?? [],
    teamAllocations:   engineOutput?.teamAllocations ?? [],
    explanations:      engineOutput?.explanations ?? EMPTY_MAP,
    dashboardSummary:  engineOutput?.dashboardSummary ?? DEFAULT_SUMMARY,
    riskTrend:         engineOutput?.riskTrend ?? [],
    signalTrend:       engineOutput?.signalTrend ?? [],
    availableTeams,
    refresh:                    loadData,
    ingestAndRefresh,
    setAvailableTeams,
    submitReport,
    updateRecommendationStatus,
    getZoneById,
    getRiskScoresForZone,
    getExplanationForZone,
    getZoneSummary,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAppStore(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
