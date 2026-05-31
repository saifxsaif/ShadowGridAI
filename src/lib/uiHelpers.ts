// ShadowGrid AI — shared UI helpers

import type { RiskLevel, RiskCategory, Severity } from '@/types/types';
import { getRiskLevel } from '@/lib/constants';

/** Returns Tailwind color classes for a risk score */
export function getRiskScoreClasses(score: number): {
  text: string;
  bg: string;
  border: string;
  badge: string;
} {
  const level = getRiskLevel(score);
  const map: Record<RiskLevel, { text: string; bg: string; border: string; badge: string }> = {
    critical: { text: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/40',    badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
    high:     { text: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/40', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    medium:   { text: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    low:      { text: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/40',  badge: 'bg-green-500/20 text-green-300 border-green-500/30' },
    normal:   { text: 'text-primary',    bg: 'bg-primary/10',    border: 'border-primary/30',    badge: 'bg-primary/15 text-primary border-primary/25' },
  };
  return map[level];
}

export function getSeverityClasses(severity: Severity): { text: string; bg: string; badge: string } {
  const map: Record<Severity, { text: string; bg: string; badge: string }> = {
    critical: { text: 'text-red-400',    bg: 'bg-red-500/15',    badge: 'bg-red-500/20 text-red-300 border border-red-500/30' },
    high:     { text: 'text-orange-400', bg: 'bg-orange-500/15', badge: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' },
    medium:   { text: 'text-yellow-400', bg: 'bg-yellow-500/15', badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' },
    low:      { text: 'text-green-400',  bg: 'bg-green-500/15',  badge: 'bg-green-500/20 text-green-300 border border-green-500/30' },
  };
  return map[severity];
}

export function getCategoryColor(category: RiskCategory): string {
  const map: Record<RiskCategory, string> = {
    drainage: '#22d3ee',
    road: '#f97316',
    water: '#60a5fa',
    power: '#facc15',
    traffic: '#a78bfa',
    emergency_access: '#f43f5e',
  };
  return map[category];
}

export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function formatScore(score: number): string {
  return Math.round(score).toString().padStart(2, '0');
}
