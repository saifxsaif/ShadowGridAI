// ShadowGrid AI — Highest Risk Zones panel

import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskBadge } from '@/components/common/RiskBadge';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { RISK_CATEGORY_LABELS } from '@/lib/constants';
import type { ZoneRiskSummary } from '@/types/types';
import { cn } from '@/lib/utils';

interface HighRiskZonesPanelProps {
  summaries: ZoneRiskSummary[];
  onZoneClick?: (zoneId: string) => void;
  selectedZoneId?: string;
}

const TREND_ICON = {
  rising:  <TrendingUp size={12} className="text-red-400" />,
  stable:  <Minus size={12} className="text-muted-foreground" />,
  falling: <TrendingDown size={12} className="text-green-400" />,
};

export function HighRiskZonesPanel({ summaries, onZoneClick, selectedZoneId }: HighRiskZonesPanelProps) {
  const sorted = [...summaries].sort((a, b) => b.overall_score - a.overall_score).slice(0, 6);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
          <span>Highest Risk Zones</span>
          <span className="text-xs font-normal text-muted-foreground">{sorted.length} zones</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        <div className="divide-y divide-border">
          {sorted.map((zone, idx) => (
            <button
              key={zone.zone_id}
              type="button"
              onClick={() => onZoneClick?.(zone.zone_id)}
              className={cn(
                'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-accent',
                selectedZoneId === zone.zone_id && 'bg-primary/10 border-l-2 border-primary'
              )}
            >
              {/* Rank */}
              <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
                {idx + 1}
              </span>

              {/* Zone info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{zone.zone_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CategoryIcon category={zone.top_category} size={11} />
                  <span className="text-xs text-muted-foreground truncate">
                    {RISK_CATEGORY_LABELS[zone.top_category]}
                  </span>
                  {TREND_ICON[zone.trend]}
                </div>
              </div>

              {/* Score & badge */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <RiskBadge score={zone.overall_score} size="sm" />
              </div>
            </button>
          ))}
        </div>

        {/* View all link */}
        <div className="px-4 py-3 border-t border-border">
          <Link
            to="/analytics"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            View full analytics <ArrowRight size={12} />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
