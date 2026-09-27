
"use client"

import * as React from "react"
import { Polyline } from "./google-maps-polyline"
import { Point } from "@/lib/geometry"
import coastalEdgesRaw from "@/data/coastal_graph_edges.json"

interface ConnectionLayerProps {
  patchId?: string;
  sourceCentroid?: Point | null;
  centroids: Record<string, Point>;
  onHover: (data: any | null) => void;
  onClick: (data: any) => void;
  showTidal: boolean;
  showSediment: boolean;
}

export function ConnectionLayer({ centroids, onHover, onClick, showTidal, showSediment }: ConnectionLayerProps) {
  if (!centroids || Object.keys(centroids).length === 0) return null;

  return (
    <>
      {coastalEdgesRaw.map((edge, idx) => {
        const srcCentroid = centroids[edge.source];
        const destCentroid = centroids[edge.destination];
        
        if (!srcCentroid || !destCentroid) return null;

        const isTidal = edge.edge_type === 'tidal';
        const isSediment = edge.edge_type === 'sediment' || edge.edge_type === 'sedimental';
        
        if (isTidal && !showTidal) return null;
        if (isSediment && !showSediment) return null;

        const strokeColor = isTidal ? "#00f2ff" : "#ffd700";
        
        const getEdgeData = () => ({
          type: 'edge',
          edgeType: edge.edge_type,
          source: edge.source,
          destination: edge.destination,
          distance: `${edge.distance_km} km`
        });

        return (
          <Polyline
            key={`edge-${edge.source}-${edge.destination}-${idx}`}
            path={[srcCentroid, destCentroid]}
            onMouseEnter={() => onHover(getEdgeData())}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(getEdgeData())}
            options={{
              strokeColor: strokeColor,
              strokeOpacity: 0.85,
              strokeWeight: 2.5,
              zIndex: 5
            }}
          />
        );
      })}
    </>
  );
}
