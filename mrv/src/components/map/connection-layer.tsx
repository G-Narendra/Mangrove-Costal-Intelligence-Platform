
"use client"

import * as React from "react"
import { collection } from "firebase/firestore"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { Polyline } from "./google-maps-polyline"
import { Point } from "@/lib/geometry"

interface ConnectionLayerProps {
  patchId: string;
  sourceCentroid: Point | null;
  centroids: Record<string, Point>;
  onHover: (data: any | null) => void;
  onClick: (data: any) => void;
  showTidal: boolean;
  showSediment: boolean;
}

export function ConnectionLayer({ patchId, sourceCentroid, centroids, onHover, onClick, showTidal, showSediment }: ConnectionLayerProps) {
  const firestore = useFirestore()

  const connectionsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, "Patches", patchId, "Connections")
  }, [firestore, patchId])

  const { data: connections } = useCollection(connectionsQuery)

  if (!sourceCentroid || !connections || connections.length === 0) return null

  return (
    <>
      {connections.map((conn: any) => {
        const destIdStr = `Patch_${conn.destination_id}`;
        const destCentroid = centroids[destIdStr];
        
        if (!destCentroid) return null

        const edgeType = (conn.edge_type || '').toLowerCase();
        const isTidal = edgeType === 'tidal' || edgeType === 'tidal connectivity';
        const isSediment = edgeType === 'sediment' || edgeType === 'sedimental';
        
        if (isTidal && !showTidal) return null;
        if (isSediment && !showSediment) return null;

        const isDirected = conn.metadata?.is_directed === true;

        const strokeColor = isTidal ? "#00f2ff" : (isSediment ? "#ffd700" : "#ffffff");
        
        const getEdgeData = () => ({
          type: 'edge',
          edgeType: conn.edge_type,
          source: patchId,
          destination: destIdStr,
          distance: conn.distance_km || 'Unknown'
        });

        return (
          <Polyline
            key={`${patchId}-${destIdStr}`}
            path={[sourceCentroid, destCentroid]}
            onMouseEnter={() => onHover(getEdgeData())}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(getEdgeData())}
            options={{
              strokeColor: strokeColor,
              strokeOpacity: 0.9,
              strokeWeight: 3,
              zIndex: 5,
              icons: isDirected ? [{
                icon: { 
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 3,
                  strokeWeight: 1,
                  fillOpacity: 1,
                  fillColor: strokeColor
                },
                offset: '50%'
              }] : []
            }}
          />
        )
      })}
    </>
  )
}
