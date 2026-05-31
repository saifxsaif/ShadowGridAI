// ShadowGrid AI — Interactive Leaflet city risk map
// Uses leaflet with zone polygons color-coded by risk score

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Polygon } from 'leaflet';
import type { Zone } from '@/types/types';
import type { ZoneRiskSummary } from '@/types/types';
import { getRiskColor, getRiskLevel, RISK_LEVEL_CONFIG } from '@/lib/constants';
import { RISK_CATEGORY_LABELS, DEMO_CITY_CONFIG } from '@/lib/constants';
import 'leaflet/dist/leaflet.css';

interface CityRiskMapProps {
  zones: Zone[];
  riskSummaries: ZoneRiskSummary[];
  selectedZoneId?: string;
  onZoneClick?: (zoneId: string) => void;
  height?: string;
}

export function CityRiskMap({ zones, riskSummaries, selectedZoneId, onZoneClick, height = '100%' }: CityRiskMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const polygonsRef = useRef<Map<string, Polygon>>(new Map());

  const getRiskForZone = (zoneId: string) =>
    riskSummaries.find(r => r.zone_id === zoneId)?.overall_score ?? 0;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Lazy import Leaflet to avoid SSR issues
    import('leaflet').then(L => {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [DEMO_CITY_CONFIG.lat, DEMO_CITY_CONFIG.lng],
        zoom: DEMO_CITY_CONFIG.zoom,
        zoomControl: true,
        attributionControl: false,
      });

      // OpenStreetMap tile layer (filtered dark in CSS)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map);

      // Draw zone polygons
      zones.forEach(zone => {
        if (!zone.polygon || zone.polygon.length < 3) return;
        const score = getRiskForZone(zone.id);
        const color = getRiskColor(score);
        const level = getRiskLevel(score);
        const levelLabel = RISK_LEVEL_CONFIG[level].label;
        const topCat = riskSummaries.find(r => r.zone_id === zone.id)?.top_category;

        const poly = L.polygon(zone.polygon as [number, number][], {
          fillColor: color,
          fillOpacity: 0.35,
          color: zone.id === selectedZoneId ? '#00d9ff' : color,
          weight: zone.id === selectedZoneId ? 2.5 : 1.5,
          opacity: 0.8,
        });

        const popupContent = `
          <div style="font-family: system-ui, sans-serif; min-width: 160px;">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; color: #e2e8f0;">${zone.name}</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 20px; font-weight: 800; font-family: monospace; color: ${color};">${Math.round(score)}</span>
              <span style="font-size: 11px; color: ${color}; font-weight: 600;">${levelLabel}</span>
            </div>
            ${topCat ? `<div style="font-size: 11px; color: #94a3b8;">Top risk: ${RISK_CATEGORY_LABELS[topCat]}</div>` : ''}
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Click to view details</div>
          </div>
        `;

        poly.bindPopup(popupContent, { maxWidth: 240 });

        poly.on('click', () => {
          onZoneClick?.(zone.id);
        });

        poly.on('mouseover', () => {
          poly.setStyle({ fillOpacity: 0.55, weight: 2.5 });
        });

        poly.on('mouseout', () => {
          poly.setStyle({
            fillOpacity: 0.35,
            weight: zone.id === selectedZoneId ? 2.5 : 1.5,
          });
        });

        poly.addTo(map);
        polygonsRef.current.set(zone.id, poly);
      });

      // Zone centroid markers for zones without polygons
      zones.forEach(zone => {
        if (zone.polygon && zone.polygon.length >= 3) return;
        const score = getRiskForZone(zone.id);
        const color = getRiskColor(score);
        const marker = L.circleMarker([zone.lat, zone.lng], {
          radius: 12,
          fillColor: color,
          fillOpacity: 0.5,
          color: color,
          weight: 2,
        });
        marker.on('click', () => onZoneClick?.(zone.id));
        marker.addTo(map);
      });

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        polygonsRef.current.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update selected zone highlight
  useEffect(() => {
    if (!mapRef.current) return;
    polygonsRef.current.forEach((poly, zoneId) => {
      const score = getRiskForZone(zoneId);
      const color = getRiskColor(score);
      poly.setStyle({
        color: zoneId === selectedZoneId ? '#00d9ff' : color,
        weight: zoneId === selectedZoneId ? 2.5 : 1.5,
        fillOpacity: zoneId === selectedZoneId ? 0.55 : 0.35,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZoneId]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full rounded-lg overflow-hidden"
    />
  );
}
