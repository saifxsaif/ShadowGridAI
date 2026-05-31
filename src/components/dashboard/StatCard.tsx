// ShadowGrid AI — Summary stat card

import { type LucideProps } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ComponentType<LucideProps>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'critical' | 'warning' | 'success' | 'info';
  className?: string;
}

const VARIANT_STYLES = {
  default:  { card: 'border-border',           icon: 'bg-primary/15 text-primary',       value: 'text-foreground' },
  critical: { card: 'border-red-500/40',        icon: 'bg-red-500/15 text-red-400',       value: 'text-red-400' },
  warning:  { card: 'border-orange-500/40',     icon: 'bg-orange-500/15 text-orange-400', value: 'text-orange-400' },
  success:  { card: 'border-green-500/40',      icon: 'bg-green-500/15 text-green-400',   value: 'text-green-400' },
  info:     { card: 'border-primary/30',        icon: 'bg-primary/15 text-primary',       value: 'text-primary' },
};

export function StatCard({ label, value, subtext, icon: Icon, trend, trendValue, variant = 'default', className }: StatCardProps) {
  const styles = VARIANT_STYLES[variant];
  return (
    <Card className={cn('h-full', styles.card, className)}>
      <CardContent className="p-4 flex flex-col gap-3 h-full">
        <div className="flex items-start justify-between">
          <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg shrink-0', styles.icon)}>
            <Icon size={18} />
          </div>
          {trend && trendValue && (
            <span className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded',
              trend === 'up'   ? 'bg-red-500/15 text-red-400' :
              trend === 'down' ? 'bg-green-500/15 text-green-400' :
                                 'bg-muted text-muted-foreground'
            )}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </span>
          )}
        </div>
        <div className="flex-1 flex flex-col justify-end">
          <p className={cn('text-2xl md:text-3xl font-bold font-mono leading-none', styles.value)}>{value}</p>
          <p className="text-sm text-muted-foreground mt-1 text-balance">{label}</p>
          {subtext && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
