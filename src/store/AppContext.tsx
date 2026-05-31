// ShadowGrid AI — Application State Context
// Single reactive store for computed engine output + raw data.
// All pages read from this context instead of calling services independently.
//
// Runtime data mode (user-selectable, persisted in localStorage):
//   demo — stable seeded dataset (dataset_type='demo'); deterministic + safe
//   live — real ingested dataset (dataset_type='live'); grows over time
//
// Lifecycle:
//   1. On mount, AppProvider reads the persisted mode (default 'demo') and
//      loads the matching dataset from dataService (Supabase → seeded fallback)
//   2. Raw data is fed into runEngine() to produce EngineOutput
//   3. EngineOutput is stored in context and exposed via useAppStore()
//   4. Switching modes (setDataMode) clears state and reloads the other dataset
//   5. ingestAndRefresh() (live only) fetches live weather + news, merges them,
//      re-runs the engine, and persists the live dataset to the DB
//   6. Submitting a citizen report updates state and persists to the live dataset

import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
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
  updateRecommendationStatus as persistRecStatus,
} from '@/services/dataService';
import {
  ingestExternalSignals,
  type IngestResult,
} from '@/services/ingestionService';
import {
  persistLiveEngineOutput,
  resetLiveDataset,
} from '@/services/livePersistence';
import { geocodeCity, type CityLocation } from '@/services/geocodeService';
import { DEMO_CITY } from '@/lib/appConfig';
import { DEMO_CITY_CONFIG } from '@/lib/constants';
import {
  type DataMode,
  DEFAULT_DATA_MODE,
  DATA_MODE_LABELS,
  DATA_MODE_DESCRIPTIONS,
  getStoredDataMode,
  storeDataMode,
  clearStoredDataMode,
  getCapabilities,
  type DataModeCapabilities,
} from '@/lib/dataMode';

// ─── Context shape ────────────────────────────────────────────────────────────

export interface AppState {
  // Loading / ingestion state
  loading: boolean;
  ingesting: boolean;
  lastRefresh: Date;
  lastIngestResult: IngestResult | null;
  lastLiveIngestAt: string | null;

  // Data mode (demo | live) — user-selectable at runtime, persisted
  dataMode: DataMode;
  dataModeLabel: string;
  dataModeDescription: string;
  capabilities: DataModeCapabilities;

  // City identity (from VITE_DEMO_CITY) — drives all city labels + map center
  cityName: string;
  cityLocation: CityLocation;

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
  /** Switch the active data mode (demo | live). Reloads the matching dataset. */
  setDataMode: (mode: DataMode) => Promise<void>;
  /** Reset to the default Demo mode and wipe any persisted preference. */
  resetDataMode: () => Promise<void>;
  /** Wipe all live dataset rows from the DB, then reload. */
  resetLiveData: () => Promise<void>;
  /** Fetch live weather + news signals, merge, re-run engine (live mode only). */
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
const INITIAL_MODE = getStoredDataMode();

// Default city location — the configured name with the seed coordinates as a
// safe starting point until geocoding resolves the real lat/lng.
const DEFAULT_CITY_LOCATION: CityLocation = {
  name: DEMO_CITY,
  lat:  DEMO_CITY_CONFIG.lat,
  lng:  DEMO_CITY_CONFIG.lng,
  zoom: DEMO_CITY_CONFIG.zoom,
};

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
  lastLiveIngestAt: null,
  dataMode: INITIAL_MODE,
  dataModeLabel: DATA_MODE_LABELS[INITIAL_MODE],
  dataModeDescription: DATA_MODE_DESCRIPTIONS[INITIAL_MODE],
  capabilities: getCapabilities(),
  cityName: DEMO_CITY,
  cityLocation: DEFAULT_CITY_LOCATION,
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
  setDataMode: async () => {},
  resetDataMode: async () => {},
  resetLiveData: async () => {},
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
  const [lastLiveIngestAt, setLastLiveIngestAt] = useState<string | null>(null);
  const [dataMode, setDataModeState] = useState<DataMode>(INITIAL_MODE);
  const [zones, setZones] = useState<Zone[]>([]);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>([]);
  const [externalSignals, setExternalSignals] = useState<ExternalSignal[]>([]);
  const [availableTeams, setAvailableTeams] = useState(8);
  const [engineOutput, setEngineOutput] = useState<EngineOutput | null>(null);
  const [cityLocation, setCityLocation] = useState<CityLocation>(DEFAULT_CITY_LOCATION);

  const capabilities = getCapabilities();

  // Track the mode that is currently being loaded so stale async loads can be
  // discarded (prevents data from one mode leaking into another after a switch).
  const activeModeRef = useRef<DataMode>(INITIAL_MODE);

  // Re-run engine whenever raw data or availableTeams changes
  const recomputeEngine = useCallback(
    (z: Zone[], cr: CitizenReport[], es: ExternalSignal[], teams: number): EngineOutput => {
      const inputs: EngineInputs = {
        zones: z,
        citizenReports: cr,
        externalSignals: es,
        availableTeams: teams,
      };
      const output = runEngine(inputs);
      setEngineOutput(output);
      return output;
    },
    [],
  );

  // Load the dataset for a given mode, then re-run the engine.
  const loadDataForMode = useCallback(async (mode: DataMode) => {
    activeModeRef.current = mode;
    setLoading(true);
    try {
      const [z, cr, es] = await Promise.all([
        fetchZones(),
        fetchCitizenReports(mode, 50),
        fetchExternalSignals(mode, 30),
      ]);
      // Discard if the user switched modes again mid-load
      if (activeModeRef.current !== mode) return;
      setZones(z);
      setCitizenReports(cr);
      setExternalSignals(es);
      recomputeEngine(z, cr, es, availableTeams);
      setLastRefresh(new Date());
    } finally {
      if (activeModeRef.current === mode) setLoading(false);
    }
  }, [availableTeams, recomputeEngine]);

  // Manual refresh of the current mode's dataset
  const refresh = useCallback(() => loadDataForMode(dataMode), [dataMode, loadDataForMode]);

  // Switch modes: clear state to avoid cross-mode leakage, persist, reload.
  const setDataMode = useCallback(async (mode: DataMode) => {
    if (mode === activeModeRef.current && !loading) {
      // Already on this mode — still allow a reload
    }
    storeDataMode(mode);
    setDataModeState(mode);
    // Clear derived + raw state so the UI never shows stale cross-mode data
    setEngineOutput(null);
    setCitizenReports([]);
    setExternalSignals([]);
    setLastIngestResult(null);
    await loadDataForMode(mode);
  }, [loading, loadDataForMode]);

  const resetDataMode = useCallback(async () => {
    clearStoredDataMode();
    await setDataMode(DEFAULT_DATA_MODE);
  }, [setDataMode]);

  // Fetch live weather + news, merge, re-run engine, persist to live dataset.
  const ingestAndRefresh = useCallback(async (): Promise<IngestResult> => {
    // Ingestion only applies to the live dataset; demo stays presentation-safe.
    if (dataMode !== 'live') {
      const noop: IngestResult = {
        signals: externalSignals, newSignalCount: 0, persisted: false,
        errors: ['Ingestion is only available in Live mode.'],
        ingestedAt: new Date().toISOString(),
        weather: { signals: [], snapshots: [], source: 'fallback' },
        news:    { signals: [], articles: 0, matched: 0, source: 'fallback' },
      };
      setLastIngestResult(noop);
      return noop;
    }

    setIngesting(true);
    try {
      const result = await ingestExternalSignals(zones, externalSignals);
      setExternalSignals(result.signals);
      const output = recomputeEngine(zones, citizenReports, result.signals, availableTeams);
      setLastRefresh(new Date());
      setLastIngestResult(result);
      setLastLiveIngestAt(result.ingestedAt);

      // Persist the freshly computed live engine output (best-effort).
      persistLiveEngineOutput({
        riskScores:      output.riskScores,
        recommendations: output.recommendations,
        failureChains:   output.failureChains,
        teamAllocations: output.teamAllocations,
      }).catch(() => {});

      return result;
    } finally {
      setIngesting(false);
    }
  }, [dataMode, zones, citizenReports, externalSignals, availableTeams, recomputeEngine]);

  // Wipe all live dataset rows, then reload (stays in current mode).
  const resetLiveData = useCallback(async () => {
    await resetLiveDataset().catch(() => {});
    setLastLiveIngestAt(null);
    setLastIngestResult(null);
    await loadDataForMode(dataMode);
  }, [dataMode, loadDataForMode]);

  // Initial load
  useEffect(() => { loadDataForMode(INITIAL_MODE); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve the configured city name → map coordinates (once on mount).
  useEffect(() => {
    let cancelled = false;
    geocodeCity(DEMO_CITY, DEFAULT_CITY_LOCATION).then(loc => {
      if (!cancelled) setCityLocation(loc);
    });
    return () => { cancelled = true; };
  }, []);

  // Re-run engine when availableTeams changes (without re-fetching)
  useEffect(() => {
    if (zones.length > 0) {
      recomputeEngine(zones, citizenReports, externalSignals, availableTeams);
    }
  }, [availableTeams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Submit a citizen report: update local state + persist to live dataset.
  const submitReport = useCallback(
    async (report: CitizenReportInsert): Promise<{ success: boolean; error?: string }> => {
      // Optimistically add to local state for immediate UI feedback
      const newReport: CitizenReport = {
        id: `local-${Date.now()}`,
        ...report,
        source: 'citizen',
        status: 'pending',
        created_at: new Date().toISOString(),
        dataset_type: dataMode,
      };

      const updatedReports = [newReport, ...citizenReports];
      setCitizenReports(updatedReports);

      // Re-run engine with new report included
      recomputeEngine(zones, updatedReports, externalSignals, availableTeams);

      // Persist to the live dataset only (demo stays stable). Non-blocking.
      persistReport(dataMode, report).catch(() => {
        // Persistence failure is non-fatal — report is already in app state
      });

      return { success: true };
    },
    [dataMode, zones, citizenReports, externalSignals, availableTeams, recomputeEngine],
  );

  // Optimistic recommendation status update (+ persist for live dataset)
  const updateRecommendationStatus = useCallback(
    (id: string, status: Recommendation['status']) => {
      if (!engineOutput) return;
      const updatedRecs = engineOutput.recommendations.map(r =>
        r.id === id ? { ...r, status } : r
      );
      setEngineOutput(prev => prev ? { ...prev, recommendations: updatedRecs } : prev);
      persistRecStatus(dataMode, id, status).catch(() => {});
    },
    [engineOutput, dataMode],
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
    lastLiveIngestAt,
    dataMode,
    dataModeLabel:       DATA_MODE_LABELS[dataMode],
    dataModeDescription: DATA_MODE_DESCRIPTIONS[dataMode],
    capabilities,
    cityName: cityLocation.name,
    cityLocation,
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
    refresh,
    setDataMode,
    resetDataMode,
    resetLiveData,
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
