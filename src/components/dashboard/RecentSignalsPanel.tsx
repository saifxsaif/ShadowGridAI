// ShadowGrid AI — Recent Signals panel (citizen reports + external signals combined)

import { Cloud, Newspaper, User, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CitizenReport, ExternalSignal, Severity, SignalSource } from '@/types/types';
import { REPORT_TYPE_LABELS } from '@/lib/constants';
import { getSeverityClasses, formatTimeAgo } from '@/lib/uiHelpers';
import { cn } from '@/lib/utils';

type Signal =
  | ({ kind: 'citizen' } & CitizenReport)
  | ({ kind: 'external' } & ExternalSignal);

interface RecentSignalsPanelProps {
  citizenReports: CitizenReport[];
  externalSignals: ExternalSignal[];
  maxItems?: number;
}

const SOURCE_ICON: Record<SignalSource | 'citizen', React.ReactNode> = {
  citizen: <User size={12} />,
  weather: <Cloud size={12} />,
  news:    <Newspaper size={12} />,
  sensor:  <AlertTriangle size={12} />,
  seeded:  <AlertTriangle size={12} />,
};

function SignalRow({ signal }: { signal: Signal }) {
  const severity: Severity = signal.severity as Severity;
  const classes = getSeverityClasses(severity);

  const source: SignalSource = signal.kind === 'citizen' ? 'citizen' : signal.source;
  const title = signal.kind === 'citizen'
    ? REPORT_TYPE_LABELS[signal.report_type]
    : signal.title;
  const sub = signal.kind === 'citizen' ? signal.description : signal.summary;

  return (
    <div className="px-4 py-3 flex gap-3 items-start hover:bg-accent/50 transition-colors">
      {/* Source icon */}
      <div className={cn('flex items-center justify-center w-7 h-7 rounded-lg shrink-0 mt-0.5', classes.bg)}>
        <span className={classes.text}>{SOURCE_ICON[source]}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground leading-tight text-balance">{title}</p>
          <Badge variant="outline" className={cn('text-xs shrink-0 capitalize', classes.badge)}>
            {severity}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sub}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground/70 capitalize flex items-center gap-1">
            {SOURCE_ICON[source]}
            {source}
          </span>
          <span className="text-xs text-muted-foreground/50">·</span>
          <span className="text-xs text-muted-foreground/70 font-mono">
            {formatTimeAgo(signal.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RecentSignalsPanel({ citizenReports, externalSignals, maxItems = 8 }: RecentSignalsPanelProps) {
  const combined: Signal[] = [
    ...citizenReports.map(r => ({ kind: 'citizen' as const, ...r })),
    ...externalSignals.map(s => ({ kind: 'external' as const, ...s })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, maxItems);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
          <span>Recent Signals</span>
          <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Live
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        <div className="divide-y divide-border">
          {combined.map(signal => (
            <SignalRow key={`${signal.kind}-${signal.id}`} signal={signal} />
          ))}
          {combined.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No signals detected</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
