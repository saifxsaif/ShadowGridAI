// ShadowGrid AI — Failure Chain simulation panel

import { ArrowDown, AlertTriangle, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import type { FailureChain } from '@/types/types';
import { getRiskLevel, RISK_LEVEL_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface FailureChainPanelProps {
  chains: FailureChain[];
}

function ProbabilityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'bg-red-400' : pct >= 60 ? 'bg-orange-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-green-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-7 text-right">{pct}%</span>
    </div>
  );
}

export function FailureChainPanel({ chains }: FailureChainPanelProps) {
  const activeChain = chains.find(c => c.is_active) ?? chains[0];
  const allChains = chains.slice(0, 2);

  if (!activeChain) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No active failure chains detected
        </CardContent>
      </Card>
    );
  }

  const levelConfig = RISK_LEVEL_CONFIG[activeChain.overall_risk_level];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Flame size={15} className="text-orange-400" />
          <span>Failure Chain Simulation</span>
          <span className={cn('ml-auto text-xs font-medium px-2 py-0.5 rounded border', levelConfig.bgColor, levelConfig.color, 'border-current/30')}>
            {levelConfig.label} Risk
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {/* Chain selector */}
        {allChains.length > 1 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {allChains.map(chain => (
              <span key={chain.id} className={cn(
                'text-xs px-2 py-1 rounded border cursor-pointer transition-colors',
                chain.id === activeChain.id
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-muted text-muted-foreground border-border hover:bg-accent'
              )}>
                {chain.title}
              </span>
            ))}
          </div>
        )}

        {/* Trigger */}
        <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/25">
          <AlertTriangle size={14} className="text-red-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Trigger</p>
            <p className="text-sm font-medium text-foreground">{activeChain.trigger}</p>
          </div>
        </div>

        {/* Chain steps */}
        <div className="space-y-2">
          {activeChain.steps.map((step, idx) => {
            const isLast = idx === activeChain.steps.length - 1;
            const pct = Math.round(step.probability * 100);
            return (
              <div key={step.step}>
                <div className={cn(
                  'p-3 rounded-lg border transition-colors',
                  pct >= 80 ? 'bg-red-500/8 border-red-500/25' :
                  pct >= 60 ? 'bg-orange-500/8 border-orange-500/25' :
                  pct >= 40 ? 'bg-yellow-500/8 border-yellow-500/25' :
                               'bg-muted/50 border-border'
                )}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-mono text-muted-foreground w-5">S{step.step}</span>
                    <CategoryIcon category={step.category} size={13} />
                    <p className="text-sm font-semibold text-foreground flex-1">{step.event}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 pl-7">{step.description}</p>
                  <div className="pl-7">
                    <ProbabilityBar value={step.probability} />
                  </div>
                </div>
                {!isLast && (
                  <div className="flex justify-center py-1">
                    <ArrowDown size={14} className="text-border" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
