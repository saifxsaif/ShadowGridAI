// ShadowGrid AI — Category Icon component

import {
  Droplets, Construction, Pipette, Zap, Car, Ambulance,
  type LucideProps,
} from 'lucide-react';
import type { RiskCategory } from '@/types/types';
import { getCategoryColor } from '@/lib/uiHelpers';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<RiskCategory, React.ComponentType<LucideProps>> = {
  drainage: Droplets,
  road: Construction,
  water: Pipette,
  power: Zap,
  traffic: Car,
  emergency_access: Ambulance,
};

interface CategoryIconProps {
  category: RiskCategory;
  size?: number;
  colored?: boolean;
  className?: string;
}

export function CategoryIcon({ category, size = 16, colored = true, className }: CategoryIconProps) {
  const Icon = ICON_MAP[category];
  const color = colored ? getCategoryColor(category) : undefined;
  return <Icon size={size} style={color ? { color } : undefined} className={cn(className)} />;
}
