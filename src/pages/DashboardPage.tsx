// ShadowGrid AI — Main Dashboard Page (all 7 sections)
// Data is fully driven by the AppContext engine output.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, AlertTriangle, FileWarning, TrendingUp, Shield, Map, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/dashboard/StatCard';
import { CityRiskMap } from '@/components/dashboard/CityRiskMap';
import { HighRiskZonesPanel } from '@/components/dashboard/HighRiskZonesPanel';
import { RecentSignalsPanel } from '@/components/dashboard/RecentSignalsPanel';
import { RecommendationsPanel } from '@/components/dashboard/RecommendationsPanel';
import { FailureChainPanel } from '@/components/dashboard/FailureChainPanel';
import { RiskAnalyticsPreview } from '@/components/dashboard/RiskAnalyticsPreview';
import { RiskBadge } from '@/components/common/RiskBadge';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/AppContext';
import { RISK_CATEGORY_LABELS, getRiskLevel, RISK_LEVEL_CONFIG } from '@/lib/constants';
import type { RiskCategory } from '@/types/types';

const ALL_CATEGORIES: RiskCategory[] = ['drainage', 'road', 'water', 'power', 'traffic', 'emergency_access'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>(undefined);

  const {
    loading, lastRefresh, refresh,
    zones, citizenReports, externalSignals,
    zoneSummaries, recommendations, failureChains,
    dashboardSummary, dataModeLabel, dataMode, cityName, cityLocation,
    getExplanationForZone,
  } = useAppStore();

  const zoneNames = Object.fromEntries(zones.map(z => [z.id, z.name]));

  // Inline zone preview data
  const selectedSummary = selectedZoneId ? zoneSummaries.find(s => s.zone_id === selectedZoneId) : null;
  const selectedZone = selectedZoneId ? zones.find(z => z.id === selectedZoneId) : null;
  const selectedExplanation = selectedZoneId ? getExplanationForZone(selectedZoneId) : undefined;

  const modeBadgeColor: Record<string, string> = {
    demo: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
    live: 'bg-green-500/10 text-green-300 border-green-500/30',
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">City Risk Dashboard</h1>
            <Badge className={`text-[10px] h-5 border ${modeBadgeColor[dataMode] ?? modeBadgeColor.demo}`}>
              {dataModeLabel}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {cityName} · Last updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 border border-border text-muted-foreground hover:bg-accent"
            onClick={() => navigate('/map')}
          >
            <Map size={13} />
            Full Map
          </Button>
          {selectedZoneId && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-primary border border-primary/30 hover:bg-primary/10"
              onClick={() => navigate(`/zone/${selectedZoneId}`)}
            >
              <Shield size={14} />
              Zone Details
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 border border-border text-muted-foreground hover:bg-accent"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 1 — Summary Cards */}
      <section>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 bg-muted" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Active Risk Signals"
              value={dashboardSummary.total_active_signals}
              subtext="Across all zones"
              icon={AlertTriangle}
              variant="warning"
              trend="up"
              trendValue={`${dashboardSummary.citizen_reports_today} citizen today`}
            />
            <StatCard
              label="Critical Zones"
              value={dashboardSummary.critical_zones_count}
              subtext="Require immediate action"
              icon={Shield}
              variant="critical"
            />
            <StatCard
              label="Most Common Failure"
              value={RISK_CATEGORY_LABELS[dashboardSummary.most_common_failure_type]}
              subtext="Highest signal volume"
              icon={FileWarning}
              variant="info"
            />
            <StatCard
              label="Failures Prevented"
              value={dashboardSummary.estimated_failures_prevented}
              subtext={`${dashboardSummary.response_improvement_pct}% faster response`}
              icon={TrendingUp}
              variant="success"
            />
          </div>
        )}
      </section>

      {/* 2 — Main: Map + Right Sidebar */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* City Risk Map */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">City Risk Map</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedZoneId
                  ? `Selected: ${zoneNames[selectedZoneId] ?? selectedZoneId}`
                  : 'Click a zone to inspect · '}
                {!selectedZoneId && (
                  <button className="text-primary hover:underline text-xs" onClick={() => navigate('/map')}>
                    Open full map →
                  </button>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {[
                { c: 'bg-red-400', l: 'Critical' },
                { c: 'bg-orange-400', l: 'High' },
                { c: 'bg-yellow-400', l: 'Medium' },
                { c: 'bg-green-400', l: 'Low' },
              ].map(({ c, l }) => (
                <span key={l} className="flex items-center gap-1">
                  <span className={`w-2.5 h-2.5 rounded-sm ${c}`} />{l}
                </span>
              ))}
            </div>
          </div>
          <div className="h-[360px] md:h-[420px]">
            {loading ? (
              <Skeleton className="w-full h-full bg-muted" />
            ) : (
              <CityRiskMap
                zones={zones}
                riskSummaries={zoneSummaries}
                selectedZoneId={selectedZoneId}
                onZoneClick={zoneId => setSelectedZoneId(prev => prev === zoneId ? undefined : zoneId)}
                height="100%"
                center={[cityLocation.lat, cityLocation.lng]}
                zoom={cityLocation.zoom}
              />
            )}
          </div>

          {/* Inline zone preview strip */}
          {selectedSummary && selectedZone && (
            <div className="border-t border-border px-4 py-3 bg-card/60 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${RISK_LEVEL_CONFIG[selectedSummary.risk_level].bgColor}`}>
                  <span className={`text-sm font-bold font-mono ${RISK_LEVEL_CONFIG[selectedSummary.risk_level].color}`}>
                    {Math.round(selectedSummary.overall_score)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{selectedZone.name}</span>
                    <RiskBadge score={selectedSummary.overall_score} size="sm" />
                  </div>
                  {selectedExplanation && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{selectedExplanation.summary}</p>
                  )}
                </div>
              </div>
              {/* Category mini-bars */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {ALL_CATEGORIES.map(cat => {
                  const score = selectedSummary.scores_by_category[cat] ?? 0;
                  if (score < 10) return null;
                  const catLevel = getRiskLevel(score);
                  const catCfg = RISK_LEVEL_CONFIG[catLevel];
                  return (
                    <div key={cat} className="flex items-center gap-1">
                      <CategoryIcon category={cat} size={11} className="text-muted-foreground" />
                      <span className={`text-[11px] font-mono font-bold ${catCfg.color}`}>{Math.round(score)}</span>
                    </div>
                  );
                })}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 h-7 px-2 text-xs gap-1 text-primary border border-primary/30 hover:bg-primary/10"
                onClick={() => navigate(`/zone/${selectedZoneId}`)}
              >
                Full Analysis <ExternalLink size={10} />
              </Button>
            </div>
          )}
        </div>

        {/* 3 — Highest-Risk Zones Panel */}
        <div className="min-h-[420px]">
          <HighRiskZonesPanel
            summaries={zoneSummaries}
            onZoneClick={zoneId => setSelectedZoneId(prev => prev === zoneId ? undefined : zoneId)}
            selectedZoneId={selectedZoneId}
          />
        </div>
      </section>

      {/* 4 & 5 — Recent Signals + Recommendations */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="min-h-[360px]">
          <RecentSignalsPanel
            citizenReports={citizenReports.slice(0, 8)}
            externalSignals={externalSignals.slice(0, 8)}
            maxItems={8}
          />
        </div>
        <div className="min-h-[360px]">
          <RecommendationsPanel
            recommendations={recommendations}
            maxItems={5}
            showZoneName
            zoneNames={zoneNames}
          />
        </div>
      </section>

      {/* 6 & 7 — Failure Chain + Analytics Preview */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FailureChainPanel chains={failureChains} />
        <RiskAnalyticsPreview />
      </section>
    </div>
  );
}

