
"use client"

import * as React from "react"
import { DocumentData } from "firebase/firestore"
import { parsePolygonString } from "@/lib/geometry"
import { Polygon } from "./google-maps-polygon"

import patchMapAuditRaw from "@/data/patch_map_audit.json"
import coastalEdgesRaw from "@/data/coastal_graph_edges.json"

const patchMapAudit: Record<string, any> = patchMapAuditRaw

// Pre-calculate connectivity graph degrees in memory for zero-latency retrieval
const connectionCounts: Record<string, number> = {}
coastalEdgesRaw.forEach(e => {
  connectionCounts[e.source] = (connectionCounts[e.source] || 0) + 1
  connectionCounts[e.destination] = (connectionCounts[e.destination] || 0) + 1
})

interface PatchVisualizationProps {
  patch: DocumentData;
  onHover: (data: any | null) => void;
  onClick: (data: any) => void;
}

export function PatchVisualization({ 
  patch,
  onHover,
  onClick
}: PatchVisualizationProps) {
  const patchId = patch.id;
  const digits = String(patchId).replace(/[^0-9]/g, "");
  const normalizedKey = digits ? `Patch_${digits}` : String(patchId);
  const auditData = patchMapAudit[patchId] || patchMapAudit[normalizedKey] || patchMapAudit[`Patch_${patchId}`];
  const connCount = connectionCounts[normalizedKey] || connectionCounts[patchId] || 0;
  
  // High-performance authentic per-hectare absorption rates and smooth 12-month trend
  const metrics = React.useMemo(() => {
    if (auditData && Array.isArray(auditData.history_12m) && auditData.history_12m.length > 0) {
      const hist = auditData.history_12m;
      const last = hist[hist.length - 1];
      return {
        carbon: auditData.current_absorption_per_ha ?? last.absorption,
        absorption: auditData.current_absorption_per_ha ?? last.absorption,
        healthScore: auditData.current_health_score ?? last.health ?? 48.8,
        history: hist
      };
    }

    return { 
      carbon: patch.total_absorption_tCO2e_ha ?? 1.87, 
      absorption: patch.total_absorption_tCO2e_ha ?? 1.87, 
      healthScore: patch.healthScore ?? 48.8, 
      history: []
    };
  }, [auditData, patch]);

  const paths = React.useMemo(() => {
    return parsePolygonString(patch.polygon_coordinates);
  }, [patch.polygon_coordinates]);

  const getPatchData = () => ({ 
    type: 'patch',
    id: patch.id,
    name: patch.id, 
    absorption: metrics.absorption, 
    carbon: metrics.carbon,
    healthScore: metrics.healthScore,
    connectionCount: connCount,
    history: metrics.history
  });

  const fillColor = React.useMemo(() => {
    const intensity = Math.min(metrics.carbon / 30, 1); 
    const r = Math.floor(180 + intensity * 75);
    return `rgba(${r}, 0, 0, 0.5)`; 
  }, [metrics.carbon]);

  const strokeColor = React.useMemo(() => {
    return `rgba(80, 0, 0, 0.9)`;
  }, []);

  if (paths.length < 3) return null;

  return (
    <Polygon
      paths={paths}
      options={{
        fillColor: fillColor,
        fillOpacity: 1,
        strokeColor: strokeColor,
        strokeWeight: 3,
        clickable: true,
        zIndex: 10
      }}
      onMouseEnter={() => onHover(getPatchData())}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(getPatchData())}
    />
  );
}
