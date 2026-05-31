// ShadowGrid AI — Admin / Operations Page
// Uses AppContext for computed recommendations, team allocations, and zone summaries.
// Now includes:
//   • Data Mode panel with runtime Demo/Live switcher
//   • Live signal ingestion button with result inspector
//   • Last ingest summary (weather + news counts, errors)
//   • Signal inspector table (latest external signals)

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings2, Users, ChevronRight, CheckCircle2, Clock, Zap, ArrowUpRight,
  RefreshCw, Radio, Cloud, Newspaper, Database, AlertTriangle, Info,
  FlaskConical, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RiskBadge } from '@/components/common/RiskBadge';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { DataModeSwitcher } from '@/components/common/DataModeSwitcher';
import { useAppStore } from '@/store/AppContext';
import { RISK_CATEGORY_LABELS, ACTION_TYPE_LABELS } from '@/lib/constants';
import { formatTimeAgo } from '@/lib/uiHelpers';
import type { Recommendation } from '@/types/types';

const URGENCY_COLORS: Record<string, string> = {
  immediate: 'bg-red-500/20 text-red-300 border-red-500/30',
  urgent:    'bg-orange-500/20 text-orange-300 border-orange-500/30',
  scheduled: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

const URGENCY_ICONS: Record<string, React.ReactNode> = {
  immediate: <Zap size={11} />,
  urgent:    <ArrowUpRight size={11} />,
  scheduled: <Clock size={11} />,
};

const SOURCE_CONFIG = {
  weather: { label: 'Weather',  icon: <Cloud size={12} />,      color: 'text-blue-400' },
  news:    { label: 'News',     icon: <Newspaper size={12} />,  color: 'text-purple-400' },
  citizen: { label: 'Citizen',  icon: <Users size={12} />,      color: 'text-green-400' },
  sensor:  { label: 'Sensor',   icon: <Radio size={12} />,      color: 'text-yellow-400' },
  seeded:  { label: 'Seeded',   icon: <FlaskConical size={12} />, color: 'text-muted-foreground' },
};

export default function OperationsPage() {
  const {
    recommendations,
    teamAllocations,
    zoneSummaries,
    zones,
    externalSignals,
    availableTeams,
    setAvailableTeams,
    updateRecommendationStatus,
    refresh,
    ingestAndRefresh,
    resetLiveData,
    loading,
    ingesting,
    lastRefresh,
    lastIngestResult,
    lastLiveIngestAt,
    dataMode,
  } = useAppStore();

  const [signalFilter, setSignalFilter] = useState<string>('all');

  const zoneNames = Object.fromEntries(zones.map(z => [z.id, z.name]));

  function handleStatusChange(recId: string, status: Recommendation['status']) {
    updateRecommendationStatus(recId, status);
    toast.success(`Action marked as ${status.replace('_', ' ')}`);
  }

  async function handleIngest() {
    if (dataMode !== 'live') {
      toast.info('Switch to Live mode to ingest real signals. Demo data stays stable.');
      return;
    }
    toast.info('Fetching live weather and news signals…');
    try {
      const result = await ingestAndRefresh();
      const weatherSrc = result.weather.source === 'live' ? 'live' : 'fallback';
      const newsSrc    = result.news.source === 'live' ? 'live' : 'fallback';
      if (result.errors.length > 0) {
        toast.warning(
          `Ingest complete with warnings. Weather: ${weatherSrc}, News: ${newsSrc}. ` +
          `${result.newSignalCount} new signals.`,
        );
      } else {
        toast.success(
          `Ingest complete. ${result.newSignalCount} new signals ingested. ` +
          `Weather: ${weatherSrc} · News: ${newsSrc}.`,
        );
      }
    } catch {
      toast.error('Signal ingestion failed. Using existing data.');
    }
  }

  async function handleResetLive() {
    toast.info('Clearing live dataset…');
    await resetLiveData();
    toast.success('Live dataset cleared.');
  }

  const immediateCount = recommendations.filter(r => r.urgency === 'immediate' && r.status === 'pending').length;
  const deployedTeams  = teamAllocations.filter(t => t.status === 'deployed').reduce((s, t) => s + t.team_count, 0);

  const deploymentPlan = teamAllocations.map(ta => {
    const summary = zoneSummaries.find(s => s.zone_id === ta.zone_id);
    return {
      zoneId:            ta.zone_id,
      zoneName:          zoneNames[ta.zone_id] ?? ta.zone_id,
      score:             summary?.overall_score ?? 0,
      teams:             ta.team_count,
      expectedReduction: ta.expected_risk_reduction,
      rank:              ta.priority_rank,
    };
  }).sort((a, b) => a.rank - b.rank);

  // Filtered signals for inspector
  const filteredSignals = (signalFilter === 'all'
    ? externalSignals
    : externalSignals.filter(s => s.source === signalFilter)
  ).slice(0, 30);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings2 size={20} className="text-primary" />
            Operations Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Team allocation, signal ingestion, and operational controls
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {immediateCount > 0 && (
            <Badge variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30">
              {immediateCount} Immediate Actions
            </Badge>
          )}
          <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
            {deployedTeams} Teams Deployed
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 border border-border text-muted-foreground hover:bg-accent"
            onClick={refresh}
            disabled={loading || ingesting}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="sr-only md:not-sr-only">Refresh DB</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 border border-primary/40 text-primary hover:bg-primary/10"
            onClick={handleIngest}
            disabled={loading || ingesting || dataMode !== 'live'}
            title={dataMode !== 'live' ? 'Switch to Live mode to ingest signals' : 'Ingest live signals'}
          >
            <Radio size={13} className={ingesting ? 'animate-pulse' : ''} />
            <span className="sr-only md:not-sr-only">{ingesting ? 'Fetching…' : 'Ingest Signals'}</span>
          </Button>
        </div>
      </div>

      {/* Data Mode Panel */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database size={14} className="text-primary" />
            Data Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            <div className="flex-1 space-y-3">
              <DataModeSwitcher variant="full" />
              <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                <span>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
                {dataMode === 'live' && (
                  <>
                    <span>·</span>
                    <span>
                      Last live ingest:{' '}
                      {lastLiveIngestAt
                        ? new Date(lastLiveIngestAt).toLocaleTimeString()
                        : 'never this session'}
                    </span>
                  </>
                )}
              </div>
              {dataMode === 'live' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10"
                  onClick={handleResetLive}
                  disabled={loading || ingesting}
                >
                  <Trash2 size={12} />
                  Clear Live Dataset
                </Button>
              )}
            </div>

            {/* Last ingest result summary */}
            {lastIngestResult && dataMode === 'live' && (
              <div className="shrink-0 rounded-lg border border-border bg-muted/40 p-3 space-y-1.5 text-xs min-w-52">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info size={12} className="text-primary" />
                  Last Ingest
                </p>
                <div className="space-y-1 text-muted-foreground">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1"><Cloud size={11} /> Weather</span>
                    <span className={lastIngestResult.weather.source === 'live' ? 'text-green-400' : 'text-yellow-400'}>
                      {lastIngestResult.weather.source === 'live'
                        ? `${lastIngestResult.weather.signals.length} live`
                        : 'fallback'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1"><Newspaper size={11} /> News</span>
                    <span className={lastIngestResult.news.source === 'live' ? 'text-green-400' : 'text-yellow-400'}>
                      {lastIngestResult.news.source === 'live'
                        ? `${lastIngestResult.news.matched} matched`
                        : 'fallback'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Total new signals</span>
                    <span className="text-foreground font-mono">{lastIngestResult.newSignalCount}</span>
                  </div>
                  {lastIngestResult.errors.length > 0 && (
                    <div className="flex items-start gap-1 text-yellow-400 pt-1">
                      <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                      <span className="text-balance">{lastIngestResult.errors[0]}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabbed main content */}
      <Tabs defaultValue="allocation">
        <TabsList className="mb-4">
          <TabsTrigger value="allocation">Team Allocation</TabsTrigger>
          <TabsTrigger value="signals">Signal Inspector</TabsTrigger>
          <TabsTrigger value="actions">Actions Queue</TabsTrigger>
        </TabsList>

        {/* ── Tab: Team Allocation ───────────────────────────────────────── */}
        <TabsContent value="allocation" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users size={15} className="text-primary" />
                Maintenance Team Optimizer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-4 flex-wrap">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground font-normal">Available Teams</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={availableTeams}
                    onChange={e => setAvailableTeams(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                    className="w-28 font-mono"
                  />
                </div>
                <p className="text-sm text-muted-foreground text-pretty max-w-md">
                  ShadowGrid AI allocates teams to highest-risk zones first for maximum risk reduction.
                  Changing this value instantly recomputes the deployment plan.
                </p>
              </div>

              {deploymentPlan.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead>
                      <tr className="border-b border-border">
                        {['Rank', 'Zone', 'Risk Score', 'Teams', 'Expected Reduction', ''].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-2 px-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {deploymentPlan.map(row => (
                        <tr key={row.zoneId} className="hover:bg-accent/50 transition-colors">
                          <td className="py-2.5 px-3 text-sm font-mono text-muted-foreground whitespace-nowrap">#{row.rank}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-sm font-medium text-foreground">{row.zoneName}</span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <RiskBadge score={row.score} size="sm" />
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-sm font-mono text-foreground">{row.teams}</span>
                            <span className="text-xs text-muted-foreground ml-1">{row.teams === 1 ? 'team' : 'teams'}</span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-sm text-green-400 font-mono">−{row.expectedReduction}</span>
                            <span className="text-xs text-muted-foreground ml-1">pts</span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <Link to={`/zone/${row.zoneId}`} className="text-xs text-primary flex items-center gap-1 hover:text-primary/80">
                              Details <ChevronRight size={11} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {availableTeams === 0
                    ? 'Set available teams above to generate a deployment plan.'
                    : 'No zones currently meet the allocation threshold.'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Current deployments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Current Team Deployments</CardTitle>
            </CardHeader>
            <CardContent>
              {teamAllocations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No active deployments.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead>
                      <tr className="border-b border-border">
                        {['Zone', 'Team Type', 'Count', 'Priority', 'Expected Reduction', 'Status'].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-2 px-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {teamAllocations.map(ta => (
                        <tr key={ta.id} className="hover:bg-accent/50 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <Link to={`/zone/${ta.zone_id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                              {zoneNames[ta.zone_id] ?? ta.zone_id}
                            </Link>
                          </td>
                          <td className="py-2.5 px-3 text-sm text-muted-foreground whitespace-nowrap">{ta.team_type}</td>
                          <td className="py-2.5 px-3 text-sm font-mono text-foreground whitespace-nowrap">{ta.team_count}</td>
                          <td className="py-2.5 px-3 text-sm font-mono text-muted-foreground whitespace-nowrap">#{ta.priority_rank}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="text-sm text-green-400">−{ta.expected_risk_reduction}%</span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <Badge variant="outline" className={
                              ta.status === 'deployed' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                              ta.status === 'planned'  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                                                         'bg-muted text-muted-foreground'
                            }>
                              {ta.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Signal Inspector ──────────────────────────────────────── */}
        <TabsContent value="signals">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Radio size={14} className="text-primary" />
                  External Signal Inspector
                  <Badge variant="outline" className="bg-muted text-muted-foreground font-mono text-xs">
                    {externalSignals.length} total
                  </Badge>
                </CardTitle>
                {/* Source filter */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['all', 'weather', 'news', 'citizen', 'seeded'] as const).map(src => (
                    <button
                      key={src}
                      onClick={() => setSignalFilter(src)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                        signalFilter === src
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                      }`}
                    >
                      {src === 'all' ? 'All' : SOURCE_CONFIG[src]?.label ?? src}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredSignals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No signals match the selected filter.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead>
                      <tr className="border-b border-border">
                        {['Source', 'Title', 'Zone', 'Severity', 'Confidence', 'Keywords', 'Time'].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider py-2 px-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSignals.map(sig => {
                        const srcCfg = SOURCE_CONFIG[sig.source] ?? SOURCE_CONFIG.seeded;
                        return (
                          <tr key={sig.id} className="hover:bg-accent/50 transition-colors">
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`flex items-center gap-1.5 text-xs font-medium ${srcCfg.color}`}>
                                {srcCfg.icon}
                                {srcCfg.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 max-w-xs">
                              <p className="text-sm text-foreground truncate" title={sig.title}>
                                {sig.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate" title={sig.summary}>
                                {sig.summary}
                              </p>
                            </td>
                            <td className="py-2.5 px-3 text-sm text-muted-foreground whitespace-nowrap">
                              {zoneNames[sig.zone_id] ?? sig.zone_id}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <Badge variant="outline" className={
                                sig.severity === 'critical' ? 'bg-red-500/15 text-red-400 border-red-500/30 text-xs' :
                                sig.severity === 'high'     ? 'bg-orange-500/15 text-orange-400 border-orange-500/30 text-xs' :
                                sig.severity === 'medium'   ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-xs' :
                                                              'bg-muted text-muted-foreground text-xs'
                              }>
                                {sig.severity}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-sm font-mono text-muted-foreground whitespace-nowrap">
                              {Math.round(sig.confidence * 100)}%
                            </td>
                            <td className="py-2.5 px-3 max-w-[160px]">
                              <div className="flex flex-wrap gap-1">
                                {sig.detected_keywords.slice(0, 3).map(kw => (
                                  <span key={kw} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                    {kw}
                                  </span>
                                ))}
                                {sig.detected_keywords.length > 3 && (
                                  <span className="text-xs text-muted-foreground">+{sig.detected_keywords.length - 3}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                              {formatTimeAgo(sig.created_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Actions Queue ─────────────────────────────────────────── */}
        <TabsContent value="actions">
          <div className="space-y-3">
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No recommendations generated. Risk scores may be low.
              </p>
            ) : (
              [...recommendations].sort((a, b) => a.priority - b.priority).map(rec => (
                <Card key={rec.id} className={rec.status === 'completed' ? 'opacity-60' : ''}>
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono font-bold text-muted-foreground w-6">#{rec.priority}</span>
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <CategoryIcon category={rec.category} size={15} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <p className={`text-sm font-semibold text-balance ${rec.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {rec.title}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${URGENCY_COLORS[rec.urgency]}`}>
                          {URGENCY_ICONS[rec.urgency]}{rec.urgency}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-pretty">{rec.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <span>{RISK_CATEGORY_LABELS[rec.category]}</span>
                        <span>·</span>
                        <span>{zoneNames[rec.zone_id] ?? rec.zone_id}</span>
                        <span>·</span>
                        <span className="text-green-400">−{rec.expected_impact_reduction}% if completed</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {rec.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/10 text-xs"
                            onClick={() => handleStatusChange(rec.id, 'in_progress')}
                          >
                            Start
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-green-400 border border-green-500/30 hover:bg-green-500/10 text-xs"
                            onClick={() => handleStatusChange(rec.id, 'completed')}
                          >
                            <CheckCircle2 size={12} /> Complete
                          </Button>
                        </>
                      )}
                      {rec.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-green-400 border border-green-500/30 hover:bg-green-500/10 text-xs"
                          onClick={() => handleStatusChange(rec.id, 'completed')}
                        >
                          <CheckCircle2 size={12} /> Mark Done
                        </Button>
                      )}
                      {rec.status === 'completed' && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                          <CheckCircle2 size={10} className="mr-1" /> Done
                        </Badge>
                      )}
                      {rec.status === 'in_progress' && (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30 text-xs">
                          In Progress
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center">
        Use <strong>Ingest Signals</strong> to pull live weather (Open-Meteo) and news (NewsAPI) data.
        Risk scores update automatically after each ingest.
      </p>
    </div>
  );
}
