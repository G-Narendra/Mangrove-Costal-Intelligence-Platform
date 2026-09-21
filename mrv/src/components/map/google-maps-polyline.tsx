
"use client"

import * as React from "react"
import { useMap } from "@vis.gl/react-google-maps"

interface PolylineProps {
  path: google.maps.LatLngLiteral[];
  options?: google.maps.PolylineOptions;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
}

export function Polyline({ path, options, onMouseEnter, onMouseLeave, onClick }: PolylineProps) {
  const map = useMap()
  const polylineRef = React.useRef<google.maps.Polyline | null>(null)

  React.useEffect(() => {
    if (!map) return

    polylineRef.current = new google.maps.Polyline({
      path,
      ...options,
      map
    })

    const mouseEnterListener = polylineRef.current.addListener("mouseover", () => {
      onMouseEnter?.()
    })

    const mouseLeaveListener = polylineRef.current.addListener("mouseout", () => {
      onMouseLeave?.()
    })

    const clickListener = polylineRef.current.addListener("click", () => {
      onClick?.()
    })

    return () => {
      mouseEnterListener.remove()
      mouseLeaveListener.remove()
      clickListener.remove()
      polylineRef.current?.setMap(null)
    }
  }, [map, path, options, onMouseEnter, onMouseLeave, onClick])

  return null
}
