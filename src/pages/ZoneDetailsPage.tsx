// ShadowGrid AI — Zone Details Page
// Uses AppContext for computed risk scores and engine-generated explanations.

import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, AlertTriangle, Info, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RiskScoreRing } from '@/components/common/RiskScoreRing';
import { RiskBadge } from '@/components/common/RiskBadge';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { RecommendationsPanel } from '@/components/dashboard/RecommendationsPanel';
import { RecentSignalsPanel } from '@/components/dashboard/RecentSignalsPanel';
import { AiZoneInsight } from '@/components/common/AiZoneInsight';
import { useAppStore } from '@/store/AppContext';
import { RISK_CATEGORY_LABELS, RISK_WEIGHTS } from '@/lib/constants';
import { getRiskLevel, RISK_LEVEL_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { RiskCategory } from '@/types/types';

const ALL_CATEGORIES: RiskCategory[] = [
  'drainage', 'road', 'water', 'power', 'traffic', 'emergency_access',
];

export default function ZoneDetailsPage() {
  const { zoneId } = useParams<{ zoneId: string }>();

  const {
    loading,
    getZoneById,
    getRiskScoresForZone,
    getExplanationForZone,
    recommendations,
    citizenReports,
    externalSignals,
  } = useAppStore();

  const zone = zoneId ? getZoneById(zoneId) : null;
  const riskScores = zoneId ? getRiskScoresForZone(zoneId) : [];
  const explanation = zoneId ? getExplanationForZone(zoneId) : undefined;

  const filteredReports = citizenReports.filter(r => r.zone_id === zoneId);
  const filteredSignals = externalSignals.filter(s => s.zone_id === zoneId);
  const zoneRecommendations = recommendations.filter(r => r.zone_id === zoneId);

  // Compute overall score as weighted average of category scores
  const overallScore = riskScores.length > 0
    ? Math.round(riskScores.reduce((sum, rs) => sum + rs.score, 0) / riskScores.length)
    : 0;

  const topRiskScore = [...riskScores].sort((a, b) => b.score - a.score)[0];
  const levelConfig = RISK_LEVEL_CONFIG[getRiskLevel(overallScore)];

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48 bg-muted" />
        <Skeleton className="h-40 bg-muted" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 bg-muted" />)}
        </div>
      </div>
    );
  }

  if (!zone) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-muted-foreground">Zone not found.</p>
        <Button asChild variant="ghost" size="sm" className="mt-3">
          <Link to="/dashboard"><ArrowLeft size={14} /> Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground border border-border hover:bg-accent">
          <Link to="/dashboard"><ArrowLeft size={14} /> Dashboard</Link>
        </Button>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-sm text-foreground font-medium">{zone.name}</span>
      </div>

      {/* Zone hero */}
      <Card className={cn('border', `border-${levelConfig.color.replace('text-', '')}/40`)}>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Score ring */}
            <div className="flex items-center gap-4 shrink-0">
              <RiskScoreRing score={overallScore} size={96} strokeWidth={8} label="Overall Risk" />
            </div>

            {/* Zone info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-foreground text-balance">{zone.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin size={13} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{zone.city}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-sm text-muted-foreground capitalize">{zone.population_density} density</span>
                  </div>
                </div>
                <RiskBadge score={overallScore} size="lg" />
              </div>

              {/* Zone metrics */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                {[
                  { label: 'Vulnerability',     value: zone.vulnerability_score },
                  { label: 'Flood Sensitivity', value: zone.flood_sensitivity },
                  { label: 'Historical Failure', value: zone.historical_failure_rate },
                ].map(metric => (
                  <div key={metric.label}>
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full',
                            metric.value >= 70 ? 'bg-red-400' :
                            metric.value >= 50 ? 'bg-orange-400' :
                            metric.value >= 30 ? 'bg-yellow-400' :
                            'bg-green-400'
                          )}
                          style={{ width: `${metric.value}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-foreground w-6">{metric.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {zone.infrastructure_notes && (
                <div className="flex gap-2 mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                  <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground text-pretty">{zone.infrastructure_notes}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk scores by category — from computed engine */}
      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Risk by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ALL_CATEGORIES.map(cat => {
            const rs = riskScores.find(r => r.category === cat);
            const score = rs?.score ?? 0;
            const level = getRiskLevel(score);
            const cfg = RISK_LEVEL_CONFIG[level];
            return (
              <Card key={cat} className={cn('h-full', score >= 60 ? 'border-current/30' : 'border-border')}>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={cat} size={15} />
                      <span className="text-xs font-medium text-foreground">{RISK_CATEGORY_LABELS[cat]}</span>
                    </div>
                    <span className={cn('text-xl font-bold font-mono', cfg.color)}>{score}</span>
                  </div>

                  {/* Component breakdown — shows engine scoring transparency */}
                  {rs ? (
                    <div className="space-y-1.5">
                      {([
                        ['Citizen',     rs.citizen_component,     RISK_WEIGHTS.citizen],
                        ['Weather',     rs.weather_component,     RISK_WEIGHTS.weather],
                        ['Signals',     rs.signal_component,      RISK_WEIGHTS.signal],
                        ['Historical',  rs.historical_component,  RISK_WEIGHTS.historical],
                        ['Propagation', rs.propagation_component, RISK_WEIGHTS.propagation],
                      ] as const).map(([lbl, val, wt]) => (
                        <div key={String(lbl)} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground/70 w-20 shrink-0">{String(lbl)}</span>
                          <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/60"
                              style={{ width: `${Number(val)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-6 text-right">{Math.round(Number(val))}</span>
                          <span className="text-xs text-muted-foreground/50 w-7">×{Number(wt)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No active signals</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Engine-generated explanation panel */}
      {explanation && (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-400" />
            Risk Explanation
          </h2>
          <Card className="border-orange-500/30">
            <CardContent className="p-4 space-y-4">
              {/* Summary */}
              <p className="text-sm text-foreground text-pretty leading-relaxed font-medium">
                {explanation.summary}
              </p>

              {/* Primary risk driver */}
              {explanation.primaryRisk && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40">
                  <CategoryIcon category={explanation.primaryRisk.category} size={14} className="mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground text-pretty">
                    {explanation.primaryRisk.driverSentence}
                  </p>
                </div>
              )}

              {/* Contributing factors */}
              {explanation.contributingFactors.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Contributing Factors</p>
                  <ul className="space-y-1">
                    {explanation.contributingFactors.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-primary mt-1 text-xs">›</span>
                        <span className="text-xs text-muted-foreground text-pretty">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Propagation note */}
              {explanation.propagationNote && (
                <div className="flex gap-2 p-3 rounded-lg bg-primary/8 border border-primary/20">
                  <Info size={13} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground text-pretty">{explanation.propagationNote}</p>
                </div>
              )}

              {/* Watch points */}
              {explanation.watchPoints.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <BookOpen size={12} className="text-muted-foreground" />
                    Watch Points
                  </p>
                  <ul className="space-y-1">
                    {explanation.watchPoints.map((wp, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="text-yellow-400 mt-0.5">●</span>
                        {wp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Fallback: use top score explanation if no structured explanation */}
      {!explanation && topRiskScore && (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-400" />
            Risk Explanation
          </h2>
          <Card className="border-orange-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CategoryIcon category={topRiskScore.category} size={14} />
                <span className="text-sm font-medium text-foreground">{RISK_CATEGORY_LABELS[topRiskScore.category]}</span>
                <RiskBadge score={topRiskScore.score} size="sm" />
              </div>
              <p className="text-sm text-muted-foreground text-pretty leading-relaxed">{topRiskScore.explanation}</p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* AI (Gemini) explanation layer — on-demand LLM insight */}
      <section>
        <AiZoneInsight zone={zone} />
      </section>

      {/* Recommendations + Signals */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="min-h-[300px]">
          <RecommendationsPanel recommendations={zoneRecommendations} maxItems={4} />
        </div>
        <div className="min-h-[300px]">
          <RecentSignalsPanel
            citizenReports={filteredReports}
            externalSignals={filteredSignals}
            maxItems={6}
          />
        </div>
      </section>
    </div>
  );
}
