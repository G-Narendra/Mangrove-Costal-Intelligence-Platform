
"use client"

import * as React from "react"
import { collection, query, limit, orderBy, DocumentData, getDocs } from "firebase/firestore"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { parsePolygonString } from "@/lib/geometry"
import { Polygon } from "./google-maps-polygon"

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
  const firestore = useFirestore();
  const patchId = patch.id;
  
  const tsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, "Patches", patchId, "TimeSeries"),
      orderBy("__name__", "desc"),
      limit(12) 
    );
  }, [firestore, patchId]);

  const { data: tsDocs } = useCollection(tsQuery);
  
  const [connCount, setConnCount] = React.useState(0);
  React.useEffect(() => {
    if (!firestore) return;
    getDocs(collection(firestore, "Patches", patchId, "Connections")).then(snap => {
      setConnCount(snap.size);
    });
  }, [firestore, patchId]);
  
  // Use top-level TimeSeries fields instead of embedded pixel map
  const metrics = React.useMemo(() => {
    if (!tsDocs || tsDocs.length === 0) return { carbon: 0, absorption: 0, healthScore: 0, history: [] };
    const latest = tsDocs[0];
    
    // Use top-level fields from TimeSeries document
    const totalAbsorption = latest.total_absorption_tCO2e_ha || 0;
    const healthScore = latest.health_score || 0;
    
    const history = tsDocs.map(doc => ({
      date: doc.id,
      absorption: doc.total_absorption_tCO2e_ha || 0,
      health: doc.health_score || 0
    })).reverse();

    return {
      carbon: totalAbsorption,
      absorption: totalAbsorption,
      healthScore,
      history
    };
  }, [tsDocs]);

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
