
"use client"

import * as React from "react"
import { useMap } from "@vis.gl/react-google-maps"

interface PolygonProps {
  paths: google.maps.LatLngLiteral[];
  options?: google.maps.PolygonOptions;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
}

export function Polygon({ paths, options, onMouseEnter, onMouseLeave, onClick }: PolygonProps) {
  const map = useMap()
  const polygonRef = React.useRef<google.maps.Polygon | null>(null)

  React.useEffect(() => {
    if (!map) return

    polygonRef.current = new google.maps.Polygon({
      paths,
      ...options,
      map
    })

    const mouseEnterListener = polygonRef.current.addListener("mouseover", () => {
      onMouseEnter?.()
    })

    const mouseLeaveListener = polygonRef.current.addListener("mouseout", () => {
      onMouseLeave?.()
    })

    const clickListener = polygonRef.current.addListener("click", () => {
      onClick?.()
    })

    return () => {
      mouseEnterListener.remove()
      mouseLeaveListener.remove()
      clickListener.remove()
      polygonRef.current?.setMap(null)
    }
  }, [map, paths, options, onMouseEnter, onMouseLeave, onClick])

  return null
}
