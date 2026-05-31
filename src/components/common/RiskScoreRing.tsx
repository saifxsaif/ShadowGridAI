// ShadowGrid AI — Risk Score Ring (circular progress indicator)

import { getRiskLevel, RISK_LEVEL_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface RiskScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export function RiskScoreRing({ score, size = 80, strokeWidth = 6, label, className }: RiskScoreRingProps) {
  const level = getRiskLevel(score);
  const config = RISK_LEVEL_CONFIG[level];
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const colorMap: Record<string, string> = {
    'text-red-400': '#f87171',
    'text-orange-400': '#fb923c',
    'text-yellow-400': '#facc15',
    'text-green-400': '#4ade80',
    'text-primary': '#00d9ff',
  };
  const strokeColor = colorMap[config.color] ?? '#00d9ff';

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(222 18% 22%)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-mono font-bold leading-none', config.color, size >= 80 ? 'text-lg' : 'text-sm')}>
          {Math.round(score)}
        </span>
      </div>
      {label && (
        <span className="mt-1 text-xs text-muted-foreground text-center leading-tight">{label}</span>
      )}
    </div>
  );
}
