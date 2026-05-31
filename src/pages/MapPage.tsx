// ShadowGrid AI — Full-screen interactive City Risk Map page
// Category filter tabs + zone polygon overlay + side-panel drill-down.

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Map as LeafletMap, Polygon, CircleMarker } from 'leaflet';
import { Layers, RefreshCw, Info, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZoneSidePanel } from '@/components/map/ZoneSidePanel';
import { useAppStore } from '@/store/AppContext';
import {
  RISK_CATEGORY_LABELS,
  getRiskColor,
  getRiskLevel,
  RISK_LEVEL_CONFIG,
  DEMO_CITY_CONFIG,
} from '@/lib/constants';
import { getCategoryColor } from '@/lib/uiHelpers';
import type { RiskCategory, ZoneRiskSummary } from '@/types/types';
import 'leaflet/dist/leaflet.css';

type FilterCategory = 'overall' | RiskCategory;

const FILTER_TABS: { value: FilterCategory; label: string }[] = [
  { value: 'overall',         label: 'Overall' },
  { value: 'drainage',        label: 'Drainage' },
  { value: 'road',            label: 'Road' },
  { value: 'water',           label: 'Water' },
  { value: 'power',           label: 'Power' },
  { value: 'traffic',         label: 'Traffic' },
  { value: 'emergency_access', label: 'Emergency' },
];

function getScoreForFilter(summary: ZoneRiskSummary, filter: FilterCategory): number {
  if (filter === 'overall') return summary.overall_score;
  return summary.scores_by_category[filter] ?? 0;
}

export default function MapPage() {
  const { zones, zoneSummaries, loading, refresh, ingesting, dataModeLabel } = useAppStore();
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('overall');
  const [legendVisible, setLegendVisible] = useState(true);

  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const polygonsRef = useRef<Map<string, Polygon | CircleMarker>>(new Map());

  // Color resolver for any filter
  const resolveColor = useCallback((zoneId: string, filter: FilterCategory): string => {
    const summary = zoneSummaries.find(s => s.zone_id === zoneId);
    if (!summary) return '#64748b';
    const score = getScoreForFilter(summary, filter);
    if (filter === 'overall') return getRiskColor(score);
    // Category-specific: tint the category color by score intensity
    const baseColor = getCategoryColor(filter);
    const opacity = Math.max(0.25, score / 100);
    return score < 10 ? '#1e293b' : `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  }, [zoneSummaries]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then(L => {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [DEMO_CITY_CONFIG.lat, DEMO_CITY_CONFIG.lng],
        zoom: DEMO_CITY_CONFIG.zoom,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        className: 'map-tiles-dark',
      }).addTo(map);

      // Attribution in a non-intrusive spot
      L.control.attribution({ position: 'bottomleft', prefix: '' })
        .addAttribution('© <a href="https://openstreetmap.org">OSM</a>')
        .addTo(map);

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        polygonsRef.current.clear();
      }
    };
  }, []);

  // Draw / update polygons when zones or filter changes
  useEffect(() => {
    if (!mapRef.current || zones.length === 0) return;

    import('leaflet').then(L => {
      if (!mapRef.current) return;

      // Remove existing polygons
      polygonsRef.current.forEach(poly => poly.remove());
      polygonsRef.current.clear();

      zones.forEach(zone => {
        const summary = zoneSummaries.find(s => s.zone_id === zone.id);
        const score = summary ? getScoreForFilter(summary, activeFilter) : 0;
        const overallScore = summary?.overall_score ?? 0;
        const level = getRiskLevel(overallScore);
        const levelLabel = RISK_LEVEL_CONFIG[level].label;
        const levelColor = RISK_LEVEL_CONFIG[level].color.replace('text-', '').replace('-400', '');

        const fillColor = resolveColor(zone.id, activeFilter);
        const isSelected = zone.id === selectedZoneId;

        const popupContent = `
          <div style="font-family:system-ui,sans-serif;min-width:160px;background:#0f172a;border-radius:8px;padding:2px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#e2e8f0;">${zone.name}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <span style="font-size:22px;font-weight:800;font-family:monospace;color:${fillColor};">${Math.round(score)}</span>
              <span style="font-size:11px;background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;color:#e2e8f0;">${levelLabel}</span>
            </div>
            ${activeFilter !== 'overall'
              ? `<div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">${RISK_CATEGORY_LABELS[activeFilter as RiskCategory]}: <b style="color:${fillColor}">${Math.round(score)}</b></div>`
              : ''}
            <div style="font-size:11px;color:#64748b;">Click to inspect zone →</div>
          </div>
        `;

        if (zone.polygon && zone.polygon.length >= 3) {
          const poly = L.polygon(zone.polygon as [number, number][], {
            fillColor,
            fillOpacity: isSelected ? 0.65 : 0.40,
            color: isSelected ? '#00d9ff' : fillColor,
            weight: isSelected ? 3 : 1.5,
            opacity: 0.85,
          });

          poly.bindPopup(popupContent, {
            maxWidth: 240,
            className: 'shadowgrid-popup',
          });

          poly.on('click', () => {
            setSelectedZoneId(prev => prev === zone.id ? undefined : zone.id);
          });
          poly.on('mouseover', () => poly.setStyle({ fillOpacity: 0.60, weight: 2.5 }));
          poly.on('mouseout', () => poly.setStyle({ fillOpacity: isSelected ? 0.65 : 0.40, weight: isSelected ? 3 : 1.5 }));

          poly.addTo(mapRef.current!);
          polygonsRef.current.set(zone.id, poly);
        } else {
          // Fallback: circle marker for zones without polygon data
          const marker = L.circleMarker([zone.lat, zone.lng], {
            radius: 14,
            fillColor,
            fillOpacity: 0.55,
            color: isSelected ? '#00d9ff' : fillColor,
            weight: isSelected ? 3 : 2,
          });
          marker.bindPopup(popupContent, { maxWidth: 240, className: 'shadowgrid-popup' });
          marker.on('click', () => setSelectedZoneId(prev => prev === zone.id ? undefined : zone.id));
          marker.addTo(mapRef.current!);
          polygonsRef.current.set(zone.id, marker);
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, zoneSummaries, activeFilter, selectedZoneId]);

  const criticalCount = zoneSummaries.filter(s => s.risk_level === 'critical').length;
  const highCount     = zoneSummaries.filter(s => s.risk_level === 'high').length;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-background/95 backdrop-blur-sm flex-wrap">
        {/* Title + count chips */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Layers size={15} className="text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground hidden sm:block">City Risk Map</span>
          {criticalCount > 0 && (
            <Badge className="text-[10px] h-5 bg-red-500/20 text-red-300 border border-red-500/30 ml-1">
              {criticalCount} critical
            </Badge>
          )}
          {highCount > 0 && (
            <Badge className="text-[10px] h-5 bg-orange-500/20 text-orange-300 border border-orange-500/30">
              {highCount} high
            </Badge>
          )}
        </div>

        {/* Category filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-nowrap">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={[
                'shrink-0 text-xs px-2.5 py-1 rounded-md font-medium transition-all',
                activeFilter === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1.5 border border-border text-muted-foreground hover:bg-accent"
            onClick={() => refresh()}
            disabled={ingesting || loading}
          >
            <RefreshCw size={11} className={(ingesting || loading) ? 'animate-spin' : ''} />
            <span className="hidden sm:block">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Map + Side panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Map container */}
        <div className="flex-1 min-w-0 relative">
          <div ref={containerRef} className="w-full h-full" />

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-10">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-sm text-foreground">
                <RefreshCw size={14} className="animate-spin text-primary" />
                Loading city data…
              </div>
            </div>
          )}

          {/* Click-to-select hint (no zone selected) */}
          {!selectedZoneId && !loading && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/90 border border-border text-xs text-muted-foreground backdrop-blur-sm shadow-md">
                <Info size={11} />
                Click any zone to inspect
              </div>
            </div>
          )}

          {/* Legend toggle + panel */}
          <div className="absolute top-3 right-3 z-10">
            <button
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-background/90 border border-border text-xs text-muted-foreground backdrop-blur-sm shadow-sm hover:bg-accent transition-colors"
              onClick={() => setLegendVisible(v => !v)}
            >
              Legend <ChevronDown size={11} className={`transition-transform ${legendVisible ? 'rotate-180' : ''}`} />
            </button>
            {legendVisible && (
              <div className="mt-1.5 p-2.5 rounded-lg bg-background/95 border border-border backdrop-blur-sm shadow-md min-w-[120px]">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {activeFilter === 'overall' ? 'Risk Level' : RISK_CATEGORY_LABELS[activeFilter as RiskCategory]}
                </p>
                {activeFilter === 'overall' ? (
                  [
                    { color: '#ef4444', label: 'Critical (≥80)' },
                    { color: '#f97316', label: 'High (≥60)' },
                    { color: '#eab308', label: 'Medium (≥40)' },
                    { color: '#22c55e', label: 'Low (<40)' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-sm shrink-0 border border-white/10" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] text-muted-foreground">{item.label}</span>
                    </div>
                  ))
                ) : (
                  [
                    { opacity: '80%', label: 'High intensity' },
                    { opacity: '50%', label: 'Moderate' },
                    { opacity: '25%', label: 'Low activity' },
                    { opacity: '5%',  label: 'No data' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2 mb-1">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0 border border-white/10"
                        style={{ backgroundColor: getCategoryColor(activeFilter as RiskCategory), opacity: item.opacity }}
                      />
                      <span className="text-[11px] text-muted-foreground">{item.label}</span>
                    </div>
                  ))
                )}
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground">Mode: {dataModeLabel}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Zone side panel */}
        {selectedZoneId && (
          <div className="w-72 md:w-80 shrink-0 overflow-y-auto border-l border-border bg-card">
            <ZoneSidePanel zoneId={selectedZoneId} onClose={() => setSelectedZoneId(undefined)} />
          </div>
        )}
      </div>
    </div>
  );
}
