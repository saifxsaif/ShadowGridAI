// ShadowGrid AI — Zone drill-down side panel
// Shown on the Map page when a zone polygon is clicked.
// Displays: score, level, top contributing factors, latest signals,
// top recommendation, and failure chain preview.

import { X, MapPin, TrendingUp, TrendingDown, Minus, Radio, AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RiskBadge } from '@/components/common/RiskBadge';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { RiskScoreRing } from '@/components/common/RiskScoreRing';
import { useAppStore } from '@/store/AppContext';
import {
  RISK_CATEGORY_LABELS,
  getRiskLevel,
  RISK_LEVEL_CONFIG,
} from '@/lib/constants';
import { getRiskScoreClasses, getSeverityClasses, formatTimeAgo } from '@/lib/uiHelpers';
import type { RiskCategory } from '@/types/types';

const ALL_CATEGORIES: RiskCategory[] = ['drainage', 'road', 'water', 'power', 'traffic', 'emergency_access'];

interface ZoneSidePanelProps {
  zoneId: string;
  onClose: () => void;
}

export function ZoneSidePanel({ zoneId, onClose }: ZoneSidePanelProps) {
  const {
    getZoneById,
    getRiskScoresForZone,
    getExplanationForZone,
    getZoneSummary,
    citizenReports,
    externalSignals,
    recommendations,
    failureChains,
  } = useAppStore();

  const zone = getZoneById(zoneId);
  const riskScores = getRiskScoresForZone(zoneId);
  const explanation = getExplanationForZone(zoneId);
  const summary = getZoneSummary(zoneId);

  const zoneReports = citizenReports.filter(r => r.zone_id === zoneId).slice(0, 3);
  const zoneSignals = externalSignals.filter(s => s.zone_id === zoneId).slice(0, 3);
  const zoneRecs = recommendations.filter(r => r.zone_id === zoneId).slice(0, 2);
  const zoneChain = failureChains.find(fc => fc.trigger_zone_id === zoneId);

  const overallScore = summary?.overall_score ?? 0;
  const level = getRiskLevel(overallScore);
  const levelCfg = RISK_LEVEL_CONFIG[level];
  const riskClasses = getRiskScoreClasses(overallScore);

  const trend = summary?.trend ?? 'stable';
  const TrendIcon = trend === 'rising' ? TrendingUp : trend === 'falling' ? TrendingDown : Minus;
  const trendColor = trend === 'rising' ? 'text-red-400' : trend === 'falling' ? 'text-green-400' : 'text-muted-foreground';

  if (!zone) return null;

  return (
    <div className="flex flex-col h-full bg-card border-l border-border overflow-y-auto">
      {/* Header */}
      <div className={`px-4 py-4 border-b border-border ${riskClasses.bg}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin size={11} className="text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{zone.city}</span>
            </div>
            <h2 className="text-base font-bold text-foreground text-balance leading-tight">{zone.name}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={onClose}
          >
            <X size={14} />
          </Button>
        </div>

        {/* Score + level */}
        <div className="flex items-center gap-3 mt-3">
          <RiskScoreRing score={overallScore} size={56} strokeWidth={5} />
          <div>
            <RiskBadge score={overallScore} size="sm" />
            <div className={`flex items-center gap-1 mt-1 text-xs ${trendColor}`}>
              <TrendIcon size={11} />
              <span className="capitalize">{trend}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-5 overflow-y-auto">

        {/* Explanation */}
        {explanation && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Why This Zone Is At Risk
            </p>
            <p className="text-xs text-muted-foreground text-pretty leading-relaxed bg-muted/30 rounded-md p-2.5 border border-border">
              {explanation.summary}
            </p>
          </div>
        )}

        {/* Category breakdown */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Risk by Category
          </p>
          <div className="space-y-1.5">
            {ALL_CATEGORIES.map(cat => {
              const catScore = summary?.scores_by_category[cat] ?? 0;
              if (catScore < 5) return null;
              const catLevel = getRiskLevel(catScore);
              const catCfg = RISK_LEVEL_CONFIG[catLevel];
              const isTop = summary?.top_category === cat;
              return (
                <div key={cat} className="flex items-center gap-2">
                  <CategoryIcon category={cat} size={12} className="shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-foreground truncate">{RISK_CATEGORY_LABELS[cat]}</span>
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        {isTop && (
                          <span className="text-[10px] text-primary font-medium">Top</span>
                        )}
                        <span className={`text-xs font-mono font-bold ${catCfg.color}`}>{Math.round(catScore)}</span>
                      </div>
                    </div>
                    <div className="w-full h-1 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${catScore}%`, backgroundColor: catCfg.color.replace('text-', '#').replace('-400', '') }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top contributing factors from explanation */}
        {explanation && explanation.contributingFactors.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Top Contributing Factors
            </p>
            <div className="space-y-1.5">
              {explanation.contributingFactors.slice(0, 3).map((factor: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                  <span className="text-muted-foreground text-pretty">{factor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Latest citizen reports */}
        {zoneReports.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Recent Citizen Reports
            </p>
            <div className="space-y-2">
              {zoneReports.map(report => {
                const sev = getSeverityClasses(report.severity);
                return (
                  <div key={report.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/30 border border-border">
                    <AlertTriangle size={11} className={`shrink-0 mt-0.5 ${sev.text}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">{report.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{formatTimeAgo(report.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Latest external signals */}
        {zoneSignals.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              External Signals
            </p>
            <div className="space-y-2">
              {zoneSignals.map(signal => {
                const sev = getSeverityClasses(signal.severity);
                return (
                  <div key={signal.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/30 border border-border">
                    <Radio size={11} className={`shrink-0 mt-0.5 ${sev.text}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">{signal.title ?? signal.signal_type}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={`text-[10px] h-4 ${sev.badge}`}>
                          {signal.source}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{formatTimeAgo(signal.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top recommendation */}
        {zoneRecs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Recommended Actions
            </p>
            <div className="space-y-2">
              {zoneRecs.map((rec, i) => (
                <div key={rec.id} className="p-2.5 rounded-md border border-border bg-muted/20">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 w-4 h-4 rounded bg-primary/20 text-primary text-[10px] flex items-center justify-center font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground text-balance">{rec.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 text-pretty">{rec.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className="text-[10px] h-4 bg-primary/10 text-primary border-primary/30">
                          {rec.urgency}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          −{rec.expected_impact_reduction}% risk
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failure chain preview */}
        {zoneChain && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Failure Chain Risk
            </p>
            <div className="p-2.5 rounded-md border border-red-500/25 bg-red-500/10">
              <p className="text-xs font-medium text-red-300 mb-2">{zoneChain.title}</p>
              <div className="space-y-1">
                {zoneChain.steps.slice(0, 3).map((step, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="shrink-0 text-[10px] font-mono text-red-400">→</span>
                    <span className="truncate">{step.event}</span>
                    <span className="shrink-0 text-[10px] font-mono text-muted-foreground ml-auto">
                      {Math.round(step.probability * 100)}%
                    </span>
                  </div>
                ))}
                {zoneChain.steps.length > 3 && (
                  <p className="text-[10px] text-muted-foreground pl-4">+{zoneChain.steps.length - 3} more steps</p>
                )}
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Full zone details CTA */}
        <Button
          asChild
          size="sm"
          className="w-full gap-1.5"
        >
          <Link to={`/zone/${zoneId}`}>
            Full Zone Analysis <ChevronRight size={13} />
          </Link>
        </Button>
      </div>
    </div>
  );
}
