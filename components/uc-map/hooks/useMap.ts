/**
 * useMap hook - Access the OpenLayers map instance from child components
 *
 * Usage:
 * function MyComponent() {
 *   const map = useMap();
 *   // Use map instance...
 * }
 */

'use client';

import { useContext } from 'react';
import { MapContext } from '../components/MapContainer';
import type Map from 'ol/Map';

export function useMap(): Map | null {
  const map = useContext(MapContext);

  if (!map) {
    console.warn('[shared-uc-map] useMap: No map found in context. Make sure this component is a child of MapContainer.');
  }

  return map;
}
