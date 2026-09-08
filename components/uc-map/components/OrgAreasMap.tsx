'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer } from './MapContainer'
import { TileLayer } from './TileLayer'
import { VectorLayer } from './VectorLayer'
import { useVectorSource } from '../hooks/useVectorSource'
import { useMap } from '../hooks/useMap'
import { Feature } from 'ol'
import { Polygon, MultiPolygon } from 'ol/geom'
import { Style, Stroke, Fill } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { extend, createEmpty, isEmpty } from 'ol/extent'

/**
 * Area data with boundary information
 * Compatible with OrganizationArea from @playze/shared-auth
 */
export interface AreaWithBoundary {
  area_id: string
  name: string
  boundary: unknown // GeoJSON Polygon or MultiPolygon
}

export interface OrgAreasMapProps {
  /** Array of areas with boundary data to display on the map */
  areas: AreaWithBoundary[]
  /** Optional CSS classes for the container */
  className?: string
  /** Height of the map container (default: '384px') */
  height?: string
  /** Message to show when no areas have boundaries */
  emptyMessage?: string
}

/**
 * BoundariesOverlay Component
 * Renders multiple GeoJSON boundaries on a single map
 * MUST be rendered inside MapContainer to access map context
 */
function BoundariesOverlay({ areas }: { areas: AreaWithBoundary[] }) {
  const { source, clearFeatures } = useVectorSource()
  const map = useMap()

  useEffect(() => {
    if (!map || !areas || areas.length === 0) return

    clearFeatures()

    const features: Feature[] = []
    const combinedExtent = createEmpty()

    // Create features for each area boundary
    areas.forEach((area) => {
      if (!area.boundary) return

      const boundary = area.boundary as {
        type: 'Polygon' | 'MultiPolygon'
        coordinates: number[][][] | number[][][][]
      }

      let geometry: Polygon | MultiPolygon

      if (boundary.type === 'Polygon') {
        // Convert GeoJSON coordinates [lng, lat] to map projection
        const rings = (boundary.coordinates as number[][][]).map((ring) =>
          ring.map(([lng, lat]) => fromLonLat([lng, lat]))
        )
        geometry = new Polygon(rings)
      } else {
        // MultiPolygon
        const polygons = (boundary.coordinates as number[][][][]).map((polygon) =>
          polygon.map((ring) =>
            ring.map(([lng, lat]) => fromLonLat([lng, lat]))
          )
        )
        geometry = new MultiPolygon(polygons)
      }

      // Create feature with boundary geometry
      const feature = new Feature({
        geometry,
        name: area.name,
        areaId: area.area_id,
      })

      // Apply styling (alternate colors for visual distinction)
      const colors = [
        { stroke: '#22c55e', fill: 'rgba(34, 197, 94, 0.15)' },    // green-500
        { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.15)' },   // blue-500
        { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.15)' },   // amber-500
        { stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.15)' },   // pink-500
        { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.15)' },   // violet-500
      ]

      const colorIndex = features.length % colors.length
      const color = colors[colorIndex]

      const boundaryStyle = new Style({
        stroke: new Stroke({
          color: color.stroke,
          width: 2,
        }),
        fill: new Fill({
          color: color.fill,
        }),
      })
      feature.setStyle(boundaryStyle)

      features.push(feature)

      // Add this geometry's extent to the combined extent
      extend(combinedExtent, geometry.getExtent())
    })

    // Add all features to the source
    features.forEach(feature => source.addFeature(feature))

    // Fit map to show all boundaries
    const timeoutId = setTimeout(() => {
      if (!map) return

      const mapSize = map.getSize()
      if (!mapSize || mapSize[0] === 0 || mapSize[1] === 0) {
        return
      }

      // Fit map view to combined extent with padding (only if extent has valid coordinates)
      if (!isEmpty(combinedExtent)) {
        map.getView().fit(combinedExtent, {
          padding: [50, 50, 50, 50],
          duration: 500,
        })
      }
    }, 100)

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId)
      clearFeatures()
    }
  }, [areas, source, clearFeatures, map])

  return <VectorLayer source={source} zIndex={10} />
}

/**
 * OrgAreasMap Component
 *
 * Displays multiple geographic area boundaries on a single OpenLayers map.
 * Used to visualize all areas assigned to an organization.
 * Each boundary is rendered with a different color for visual distinction.
 *
 * @example
 * ```tsx
 * import { useOrgAreas } from '@playze/shared-auth'
 * import { OrgAreasMap } from '@playze/shared-uc-map'
 *
 * function AreasView() {
 *   const { data: areas } = useOrgAreas(orgId)
 *   return <OrgAreasMap areas={areas || []} />
 * }
 * ```
 */
export function OrgAreasMap({
  areas,
  className,
  height = '384px',
  emptyMessage = 'No area boundaries to display',
}: OrgAreasMapProps) {
  // Filter areas that have valid boundaries (must have type and coordinates)
  const areasWithBoundaries = areas.filter(area => {
    if (!area.boundary) return false
    const boundary = area.boundary as { type?: string; coordinates?: unknown }
    return boundary.type && boundary.coordinates
  })

  // Memoize center to prevent creating new array reference on every render
  // This prevents infinite loop with MapContainer's center useEffect
  const mapCenter = useMemo(() => fromLonLat([10, 60]) as [number, number], [])

  if (areasWithBoundaries.length === 0) {
    return (
      <div
        className="w-full rounded-lg border border-dashed flex items-center justify-center bg-muted/10"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <MapContainer
      className={className}
      style={{ height, width: '100%', borderRadius: '0.5rem' }}
      center={mapCenter} // Stable reference prevents infinite re-renders
      zoom={5} // Will be adjusted by fit()
      projection="EPSG:3857"
    >
      {/* Base map layer */}
      <TileLayer source="osm" />

      {/* All boundaries overlay */}
      <BoundariesOverlay areas={areasWithBoundaries} />
    </MapContainer>
  )
}
