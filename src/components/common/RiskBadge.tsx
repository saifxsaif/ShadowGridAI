// ShadowGrid AI — Risk badge component

import { getRiskLevel, RISK_LEVEL_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  score: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RiskBadge({ score, showScore = true, size = 'md', className }: RiskBadgeProps) {
  const level = getRiskLevel(score);
  const config = RISK_LEVEL_CONFIG[level];

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border font-medium',
        sizeClasses[size],
        config.bgColor,
        config.color,
        'border-current/30',
        className
      )}
    >
      <span className={cn('inline-block w-1.5 h-1.5 rounded-full bg-current', level === 'critical' && 'risk-critical-pulse')} />
      {config.label}
      {showScore && <span className="opacity-70 font-mono">{Math.round(score)}</span>}
    </span>
  );
}
