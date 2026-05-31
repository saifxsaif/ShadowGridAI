// ShadowGrid AI — Recommendations panel

import { CheckCircle2, Clock, Zap, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import type { Recommendation } from '@/types/types';
import { ACTION_TYPE_LABELS, RISK_CATEGORY_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const URGENCY_CONFIG = {
  immediate: { label: 'Immediate', color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', icon: <Zap size={11} /> },
  urgent:    { label: 'Urgent',    color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30', icon: <ArrowUpRight size={11} /> },
  scheduled: { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30', icon: <Clock size={11} /> },
};

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: 'text-muted-foreground', bg: 'bg-muted/50' },
  in_progress: { label: 'In Progress', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  completed:   { label: 'Completed',   color: 'text-green-400', bg: 'bg-green-500/10' },
};

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  maxItems?: number;
  showZoneName?: boolean;
  zoneNames?: Record<string, string>;
}

export function RecommendationsPanel({ recommendations, maxItems = 5, showZoneName, zoneNames }: RecommendationsPanelProps) {
  const sorted = [...recommendations]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxItems);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
          <span>Preventive Actions</span>
          <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/30">
            {sorted.filter(r => r.urgency === 'immediate').length} Immediate
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        <div className="divide-y divide-border">
          {sorted.map(rec => {
            const urgency = URGENCY_CONFIG[rec.urgency];
            const status = STATUS_CONFIG[rec.status];
            return (
              <div key={rec.id} className="px-4 py-3 flex gap-3 items-start">
                {/* Priority */}
                <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                  <span className="text-xs font-mono font-bold text-muted-foreground w-5 text-center">
                    #{rec.priority}
                  </span>
                  {rec.status === 'completed' && <CheckCircle2 size={14} className="text-green-400" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className={cn('text-sm font-medium leading-tight text-balance', rec.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground')}>
                      {rec.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className={cn('inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border font-medium', urgency.color, urgency.bg)}>
                      {urgency.icon}{urgency.label}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CategoryIcon category={rec.category} size={11} />
                      {RISK_CATEGORY_LABELS[rec.category]}
                    </span>
                    {showZoneName && zoneNames?.[rec.zone_id] && (
                      <span className="text-xs text-muted-foreground/70">· {zoneNames[rec.zone_id]}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={cn('text-xs font-medium', status.color)}>{status.label}</span>
                    <span className="text-xs text-muted-foreground/70">
                      −{rec.expected_impact_reduction}% risk if completed
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {sorted.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No recommendations active</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
