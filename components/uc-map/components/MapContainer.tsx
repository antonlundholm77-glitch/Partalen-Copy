/**
 * MapContainer - Main map component using OpenLayers
 *
 * Basic usage:
 * <MapContainer projection="EPSG:3006" center={[680000, 7310000]} zoom={10}>
 *   <TileLayer source="osm" />
 * </MapContainer>
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import { registerProjections } from '../lib/projections/registerProjections';
import type { Projection } from '../types/projections';

// Register projections on module load
if (typeof window !== 'undefined') {
  registerProjections();
}

export interface MapContainerProps {
  /** Map projection (EPSG code) */
  projection?: Projection;
  /** Initial center coordinates [x, y] in the map's projection */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
  /** Min zoom level */
  minZoom?: number;
  /** Max zoom level */
  maxZoom?: number;
  /** Map container style */
  style?: React.CSSProperties;
  /** CSS class name */
  className?: string;
  /** Child components (layers, controls, etc.) */
  children?: React.ReactNode;
}

// Context for sharing map instance with child components
export const MapContext = React.createContext<Map | null>(null);

export function MapContainer({
  projection = 'EPSG:3857',
  center = [0, 0],
  zoom = 2,
  minZoom = 0,
  maxZoom = 28,
  style,
  className = '',
  children,
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Create OpenLayers map
    const mapInstance = new Map({
      target: mapRef.current,
      view: new View({
        projection,
        center,
        zoom,
        minZoom,
        maxZoom,
      }),
    });

    setMap(mapInstance);

    // Cleanup
    return () => {
      mapInstance.setTarget(undefined);
      mapInstance.dispose();
    };
  }, []);

  // Update view when props change
  useEffect(() => {
    if (!map) return;
    const view = map.getView();
    view.setCenter(center);
  }, [map, center]);

  useEffect(() => {
    if (!map) return;
    const view = map.getView();
    view.setZoom(zoom);
  }, [map, zoom]);

  const defaultStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
    ...style,
  };

  return (
    <MapContext.Provider value={map}>
      <div
        ref={mapRef}
        className={`playze-map-container ${className}`}
        style={defaultStyle}
      />
      {children}
    </MapContext.Provider>
  );
}
